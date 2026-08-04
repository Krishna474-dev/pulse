import type { Brand, Wave } from "@prisma/client";

import { EMPTY_SUMMARY, type Summary } from "@/lib/nps";
import { prisma } from "@/lib/prisma";
import { ResponseService } from "@/services/response.service";

export type BrandWithStats = Brand & {
  waveCount: number;
  latestWave: Wave | null;
  summary: Summary;
  customerCount: number;
  activeCustomers: number;
};

export class BrandService {
  static async list(): Promise<Brand[]> {
    return prisma.brand.findMany({ orderBy: { name: "asc" } });
  }

  static async getBySlug(slug: string): Promise<Brand | null> {
    return prisma.brand.findUnique({ where: { slug } });
  }

  /**
   * Brand list with the headline number for each brand's most recent wave.
   */
  static async listWithStats(): Promise<BrandWithStats[]> {
    const brands = await prisma.brand.findMany({ orderBy: { name: "asc" } });
    const results: BrandWithStats[] = [];

    for (const brand of brands) {
      const waves = await prisma.wave.findMany({
        where: { brandId: brand.id },
        orderBy: { startDate: "desc" },
      });

      const latestWave = waves[0] ?? null;
      const summary = latestWave ? await ResponseService.getSummary(latestWave) : EMPTY_SUMMARY;

      const customers = await prisma.customer.findMany({
        where: { brandId: brand.id },
        select: { id: true },
      });

      // How many of this brand's customers have ever given us feedback.
      let activeCustomers = 0;
      for (const customer of customers) {
        const responseCount = await prisma.response.count({
          where: { customerId: customer.id },
        });
        if (responseCount > 0) activeCustomers++;
      }

      results.push({
        ...brand,
        waveCount: waves.length,
        latestWave,
        summary,
        customerCount: customers.length,
        activeCustomers,
      });
    }

    return results;
  }
}
