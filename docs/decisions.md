# Decisions

Notes on things that come up in review often enough to be worth writing down.

## Webhooks always return 2xx

`POST /api/webhooks/mock-whatsapp` returns 200 even when we can't match the payload to a brand,
customer or wave.

Providers treat anything that isn't a 2xx as a transient failure and retry with backoff, sometimes
for hours. An unrecognised brand slug isn't transient. Retrying it will never work, so all we'd get
is the same dead payload hitting the endpoint over and over. We log it with enough context to
investigate and acknowledge the delivery.

Please don't change this to return 4xx/5xx for unmatched payloads.

## `db push` rather than migrations

Small app, disposable database. Migrations are correct for anything long lived but here they're
just ceremony. `npm run db:reset` rebuilds in a few seconds if the data gets messy.

## Buckets are derived, not stored

We store the raw 0-10 score and work out promoter/passive/detractor at read time instead of keeping
a bucket column. Those boundaries are a business definition and they've moved before. Deriving them
means a definition change doesn't need a backfill.

## Services sit between routes and Prisma

Route handlers, pages and server actions call something in `src/services/`. They don't touch Prisma
directly. Services own the queries and the rules, callers own HTTP and rendering.

## Flagging for follow-up stores a timestamp, not a boolean

`Response.flaggedAt` is a nullable timestamp; null means not flagged. A boolean would have done the
job the feature asks for, but a nullable timestamp costs the same and also answers "when", which is
the first question anyone asks about a follow-up queue. It matches the nullable columns already here
(`verbatim`, `eventId`) and needed no backfill of existing rows.

There is no record of *who* flagged something. The app has no user or auth model, and inventing one
would have been a larger change than the feature itself. If accounts arrive, `flaggedAt` becomes
`flaggedBy` plus a timestamp without the read paths changing.

## The flag filter lives in the URL

`?flagged=1` sits alongside `wave`, `bucket`, `q`, `sort` and `page`. The page reads it from
`searchParams` like every other filter, so it survives a refresh, can be linked to, and composes with
the existing controls without any new state mechanism. Sort links carry it too, so changing the sort
does not silently drop the filter.

Sort direction follows the same rule: `?dir=asc|desc`, defaulting to `desc` so existing links and
bookmarks behave exactly as before. Clicking the column already sorted flips its direction; clicking
the other column starts it at descending, which is what a reader scanning worst-first expects. In the
raw-SQL path the direction is composed as a SQL fragment rather than a bound parameter, because a
sort direction is syntax rather than a value — it is safe only because `dir` is a validated union and
never raw user text.

## Writes clear the search cache

`src/lib/cache.ts` memoises search result pages for 60 seconds. Flagging a row changes what those
pages should contain, so `ResponseService.setFlag()` calls `clearCached()` after a successful write.
Clearing everything is blunt for a cache this small; if it grows, invalidate by wave instead.
