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
