import { Prisma, type Wave } from "@prisma/client";

import { clearCached, getCached, setCached } from "@/lib/cache";
import { summarise, type Bucket, type Summary } from "@/lib/nps";
import { prisma } from "@/lib/prisma";
import { waveWindow } from "@/services/wave.service";

export type FeedbackRow = {
  id: string;
  score: number;
  verbatim: string | null;
  respondedAt: Date;
  flaggedAt: Date | null;
  customerName: string;
};

export type FeedbackPage = {
  rows: FeedbackRow[];
  total: number;
};

export type SortKey = "score" | "date";

export type SortDir = "asc" | "desc";

export type ListFeedbackParams = {
  wave: Wave;
  bucket: Bucket;
  search: string;
  page: number;
  pageSize: number;
  sort: SortKey;
  dir: SortDir;
  flaggedOnly: boolean;
};

export type IncomingResponse = {
  brandSlug: string;
  from: string;
  waveLabel: string;
  score: number;
  text?: string | null;
  eventId: string;
};

function scoreFilter(bucket: Bucket) {
  switch (bucket) {
    case "promoters":
      return { gte: 9 };
    case "passives":
      return { gte: 7, lte: 8 };
    case "detractors":
      return { lte: 6 };
    default:
      return undefined;
  }
}

function scoreSql(bucket: Bucket): Prisma.Sql {
  switch (bucket) {
    case "promoters":
      return Prisma.sql`AND r.score >= 9`;
    case "passives":
      return Prisma.sql`AND r.score BETWEEN 7 AND 8`;
    case "detractors":
      return Prisma.sql`AND r.score <= 6`;
    default:
      return Prisma.empty;
  }
}

export class ResponseService {
  /**
   * Scored on every response in the wave, including the score-only ones. The
   * comments table filters to responses with a verbatim; the headline must not.
   */
  static async getSummary(wave: Wave): Promise<Summary> {
    const { start, end } = waveWindow(wave);

    const rows = await prisma.response.findMany({
      where: {
        waveId: wave.id,
        respondedAt: { gte: start, lte: end },
      },
      select: { score: true },
    });

    return summarise(rows.map((row) => row.score));
  }

  /**
   * Both orderings end in `id` so that LIMIT/OFFSET paging cannot repeat or skip
   * rows that tie on the sort column.
   */
  static async listFeedback(params: ListFeedbackParams): Promise<FeedbackPage> {
    const { wave, bucket, search, page, pageSize, sort, dir, flaggedOnly } = params;
    const { start, end } = waveWindow(wave);
    const offset = (page - 1) * pageSize;

    if (search.trim().length > 0) {
      const cacheKey = `${wave.id}|${bucket}|${sort}|${dir}|${page}|${search}|${flaggedOnly}`;
      const cached = getCached<FeedbackPage>(cacheKey);
      if (cached) return cached;

      const where = Prisma.sql`
        WHERE r."waveId" = ${wave.id}
          AND r.verbatim IS NOT NULL
          AND r."respondedAt" >= ${start}
          AND r."respondedAt" <= ${end}
          AND (r.verbatim ILIKE ${`%${search}%`} OR c.name ILIKE ${`%${search}%`})
          ${scoreSql(bucket)}
          ${flaggedOnly ? Prisma.sql`AND r."flaggedAt" IS NOT NULL` : Prisma.empty}
      `;

      // Direction is syntax, not a value, so it cannot be a bound parameter. It is
      // safe here because `dir` is a validated union, never raw user text.
      const direction = dir === "asc" ? Prisma.sql`ASC` : Prisma.sql`DESC`;
      const orderBy =
        sort === "score"
          ? Prisma.sql`r.score ${direction}`
          : Prisma.sql`r."respondedAt" ${direction}`;

      const rows = await prisma.$queryRaw<FeedbackRow[]>`
        SELECT r.id, r.score, r.verbatim, r."respondedAt", r."flaggedAt", c.name AS "customerName"
        FROM "Response" r
        JOIN "Customer" c ON c.id = r."customerId"
        ${where}
        ORDER BY ${orderBy}, r.id ASC
        LIMIT ${pageSize} OFFSET ${offset}
      `;

      const counted = await prisma.$queryRaw<{ count: number }[]>`
        SELECT COUNT(*)::int AS count
        FROM "Response" r
        JOIN "Customer" c ON c.id = r."customerId"
        ${where}
      `;

      const result: FeedbackPage = { rows, total: counted[0]?.count ?? 0 };
      setCached(cacheKey, result);
      return result;
    }

    const where = {
      waveId: wave.id,
      verbatim: { not: null },
      respondedAt: { gte: start, lte: end },
      score: scoreFilter(bucket),
      flaggedAt: flaggedOnly ? { not: null } : undefined,
    };

    const [rows, total] = await Promise.all([
      prisma.response.findMany({
        where,
        include: { customer: { select: { name: true } } },
        orderBy: [sort === "score" ? { score: dir } : { respondedAt: dir }, { id: "asc" }],
        skip: offset,
        take: pageSize,
      }),
      prisma.response.count({ where }),
    ]);

    return {
      rows: rows.map((row) => ({
        id: row.id,
        score: row.score,
        verbatim: row.verbatim,
        respondedAt: row.respondedAt,
        flaggedAt: row.flaggedAt,
        customerName: row.customer.name,
      })),
      total,
    };
  }

  /**
   * Mark or unmark a response for follow-up. Returns false when the id matches
   * nothing, so the caller can tell a stale row from a successful write.
   */
  static async setFlag(responseId: string, flagged: boolean): Promise<boolean> {
    const updated = await prisma.response.updateMany({
      where: { id: responseId },
      data: { flaggedAt: flagged ? new Date() : null },
    });

    if (updated.count === 0) return false;

    clearCached();
    return true;
  }

  /**
   * Persist one inbound provider event. Returns false when the payload could not
   * be matched to existing records. See docs/decisions.md.
   */
  static async record(event: IncomingResponse): Promise<boolean> {
    const brand = await prisma.brand.findUnique({ where: { slug: event.brandSlug } });
    if (!brand) {
      console.warn("[webhook] unknown brand", { slug: event.brandSlug, eventId: event.eventId });
      return false;
    }

    const customer = await prisma.customer.findUnique({
      where: { brandId_phone: { brandId: brand.id, phone: event.from } },
    });
    if (!customer) {
      console.warn("[webhook] unknown customer", { from: event.from, eventId: event.eventId });
      return false;
    }

    const wave = await prisma.wave.findUnique({
      where: { brandId_label: { brandId: brand.id, label: event.waveLabel } },
    });
    if (!wave) {
      console.warn("[webhook] unknown wave", { label: event.waveLabel, eventId: event.eventId });
      return false;
    }

    // De-duplication is enforced by the unique index on eventId: a read-then-write
    // check loses to a redelivered batch arriving concurrently.
    try {
      await prisma.response.create({
        data: {
          waveId: wave.id,
          customerId: customer.id,
          score: event.score,
          verbatim: event.text?.trim() ? event.text.trim() : null,
          eventId: event.eventId,
          respondedAt: new Date(),
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        console.info("[webhook] duplicate event ignored", { eventId: event.eventId });
        return false;
      }

      throw error;
    }

    return true;
  }
}
