# Debug log

### D1: wave date windows were built in local time, clipping the end of every wave

**Symptom:** `/brands` showed Acme's "Flash Feb 2026" as having no feedback — `—` for NPS, 0
responses — for a wave holding 300 responses (PULSE-106). Longer waves were quietly short too:
Northwind Q1 2026 reported 390 where the database had 391.

**How I found it:** Queried the database for per-wave counts alongside each wave's date range and its
earliest and latest `respondedAt`. The only wave rendering zero was also the only single-day wave,
and its 300 responses were all timestamped 19:00–22:58 UTC. That pointed at the conversion from
calendar dates to an instant range rather than at the queries themselves.

**Root cause:** `waveWindow()` widened a wave's calendar dates using `setHours()`, which works in the
server's local zone (+05:30 here). Both values it is compared against are UTC — Prisma returns a
`@db.Date` column as midnight UTC, and the seed writes UTC instants — so the window slid 5.5 hours
earlier and ended at `18:29:59.999Z` instead of `23:59:59.999Z`. A single-day wave lost every row; a
multi-month wave lost only the tail of its last day, which is why nobody filed a ticket for that.

**Fix:** `setUTCHours()` for both boundaries, so the window is built on the same clock as the data it
filters.

**How I verified it:** Flash Feb 2026 went from 0 to 179 responses with a real score; Northwind Q1
2026 went from 390 to 391 — exactly its commented-response count, so the recovered row is the one
stamped `2026-03-31 23:05`, inside the clipped band. I predicted both numbers before reloading.
`npm run type-check` passes.

**Blast radius:** `waveWindow()` is the only dateâ†’instant conversion in the codebase and feeds both
`loadWaveFeedback()` and both branches of `listFeedback()`, so the summary, table, counts and search
were corrected together. Grepped `setHours`/`getHours`/`getTimezoneOffset` — nothing else. Left
alone deliberately: `format.ts` renders dates in the viewer's zone (presentation, not this bug), and
`ResponseService.record()` stamps `respondedAt: new Date()` regardless of the wave named in the
event — noted to revisit.

### D2: the headline NPS was calculated from commented responses only

**Symptom:** The dashboard score didn't match a manual count — "close, but not the same"
(PULSE-101). Northwind Q1 2026 displayed `0` where the real score is `6`, and its response count
read 391 against 610 in the database.

**How I found it:** The displayed counts (179 of 300, 391 of 610) were exactly each wave's number of
responses *carrying a comment*, so the headline was clearly reading a subset. Confirmed in SQL by
computing NPS twice for the same wave, once over all responses and once over commented ones only:
6.066 versus 0.000 for Northwind, which matches what the screen showed.

**Root cause:** `ResponseService.getSummary()` was built on `loadWaveFeedback()`, the loader written
for the comments table. That loader filters `verbatim: { not: null }`, which is right for a list of
comments and wrong for a score: roughly a third of responses are score-only, and discarding them
changes both the numerator and the denominator of `%promoters âˆ’ %detractors`.

**Fix:** `getSummary()` now queries the wave's responses directly, selecting only `score` and
applying no verbatim filter. The comments table keeps its filter, because a comments table should
show comments.

**How I verified it:** Northwind Q1 2026 moved from `0` to `6`, matching the 6.066 computed in SQL,
and its count from 391 to 610. Acme Flash Feb 2026 moved from 179 to 300 responses. Both figures
were predicted from the database before reloading the page.

**Blast radius:** `getSummary()` is used by the brand dashboard and by `BrandService.listWithStats()`
for the brand list, so both were wrong in the same way and both are fixed. Removing this caller left
`loadWaveFeedback()` unreachable, so it is deleted — it also wrapped its query in a
`catch { return [] }`, which would have turned any database error into a silent "no feedback yet"
rather than a failure anyone could see. Deleting it removes that trap with it.

### D3: NPS was truncated instead of rounded

**Symptom:** Same ticket (PULSE-101) — the score sat up to a point away from a hand calculation,
always toward zero.

**How I found it:** After D2 the arithmetic still disagreed with SQL: Acme Flash Feb 2026 computes to
âˆ’48.667 but displayed âˆ’48. Read `summarise()` to see how the float became an integer.

**Root cause:** `summarise()` produced the integer with `parseInt(String(promoterShare -
detractorShare), 10)`. `parseInt` reads leading digits off a string and discards the rest, so it
truncates toward zero rather than rounding: `-48.667` became `-48`, and `12.7` would become `12`.
The error is always under one point, which is exactly why the report said "close, but not the same".

**Fix:** `Math.round(promoterShare - detractorShare)`, which is what turning a percentage difference
into a whole-number score means.

**How I verified it:** Acme Flash Feb 2026 now shows `-49`, matching `ROUND(-48.667)` from SQL.
Northwind stays `6` (6.066 rounds and truncates alike) — a control confirming the change moves only
values that should move.

