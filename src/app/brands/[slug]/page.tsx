import Link from "next/link";
import { notFound } from "next/navigation";

import { AddCustomerForm } from "@/components/AddCustomerForm";
import { ChevronRight } from "@/components/ChevronRight";
import { BucketFilter } from "@/components/BucketFilter";
import { FeedbackTable } from "@/components/FeedbackTable";
import { FlaggedFilter } from "@/components/FlaggedFilter";
import { NonRatedCustomers } from "@/components/NonRatedCustomers";
import { Pagination } from "@/components/Pagination";
import { ScoreCard } from "@/components/ScoreCard";
import { SearchBox } from "@/components/SearchBox";
import { WaveSelect } from "@/components/WaveSelect";
import { formatDate } from "@/lib/format";
import { isBucket } from "@/lib/nps";
import { BrandService } from "@/services/brand.service";
import { CustomerService } from "@/services/customer.service";
import { ResponseService, type SortDir, type SortKey } from "@/services/response.service";
import { WaveService } from "@/services/wave.service";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 15;
const CUSTOMER_PAGE_SIZE = 10;

type SearchParams = Record<string, string | string[] | undefined>;

function readParam(params: SearchParams, key: string): string | undefined {
  const value = params[key];
  return typeof value === "string" ? value : undefined;
}

export default async function BrandDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { slug } = await params;
  const query = await searchParams;

  const brand = await BrandService.getBySlug(slug);
  if (!brand) notFound();

  const waves = await WaveService.listForBrand(brand.id);

  if (waves.length === 0) {
    return (
      <div className="card p-12 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-xl text-slate-400">
          ◔
        </div>
        <h2 className="mt-4 text-base font-semibold text-slate-900">No waves yet</h2>
        <p className="mt-1 text-sm text-slate-600">
          {brand.name} has no survey waves to report on.
        </p>
      </div>
    );
  }

  const requestedWaveId = readParam(query, "wave");
  const wave = waves.find((candidate) => candidate.id === requestedWaveId) ?? waves[0];

  const bucketParam = readParam(query, "bucket");
  const bucket = isBucket(bucketParam) ? bucketParam : "all";
  const search = readParam(query, "q") ?? "";
  const sort: SortKey = readParam(query, "sort") === "date" ? "date" : "score";
  const dir: SortDir = readParam(query, "dir") === "asc" ? "asc" : "desc";
  const page = Math.max(1, Number.parseInt(readParam(query, "page") ?? "1", 10) || 1);
  const flaggedOnly = readParam(query, "flagged") === "1";
  const customerPage = Math.max(1, Number.parseInt(readParam(query, "cpage") ?? "1", 10) || 1);
  const customerSearch = readParam(query, "cq") ?? "";

  const summary = await ResponseService.getSummary(wave);
  const { rows, total } = await ResponseService.listFeedback({
    wave,
    bucket,
    search,
    page,
    pageSize: PAGE_SIZE,
    sort,
    dir,
    flaggedOnly,
  });

  const nonRated = await CustomerService.listWithoutResponses(brand.id, {
    page: customerPage,
    pageSize: CUSTOMER_PAGE_SIZE,
    search: customerSearch,
  });

  const linkQuery: Record<string, string> = { wave: wave.id, bucket, q: search };
  if (flaggedOnly) linkQuery.flagged = "1";

  return (
    <div className="animate-fade-in space-y-6">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm">
        <Link
          href="/brands"
          className="rounded px-1 py-0.5 font-medium text-slate-500 transition-colors hover:text-brand-700"
        >
          Brands
        </Link>
        <ChevronRight />
        <span className="px-1 font-medium text-slate-900" aria-current="page">
          {brand.name}
        </span>
      </nav>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{brand.name}</h1>
          <p className="mt-1 text-sm text-slate-600">
            <span className="font-medium text-slate-700">{wave.label}</span> ·{" "}
            {formatDate(wave.startDate)} – {formatDate(wave.endDate)}
          </p>
        </div>

        <WaveSelect
          waves={waves.map((option) => ({ id: option.id, label: option.label }))}
          currentId={wave.id}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ScoreCard summary={summary} />
        </div>
        <AddCustomerForm brandId={brand.id} brandSlug={brand.slug} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <BucketFilter current={bucket} />
          <FlaggedFilter current={flaggedOnly} />
        </div>
        <SearchBox current={search} />
      </div>

      <div className="card overflow-hidden">
        <FeedbackTable
          rows={rows}
          sort={sort}
          dir={dir}
          query={linkQuery}
          brandSlug={brand.slug}
        />
        <Pagination page={page} pageSize={PAGE_SIZE} total={total} label="comments" />
      </div>

      <NonRatedCustomers
        rows={nonRated.rows}
        total={nonRated.total}
        page={customerPage}
        pageSize={CUSTOMER_PAGE_SIZE}
        search={customerSearch}
      />
    </div>
  );
}
