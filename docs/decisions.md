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
