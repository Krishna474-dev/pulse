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
   * Aggregates are fetched for all brands at once so the query count stays flat
   * as brands and customers grow.
   */
  static async listWithStats(): Promise<BrandWithStats[]> {
    const brands = await prisma.brand.findMany({ orderBy: { name: "asc" } });
    if (brands.length === 0) return [];

    const brandId = { in: brands.map((brand) => brand.id) };

    const [waves, customerCounts, activeCounts] = await Promise.all([
      prisma.wave.findMany({ where: { brandId }, orderBy: { startDate: "desc" } }),
      prisma.customer.groupBy({ by: ["brandId"], where: { brandId }, _count: { _all: true } }),
      prisma.customer.groupBy({
        by: ["brandId"],
        where: { brandId, responses: { some: {} } },
        _count: { _all: true },
      }),
    ]);

    const wavesByBrand = new Map<string, Wave[]>();
    for (const wave of waves) {
      wavesByBrand.set(wave.brandId, [...(wavesByBrand.get(wave.brandId) ?? []), wave]);
    }

    const customerCount = new Map(customerCounts.map((row) => [row.brandId, row._count._all]));
    const activeCount = new Map(activeCounts.map((row) => [row.brandId, row._count._all]));

    return Promise.all(
      brands.map(async (brand) => {
        const brandWaves = wavesByBrand.get(brand.id) ?? [];
        const latestWave = brandWaves[0] ?? null;

        return {
          ...brand,
          waveCount: brandWaves.length,
          latestWave,
          summary: latestWave ? await ResponseService.getSummary(latestWave) : EMPTY_SUMMARY,
          customerCount: customerCount.get(brand.id) ?? 0,
          activeCustomers: activeCount.get(brand.id) ?? 0,
        };
      }),
    );
  }
}