**Blast radius:** Grepped for other numeric conversions. `percentage()` in the same file already used
`Math.round`, and `Pagination` uses `Math.ceil` correctly for a page count. The only other `parseInt`
parses the page number from the URL, which is appropriate for an integer string.

### D4: the feedback table paged with an unstable sort, repeating some rows and hiding others

**Symptom:** A row seen on page 1 appeared again on page 2 (PULSE-102).

**How I found it:** Ran the app's own page-1 and page-2 queries in SQL and intersected the ids — two
rows were in both. Then walked all twelve pages of the wave: 179 rows fetched but only **169
distinct**, so ten rows were shown twice and ten were never shown at all. The duplicate was the
visible half of the problem; the silently missing rows were the worse half.

**Root cause:** The table ordered by `score DESC` alone. The wave holds 179 rows across only 11
distinct scores, so almost every row ties with many others. SQL guarantees no particular order among
rows that tie, and each page is a separate query that sorts independently before applying
`LIMIT`/`OFFSET`. Tied rows can therefore be arranged differently for page 1 than for page 2, and
slicing two different arrangements at offsets 0 and 15 both repeats and skips rows.

**Fix:** Appended a unique tiebreaker — `id` — to the ordering in both query paths, so the sort is
total rather than partial and every page slices the same sequence.

**How I verified it:** Repeated the twelve-page walk: 179 rows seen, 179 distinct. In the running app
pages 1 and 2 now share no rows. The same walk without the tiebreaker still returns 169 distinct, so
the difference is the fix rather than luck.

**Blast radius:** Both branches of `listFeedback()` had the same defect — the Prisma query and the
raw-SQL search query — and both are fixed. The date ordering got the tiebreaker too: `respondedAt`
can tie (it is written to millisecond precision, and inbound webhook rows are stamped with the
current time), so it was vulnerable to the same instability even though nobody had reported it.

**Related, not fixed:** `OFFSET` paging is still vulnerable to rows being inserted or deleted between
page loads — a row arriving while a reviewer pages through will shift everything after it. Keyset
pagination would remove that class of problem, but it changes the URL contract and is beyond this
ticket. Recorded here as a known limitation rather than silently left.

### D5: the bucket filter navigated with the previously selected value

**Symptom:** Choosing "Detractors" left the table showing everyone; clicking it a second time worked;
choosing a different bucket was wrong again (PULSE-103).

**How I found it:** Reproduced it in a browser and watched the URL rather than the table. From a
clean `/brands/acme`, one click on Detractors produced `?bucket=all`; a second click produced
`?bucket=detractors`. The filtering itself was fine — the component was asking for the wrong bucket.
That turned it from a query problem into a state problem in one step.

**Root cause:** `BucketFilter` mirrored the current bucket in `useState` and, on click, called
`setBucket(next)` and then built the URL from `bucket` — the state variable, not the argument.
`setBucket` schedules a re-render; it does not change the `bucket` binding inside the click handler
that is already running. So each navigation carried the value selected *before* this click, always
one selection behind. The second click "worked" only because by then the stale value happened to be
the one just chosen.

**Fix:** Removed the `useState` mirror entirely and navigate with `next`, highlighting the active
button from the `current` prop. The URL is already this app's state store — the server component
parses `searchParams` and passes the result down — so a local copy was a second source of truth with
nothing to keep it honest.

**How I verified it:** In the browser from a clean URL: one click on Detractors now gives
`?bucket=detractors` and all 15 rows score â‰¤ 6. Switching straight to Promoters gives
`?bucket=promoters`, all rows â‰¥ 9, and the correct button highlighted — the third reported symptom.

**Blast radius:** Checked every other client component for the same pattern. `Pagination` and
`WaveSelect` hold no local state and use their arguments directly. `SearchBox` does keep `useState`,
but that is a controlled text input where local state is the right thing, and it reads `value` — the
current value — when it navigates, not a stale copy. `FeedbackTable` builds plain links. So the
defect was confined to this one component, but the pattern that caused it — mirroring URL state in
`useState` — is worth avoiding everywhere.

### D6: the webhook answered before it had written anything

**Symptom:** The test script reported storing none of what it sent, yet the rows appeared a moment
later (PULSE-105, first complaint).

**How I found it:** Ran `npm run send:responses`. It printed `200 {"ok":true,"received":5}` and then
`+0ms stored 0 of 5`, `+300ms stored 0 of 5`, `+1500ms stored 5 of 5`. Nothing was lost — the writes
simply had not happened yet when the response came back, which points at the handler rather than the
database.

