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
