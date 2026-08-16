import type { Customer, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type CustomerPage = {
  rows: Customer[];
  total: number;
};

export class CustomerService {
  /**
   * Customers of a brand who have never responded to any wave. `responses: { none: {} }`
   * becomes a NOT EXISTS, so this stays one query however many customers there are.
   */
  static async listWithoutResponses(
    brandId: string,
    { page, pageSize, search }: { page: number; pageSize: number; search: string },
  ): Promise<CustomerPage> {
    const term = search.trim();
    // Phone digits are stored with a leading + and no spacing, so a typed
    // "+91 98765" only matches once the punctuation is removed.
    const phoneTerm = term.replace(/[\s()+-]/g, "");

    const where: Prisma.CustomerWhereInput = {
      brandId,
      responses: { none: {} },
      ...(term
        ? {
            OR: [
              { name: { contains: term, mode: "insensitive" as const } },
              ...(phoneTerm ? [{ phone: { contains: phoneTerm } }] : []),
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.customer.count({ where }),
    ]);

    return { rows, total };
  }
}