**Root cause:** The route processed the batch with
`events.forEach(async (event) => { await ResponseService.record(event); })`. `forEach` calls the
function and throws away whatever it returns. Marking that function `async` makes it return a
promise, so `forEach` starts all the writes and discards every handle to them. The route then falls
straight through to `NextResponse.json(...)`. The `await` inside only suspends the inner function,
not the handler, so the endpoint reports success for work that is still in flight — and if any of it
fails, nothing is there to notice.

**Fix:** Replaced `forEach` with `for (const event of events)`, which awaits each write before the
handler returns. Sequential rather than `Promise.all` was chosen deliberately: the batch is small,
ordering is preserved, and it keeps one webhook delivery from opening a connection per event. If
batches grow, a bounded-concurrency map would be the next step.

**How I verified it:** The same script now reports `+0ms stored 5 of 5` — the count is already
correct on the first sample, so the response no longer outruns the writes.

**Blast radius:** Grepped for `forEach` over async work elsewhere. This was the only occurrence; the
server action and the services all await their writes directly. Worth noting the general shape:
`forEach` with an `async` callback is always suspicious, because the array method has no way to wait.

### D7: duplicate deliveries were de-duplicated by a check that races

**Symptom:** A redelivered batch produced several copies of the same answer (PULSE-105, second
complaint).

**How I found it:** `npm run send:responses -- --duplicate` sends one event id five times. The script
reported `evt_..._dupe stored 5 times`, so the existing duplicate check had let every copy through.

**Root cause:** `ResponseService.record()` asked `findFirst({ where: { eventId } })` and then created
the row if nothing came back. That is check-then-act: the five events were in flight at once, all
five queries ran before any insert committed, so all five saw an empty result and all five inserted.
Nothing in the database prevented it — `eventId` carried no unique constraint, so the only guard was
application code that cannot see uncommitted work in another transaction.

**Fix:** Made the guarantee the database's job. `eventId` is now `@unique` in the schema, and
`record()` attempts the insert and treats Prisma's `P2002` unique-violation as "already recorded",
returning `false` and logging as before. The read-then-write check is gone rather than kept alongside
it — it saved no work and its presence would imply a safety it never provided. Nulls are unaffected:
Postgres allows many nulls in a unique index, and in-app responses legitimately have no event id.

**How I verified it:** `--duplicate` now reports `stored 1 of 5`. More importantly I wrote a script
firing the same event id from **eight concurrent HTTP requests**, since sequential processing inside
one request would hide a race across requests: all eight returned 200 and the database holds exactly
one row for that id. That result depends on the constraint, not on ordering.

**Blast radius:** `record()` is the only writer of `eventId`. The same check-then-act shape does not
appear elsewhere — `addCustomer` already relies on its `@@unique([brandId, phone])` constraint and
catches `P2002`, which is the pattern this fix now matches. Adding the index required the existing
data to satisfy it; the duplicate rows left by my earlier reproduction had to be cleared first, which
`npm run db:reset` did.

### D8: the brand list issued one query per customer

**Symptom:** `/brands` took over a second with only two brands (PULSE-104). On this machine it was
7.8–9.0 seconds.

**How I found it:** Measured rather than guessed. Timed the page over several loads, then counted the
work by reading `xact_commit` from `pg_stat_database` before and after a request: **1,748 queries for
one page load**. With two brands of 1,000 customers each, the size of that number pointed straight at
a per-customer query.

**Root cause:** `BrandService.listWithStats()` looped over each brand, loaded that brand's customers,
then ran `prisma.response.count()` **once per customer** to decide whether that customer had ever
responded. A classic N+1: the number of queries scaled with the number of customers, so the page's
cost was a property of the data rather than of the question being asked. Each brand also issued its
own waves and customers queries inside the same sequential loop.

**Fix:** Fetch each aggregate for all brands in one round and assemble in memory. Waves come from a
single `findMany` grouped by brand id in a `Map`; customer totals and "has ever responded" totals come
from two `groupBy` queries, the second using `responses: { some: {} }` so the database performs one
`EXISTS` test per customer internally instead of a thousand separate counts. The per-brand work then
runs concurrently rather than in sequence.

**How I verified it:** Same measurement method as the diagnosis. One page load fell from 1,748
queries to **5.6** (averaged over five loads, because a single load gave a misleading zero once), and
warm response time from 7.8–9.0 s to **173–192 ms**. The rendered figures are unchanged — Acme `-49`
/ 300 / 959-of-1000, Northwind `6` / 610 / 933-of-1000 — so this is the same answer computed
differently, which is the part that matters.

**Blast radius:** Checked the other services for queries inside loops. `ResponseService` and
`WaveService` issue a fixed number of queries regardless of data size, and the brand dashboard does
not loop. This was the only N+1. The page is now `4 + brands` queries instead of
`2 + brands × (3 + customers)`: at 200 brands of 1,000 customers that is roughly 204 rather than
roughly 200,000. The remaining per-brand query is `getSummary()` for the latest wave. Folding those
into one grouped query is possible but would mean computing NPS in SQL and duplicating the bucket
boundaries that `docs/decisions.md` deliberately keeps in one place, so I left it and note it here as
the next step if brand counts ever grow that far.

