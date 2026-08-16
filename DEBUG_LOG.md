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

**Blast radius:** `waveWindow()` is the only date→instant conversion in the codebase and feeds both
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
changes both the numerator and the denominator of `%promoters − %detractors`.

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
−48.667 but displayed −48. Read `summarise()` to see how the float became an integer.

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
`?bucket=detractors` and all 15 rows score ≤ 6. Switching straight to Promoters gives
`?bucket=promoters`, all rows ≥ 9, and the correct button highlighted — the third reported symptom.

**Blast radius:** Checked every other client component for the same pattern. `Pagination` and
`WaveSelect` hold no local state and use their arguments directly. `SearchBox` does keep `useState`,
but that is a controlled text input where local state is the right thing, and it reads `value` — the
current value — when it navigates, not a stale copy. `FeedbackTable` builds plain links. So the
defect was confined to this one component, but the pattern that caused it — mirroring URL state in
`useState` — is worth avoiding everywhere.
