import Link from "next/link";
import { ArticleImage } from "@/components/article-image";
import { EmptyState } from "@/components/empty-state";
import { HistoryFilters } from "@/components/filters";
import { ArrowUpRightIcon } from "@/components/icons";
import {
  getCountryFacets,
  getHistoricalEvents,
  getHistoryCount,
  getHistoryStats,
} from "@/db/queries";
import { resolveHistoryYears } from "@/lib/date-filters";
import { formatEventDate, formatYear } from "@/lib/format";
import { loadWikiLeadImages } from "@/lib/wiki";
import { wikiHref, wikiTitleFromUrl } from "@/lib/wiki-links";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 60;

type HistoryParams = {
  country?: string;
  era?: string;
  kind?: string;
  from?: string;
  to?: string;
  page?: string;
};

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<HistoryParams>;
}) {
  const params = await searchParams;
  const years = resolveHistoryYears(params.era, params.from, params.to);
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const filters = {
    country: params.country,
    kind: params.kind,
    ...years,
  };

  const events = await getHistoricalEvents({
    ...filters,
    limit: PAGE_SIZE,
    offset,
  });
  const total = await getHistoryCount(filters);
  const stats = await getHistoryStats();
  const countries = await getCountryFacets("history");
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const wikiTitles = events
    .map((event) => wikiTitleFromUrl(event.sourceUrl))
    .filter((title): title is string => Boolean(title));
  const leadImages = await loadWikiLeadImages(wikiTitles);

  const base = new URLSearchParams();
  for (const key of ["country", "era", "kind", "from", "to"] as const) {
    if (params[key]) base.set(key, params[key]!);
  }

  function hrefFor(nextPage: number): string {
    const query = new URLSearchParams(base);
    if (nextPage > 1) query.set("page", String(nextPage));
    const value = query.toString();
    return value ? `/history?${value}` : "/history";
  }

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-6 border-b border-line pb-6">
        <div>
          <p className="rule-label">History</p>
          <h1 className="mt-1 text-balance font-display text-4xl leading-none tracking-[-0.02em] text-ink sm:text-5xl">
            The long record.
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            Dated events from the whole documented human record, gathered beside
            the wire. {stats.events.toLocaleString()} events across{" "}
            {stats.countries.toLocaleString()} countries and historical states,
            from the first cities to this morning.
          </p>
        </div>
        <dl className="grid grid-cols-3 gap-5 font-mono text-[10px] uppercase tracking-wider text-muted sm:gap-8">
          <div>
            <dt>Records</dt>
            <dd className="mt-1 font-display text-2xl normal-case tracking-normal text-ink">
              {stats.events.toLocaleString()}
            </dd>
          </div>
          <div>
            <dt>Countries</dt>
            <dd className="mt-1 font-display text-2xl normal-case tracking-normal text-ink">
              {stats.countries.toLocaleString()}
            </dd>
          </div>
          <div>
            <dt>Span</dt>
            <dd className="mt-1 font-display text-2xl normal-case tracking-normal text-ink">
              {stats.earliest !== null && stats.latest !== null
                ? `${formatYear(stats.earliest)} – ${formatYear(stats.latest)}`
                : "—"}
            </dd>
          </div>
        </dl>
      </header>

      <div className="sticky top-16 z-20 -mx-5 border-b border-line bg-paper/90 px-5 py-3 backdrop-blur lg:-mx-10 lg:px-10">
        <div className="flex flex-wrap items-center gap-2">
          <HistoryFilters
            countries={countries}
            country={params.country ?? "all"}
            era={params.era ?? "all"}
            kind={params.kind ?? "all"}
            from={params.from}
            to={params.to}
          />
          <span className="ml-auto font-mono text-[9px] uppercase tracking-wider text-muted">
            {total.toLocaleString()} records
          </span>
        </div>
      </div>

      {events.length ? (
        <div className="mt-2">
          {events.map((event) => {
            const wikiTitle = wikiTitleFromUrl(event.sourceUrl);
            const leadImage = wikiTitle ? leadImages.get(wikiTitle) : null;

            return (
              <article
                key={event.id}
                className="group grid animate-rise grid-cols-[86px_minmax(0,1fr)_auto] gap-4 border-b border-line px-1 py-4 transition-colors hover:bg-card/40 sm:grid-cols-[110px_minmax(0,1fr)_auto]"
              >
                <div className="text-right">
                  <span className="font-display text-xl leading-none text-ink sm:text-2xl">
                    {formatYear(event.year)}
                  </span>
                  <span className="mt-1 block font-mono text-[9px] uppercase tracking-wider text-muted">
                    {event.month
                      ? formatEventDate(event.year, event.month, event.day)
                      : event.kind === "selected"
                        ? "Selected"
                        : "Event"}
                  </span>
                </div>

                <div className="flex min-w-0 gap-4">
                  {leadImage && wikiTitle ? (
                    <Link
                      href={wikiHref(wikiTitle)}
                      className="hidden shrink-0 sm:block"
                      aria-label={`Open ${wikiTitle} on Wikipedia`}
                      title="Open on Wikipedia"
                    >
                      <ArticleImage
                        url={leadImage.imageUrl}
                        alt=""
                        width={leadImage.width}
                        height={leadImage.height}
                        className="h-16 w-20 border border-line"
                        sizes="80px"
                      />
                    </Link>
                  ) : null}
                  <div className="min-w-0">
                    <h2 className="text-pretty font-display text-lg leading-snug text-ink transition-colors group-hover:text-accent sm:text-xl">
                      {event.title}
                    </h2>
                    {event.description && event.description !== event.title ? (
                      <p className="mt-1 line-clamp-2 max-w-3xl text-sm leading-relaxed text-muted">
                        {event.description}
                      </p>
                    ) : null}
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {event.countryNames
                        ? event.countryNames.split(" · ").map((country) => (
                            <span
                              key={country}
                              className="rounded-full border border-line px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted"
                            >
                              {country}
                            </span>
                          ))
                        : null}
                      <span className="font-mono text-[9px] uppercase tracking-wider text-muted/60">
                        {event.source === "wikidata" ? "Wikidata" : "On this day"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-start">
                  {event.sourceUrl ? (
                    <a
                      href={event.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="grid size-8 place-items-center rounded-full text-muted transition-colors hover:bg-card hover:text-accent"
                      aria-label="Open source"
                      title="Open source"
                    >
                      <ArrowUpRightIcon className="size-4" />
                    </a>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="mt-8">
          <EmptyState
            title={total === 0 && stats.events === 0 ? "History is not imported yet." : "No records match."}
            body={
              total === 0 && stats.events === 0
                ? "Seed the timeline with `npm run import:history -- --source onthisday` and optionally add Wikidata ranges. History pages need cached Wikipedia data for thumbnails."
                : "Try a wider era, another country, or clear the filters."
            }
          />
        </div>
      )}

      {pageCount > 1 ? (
        <nav
          className="mt-6 flex items-center justify-between gap-4 font-mono text-[10px] uppercase tracking-wider text-muted"
          aria-label="History pagination"
        >
          {page > 1 ? (
            <Link
              href={hrefFor(page - 1)}
              className="rounded-full border border-line bg-card px-3 py-1.5 transition-colors hover:border-accent hover:text-accent"
            >
              Newer
            </Link>
          ) : (
            <span />
          )}
          <span>
            {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of{" "}
            {total.toLocaleString()}
          </span>
          {page < pageCount ? (
            <Link
              href={hrefFor(page + 1)}
              className="rounded-full border border-line bg-card px-3 py-1.5 transition-colors hover:border-accent hover:text-accent"
            >
              Older
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </div>
  );
}
