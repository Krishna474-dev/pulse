import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Deterministic PRNG so every run produces exactly the same dataset.
 * Seeded once; don't reseed between sections.
 */
function mulberry32(seed: number) {
  let a = seed;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20260204);

function randInt(minInclusive: number, maxExclusive: number) {
  return minInclusive + Math.floor(rand() * (maxExclusive - minInclusive));
}

function pickWeighted(weights: number[]): number {
  const total = weights.reduce((sum, w) => sum + w, 0);
  let roll = rand() * total;
  for (let i = 0; i < weights.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return i;
  }
  return weights.length - 1;
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = randInt(0, i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Weights for scores 0..10. */
const DISTRIBUTIONS = {
  strong: [1, 1, 1, 2, 2, 3, 4, 6, 10, 26, 30],
  mixed: [2, 2, 3, 4, 5, 7, 9, 12, 14, 20, 16],
  weak: [6, 6, 7, 8, 9, 11, 12, 10, 9, 8, 7],
  poor: [10, 9, 10, 11, 12, 13, 10, 7, 5, 4, 3],
} as const;

type DistributionName = keyof typeof DISTRIBUTIONS;

const FIRST_NAMES = [
  "Aditi", "Rahul", "Meera", "Karthik", "Sneha", "Arjun", "Priya", "Vikram",
  "Ananya", "Rohit", "Divya", "Nikhil", "Kavya", "Sanjay", "Isha", "Manish",
  "Pooja", "Varun", "Nandini", "Aakash", "Ritu", "Sameer", "Tara", "Yash",
];

const LAST_NAMES = [
  "Sharma", "Iyer", "Nair", "Reddy", "Gupta", "Menon", "Bose", "Kulkarni",
  "Chawla", "Pillai", "Desai", "Rao", "Verma", "Joshi", "Banerjee", "Shetty",
];

const POSITIVE_VERBATIMS = [
  "Delivery was quick and the packaging was spotless.",
  "Support sorted my issue in one call, genuinely impressed.",
  "Been ordering for two years, quality has never dropped.",
  "The app update made checkout much faster.",
  "Prices are fair and the quality justifies them.",
  "Loved the handwritten note in the box.",
  "Refund came through in under a day, no arguments.",
];

const NEUTRAL_VERBATIMS = [
  "Does the job. Nothing to complain about, nothing special either.",
  "Fine overall, though the delivery window could be tighter.",
  "Product is good, the website is a bit slow on mobile.",
  "Reasonable, but I'd like more payment options.",
  "It's okay. I'd probably still compare prices elsewhere.",
];

const NEGATIVE_VERBATIMS = [
  "Didn't get a callback after raising a ticket.",
  "Third order in a row that arrived late.",
  "The item doesn't match the photos on the listing.",
  "Couldn't reach anyone on the helpline for two days.",
  "Charged twice and I'm still waiting on the reversal.",
  "Packaging was damaged and nobody responded to my email.",
  "Returns process is far too complicated.",
];

function verbatimForScore(score: number): string | null {
  // Roughly a third of responses are a bare score with no comment.
  if (rand() < 0.35) return null;
  const pool =
    score >= 9 ? POSITIVE_VERBATIMS : score >= 7 ? NEUTRAL_VERBATIMS : NEGATIVE_VERBATIMS;
  return pool[randInt(0, pool.length)];
}

/** A UTC instant uniformly distributed across [startDay 00:00Z, endDay 23:59:59Z]. */
function randomInstantWithin(startDay: string, endDay: string): Date {
  const from = Date.parse(`${startDay}T00:00:00.000Z`);
  const to = Date.parse(`${endDay}T23:59:59.000Z`);
  return new Date(from + rand() * (to - from));
}

function utcDate(day: string): Date {
  return new Date(`${day}T00:00:00.000Z`);
}

type WaveSpec = {
  label: string;
  startDay: string;
  endDay: string;
  distribution: DistributionName;
  /** Fraction of the brand's customers who responded to this wave. */
  participation: number;
  /** Optional override for when responses land, in UTC hours. */
  hourWindow?: [number, number];
};

type BrandSpec = {
  name: string;
  slug: string;
  customerCount: number;
  waves: WaveSpec[];
};

const BRANDS: BrandSpec[] = [
  {
    name: "Acme Retail",
    slug: "acme",
    customerCount: 1000,
    waves: [
      { label: "Q3 2025", startDay: "2025-07-01", endDay: "2025-09-30", distribution: "mixed", participation: 0.62 },
      { label: "Q4 2025", startDay: "2025-10-01", endDay: "2025-12-31", distribution: "strong", participation: 0.58 },
      { label: "Q1 2026", startDay: "2026-01-01", endDay: "2026-03-31", distribution: "mixed", participation: 0.64 },
      {
        // Single-day pulse check. Responses all land in the evening (UTC).
        label: "Flash Feb 2026",
        startDay: "2026-02-10",
        endDay: "2026-02-10",
        distribution: "weak",
        participation: 0.3,
        hourWindow: [19, 23],
      },
    ],
  },
  {
    name: "Northwind Foods",
    slug: "northwind",
    customerCount: 1000,
    waves: [
      { label: "Q3 2025", startDay: "2025-07-01", endDay: "2025-09-30", distribution: "poor", participation: 0.6 },
      { label: "Q4 2025", startDay: "2025-10-01", endDay: "2025-12-31", distribution: "weak", participation: 0.55 },
      { label: "Q1 2026", startDay: "2026-01-01", endDay: "2026-03-31", distribution: "mixed", participation: 0.61 },
    ],
  },
];

async function main() {
  console.log("Clearing existing data...");
  await prisma.response.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.wave.deleteMany();
  await prisma.brand.deleteMany();

  let phoneCounter = 9000000000;
  let totalResponses = 0;

  for (const spec of BRANDS) {
    const brand = await prisma.brand.create({
      data: { name: spec.name, slug: spec.slug },
    });

    const customerData = Array.from({ length: spec.customerCount }, () => {
      phoneCounter += randInt(1, 40);
      return {
        brandId: brand.id,
        name: `${FIRST_NAMES[randInt(0, FIRST_NAMES.length)]} ${LAST_NAMES[randInt(0, LAST_NAMES.length)]}`,
        phone: `+91${phoneCounter}`,
      };
    });

    await prisma.customer.createMany({ data: customerData });
    const customers = await prisma.customer.findMany({
      where: { brandId: brand.id },
      select: { id: true },
    });

    for (const waveSpec of spec.waves) {
      const wave = await prisma.wave.create({
        data: {
          brandId: brand.id,
          label: waveSpec.label,
          startDate: utcDate(waveSpec.startDay),
          endDate: utcDate(waveSpec.endDay),
        },
      });

      const respondents = shuffle(customers).slice(
        0,
        Math.round(customers.length * waveSpec.participation),
      );

      const responses = respondents.map((customer) => {
        const score = pickWeighted([...DISTRIBUTIONS[waveSpec.distribution]]);

        let respondedAt: Date;
        if (waveSpec.hourWindow) {
          const [fromHour, toHour] = waveSpec.hourWindow;
          const base = Date.parse(`${waveSpec.startDay}T00:00:00.000Z`);
          const offsetMs = (fromHour + rand() * (toHour - fromHour)) * 3600_000;
          respondedAt = new Date(base + offsetMs);
        } else {
          respondedAt = randomInstantWithin(waveSpec.startDay, waveSpec.endDay);
        }

        return {
          waveId: wave.id,
          customerId: customer.id,
          score,
          verbatim: verbatimForScore(score),
          respondedAt,
        };
      });

      await prisma.response.createMany({ data: responses });
      totalResponses += responses.length;
      console.log(`  ${spec.slug} / ${waveSpec.label}: ${responses.length} responses`);
    }

    console.log(`Seeded ${spec.name} (${spec.customerCount} customers, ${spec.waves.length} waves)`);
  }

  console.log(`\nDone. ${BRANDS.length} brands, ${totalResponses} responses total.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
