/**
 * Fires a batch of inbound provider events at the webhook, then immediately reads
 * back how many landed.
 *
 *   npm run send:responses                     # send 5 events to acme / Q1 2026
 *   npm run send:responses -- --count 10
 *   npm run send:responses -- --duplicate      # send the same event id 5 times over
 *
 * Requires the dev server to be running and the database to be seeded.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const BASE_URL = process.env.PULSE_BASE_URL ?? "http://localhost:3000";
const WEBHOOK_URL = `${BASE_URL}/api/webhooks/mock-whatsapp`;

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

const COMMENTS = [
  "Arrived a day early, no complaints.",
  "Still waiting on my replacement.",
  "Support was polite but couldn't help.",
  "Great value for the price.",
  "The checkout flow logged me out twice.",
];

async function main() {
  const brandSlug = arg("brand") ?? "acme";
  const waveLabel = arg("wave") ?? "Q1 2026";
  const count = Number.parseInt(arg("count") ?? "5", 10);
  const duplicate = hasFlag("duplicate");

  const brand = await prisma.brand.findUnique({ where: { slug: brandSlug } });
  if (!brand) throw new Error(`No brand with slug "${brandSlug}". Seed the database first.`);

  const wave = await prisma.wave.findUnique({
    where: { brandId_label: { brandId: brand.id, label: waveLabel } },
  });
  if (!wave) throw new Error(`No wave "${waveLabel}" for ${brandSlug}.`);

  const customers = await prisma.customer.findMany({
    where: { brandId: brand.id },
    take: count,
    orderBy: { createdAt: "asc" },
  });

  const before = await prisma.response.count({ where: { waveId: wave.id } });

  const runId = Date.now().toString(36);
  const events = Array.from({ length: count }, (_, index) => ({
    brandSlug,
    from: customers[index % customers.length].phone,
    waveLabel,
    score: [10, 3, 8, 9, 5, 0, 7, 6][index % 8],
    text: COMMENTS[index % COMMENTS.length],
    // --duplicate reuses one id so every event in the batch is the "same" delivery.
    eventId: duplicate ? `evt_${runId}_dupe` : `evt_${runId}_${index}`,
  }));

  console.log(`POST ${WEBHOOK_URL}  (${events.length} events${duplicate ? ", duplicated id" : ""})`);

  const response = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(events),
  });

  console.log(`  → ${response.status} ${JSON.stringify(await response.json())}`);

  console.log(`\nResponses in "${waveLabel}" before sending: ${before}`);

  // Sample a few times so a slow write is distinguishable from a lost one.
  for (const delayMs of [0, 300, 1500, 4000]) {
    if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs - lastDelay));
    lastDelay = delayMs;

    const now = await prisma.response.count({ where: { waveId: wave.id } });
    console.log(`  +${String(delayMs).padStart(4)}ms  stored ${now - before} of ${events.length}`);
  }

  const distinct = await prisma.response.groupBy({
    by: ["eventId"],
    where: { waveId: wave.id, eventId: { in: events.map((e) => e.eventId) } },
    _count: { _all: true },
  });

  const duplicated = distinct.filter((row) => row._count._all > 1);
  console.log(`\nDistinct event ids stored: ${distinct.length} of ${new Set(events.map((e) => e.eventId)).size}`);
  if (duplicated.length > 0) {
    for (const row of duplicated) {
      console.log(`  ${row.eventId} stored ${row._count._all} times`);
    }
  }
}

let lastDelay = 0;

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
