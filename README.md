# Pulse

A small dashboard for customer feedback. Brands run survey **waves**; customers reply with a score
from 0 to 10 and an optional comment. The dashboard shows the resulting Net Promoter Score and lets a
reviewer read through the comments.

NPS convention used throughout: **9-10 promoter, 7-8 passive, 0-6 detractor**, and
`NPS = %promoters - %detractors`.

## Requirements

- Node 20 or newer
- Docker, for Postgres. Or point `DATABASE_URL` at your own instance.

## Getting started

```bash
cp .env.example .env
docker compose up -d          # Postgres on localhost:5433
npm install
npm run db:push               # create tables
npm run db:seed               # load demo data
npm run dev                   # http://localhost:3000
```

`npm run db:reset` drops everything and re-seeds if the data gets into a state you don't want.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run type-check` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run db:push` | Apply `prisma/schema.prisma` to the database |
| `npm run db:seed` | Reseed demo data (deterministic) |
| `npm run db:reset` | Drop, recreate, reseed |
| `npm run db:studio` | Prisma Studio |
| `npm run send:responses` | Push mock inbound responses at the webhook (see below) |

To see the SQL Prisma is running:

```bash
PRISMA_LOG=query npm run dev
```

## Layout

```
prisma/
  schema.prisma          Brand → Customer / Wave → Response
  seed.ts                deterministic demo data
scripts/
  send-responses.ts      posts mock provider events at the webhook
docs/
  decisions.md           notes on non-obvious choices
src/
  app/
    brands/              brand list
    brands/[slug]/       brand dashboard (wave picker, score card, comments table)
    api/webhooks/        inbound provider events
  actions/               server actions
  services/              queries and business rules; the only place that touches Prisma
  components/            UI
  lib/                   prisma client, env parsing, NPS maths, cache, helpers
```

Data flows one way: **page or route handler → service → Prisma**. Pages and components never import
Prisma directly.

## The webhook

Real feedback arrives from a WhatsApp provider rather than through the UI. The endpoint accepts a
single event or an array of them:

```
POST /api/webhooks/mock-whatsapp
Content-Type: application/json

{
  "brandSlug": "acme",
  "from": "+919876543210",
  "waveLabel": "Q1 2026",
  "score": 9,
  "text": "Delivery was quick, packaging could be better",
  "eventId": "evt_01HXYZ"
}
```

`scripts/send-responses.ts` is the easiest way to exercise it:

```bash
npm run send:responses                  # 5 events at acme / Q1 2026
npm run send:responses -- --count 20
npm run send:responses -- --duplicate   # same eventId five times
npm run send:responses -- --brand northwind --wave "Q3 2025"
```

It prints how many events it sent and how many rows ended up in the database.

## Seed data

Deterministic. The same command always produces the same dataset.

- **Acme Retail** (`acme`): 1,000 customers, 4 waves
- **Northwind Foods** (`northwind`): 1,000 customers, 3 waves
- ~3,900 responses, roughly a third of them score-only with no comment