### D9: the comment search was open to SQL injection (no ticket — PULSE-107)

**Symptom:** None reported, which is what makes it the unticketed one. The search box works, so
nothing looks wrong. The damage is only visible if someone types something other than a search term.

**How I found it:** Not from a symptom — from reading the two code paths in `listFeedback()`. The
search branch builds its query as a template string and hands it to `$queryRawUnsafe`, with the
user's `q` parameter concatenated straight into an `ILIKE`. Probed it from the URL to check the
suspicion was real rather than theoretical: searching for `o'brien` returned **500**, because the
apostrophe closed the string literal and left the database parsing broken SQL. Searching
`zzz_no_such_text_zzz%' OR '1'='1' --` returned **3,907 rows** where the same term without the suffix
returned 0. 3,907 is every response in the database — both brands, all seven waves.

**Root cause:** `$queryRawUnsafe` sends the string it is given, so anything interpolated becomes part
of the statement rather than a value in it. Once the input can close a quote, the rest of the `WHERE`
clause is under the caller's control: `--` comments out the trailing fragment and the wave, brand and
date conditions stop applying. The database has no way to tell data from code once they arrive in the
same string — that separation has to happen before the query is sent.

**Fix:** Rebuilt both queries with `Prisma.sql` tagged templates and `$queryRaw`, so values travel as
bound parameters and are never parsed as SQL. `scoreSql()` now returns `Prisma.Sql` fragments
(`Prisma.empty` for "all") rather than strings, so composition stays type-safe. `ORDER BY` cannot be
a bound parameter because a column name is an identifier, not a value — it is built from the `sort`
union type, which the page validates before it reaches the service, so no user text is involved.

**How I verified it:** Ordinary search still works — "delivery" returns 8 rows. `o'brien` now returns
200 with 0 matches instead of a 500: the apostrophe is treated as text, which is what a user typing an
Irish surname would expect. Both injection payloads return 0 rows, matching nothing because they are
now searched for literally. And the bucket fragment still composes correctly: for the term "the",
detractors 52 + promoters 10 + passives 19 = 81 = all, so the parts still partition the whole.

**Blast radius:** Grepped for raw SQL across the repo — this was the only place, and both statements
in it are fixed. Everything else goes through the Prisma query API, which parameterises by
construction. The server action validates with Zod and uses `prisma.customer.create`. Two related
notes: user-supplied `%` and `_` are still ILIKE wildcards, which is a search-behaviour quirk rather
than a security issue and I left it alone; and the in-process cache keys on the raw search string,
which was harmless before and remains so now that the string can only ever be a search term.

### D10: responses arriving after a wave closes are stored but never displayed — found, not fixed

**Symptom:** None reported. The webhook accepts a response for a wave, returns `200`, writes the row,
and the dashboard never shows it. No error anywhere; the data is simply absent from the UI.

**How I found it:** Noticed while fixing D1 that `record()` writes `respondedAt: new Date()` no matter
which wave the event names, while every read filters on the wave's date window. Confirmed it with the
rows my own webhook testing had created: Acme's "Q1 2026" wave (1 Jan – 31 Mar 2026) holds **647**
rows, of which **640** fall inside the window and **7** — stamped today, 16 Aug 2026 — fall after it.
The dashboard reports 640. The seven are invisible.

**Root cause:** Two different ideas of what a wave contains. `Response.waveId` says a response belongs
to a wave; the date window says a response belongs to a wave if it arrived between the wave's dates.
Those agree for seeded data and disagree for anything the webhook writes after a wave has closed — a
late reply, a provider retry hours later, or a backfill. Where they disagree, the row is stored and
then filtered out on read.

**Why I have not fixed it:** The correct answer is a product decision, not a code correction, and the
two available fixes both change behaviour that was not reported as wrong.

- *Drop the date-window filter and rely on `waveId`.* This is the fix I would argue for: the foreign
  key is the authoritative link, and the window can only ever hide rows that legitimately belong to
  the wave. But it removes a mechanism from both read paths and makes `waveWindow()` largely
  redundant, which is a visible redesign of something nobody asked me to redesign.
- *Clamp `respondedAt` to the wave's end on write.* Small and leaves reads untouched, but it records a
  time the response did not arrive at. That is patching the symptom and losing real information.

A third option — have the provider supply the response's own timestamp — is the sound long-term answer
and needs a change to the payload contract, which is outside this exercise.

**How it can be reproduced:** `npm run send:responses -- --wave "Q1 2026"` against any wave whose
dates are in the past, then compare `SELECT COUNT(*)` for that wave against the figure on
`/brands/acme`. The counts diverge by the number of events sent.
