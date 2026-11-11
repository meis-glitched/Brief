import { BriefPanel } from "@/components/brief-panel";
import { EmptyState } from "@/components/empty-state";
import { NewsFilters } from "@/components/filters";
import { RefreshButton } from "@/components/refresh-button";
import { SourcePulse } from "@/components/source-pulse";
import { LeadStory, StoryRow } from "@/components/story-card";
import {
  getBrief,
  getCountryFacets,
  getLastRun,
  getSourceHealth,
  getStats,
  getTodayStories,
} from "@/db/queries";
import { resolveNewsRange } from "@/lib/date-filters";
import { formatLongDate } from "@/lib/format";

export const dynamic = "force-dynamic";

type TodayParams = {
  country?: string;
  range?: string;
  from?: string;
  to?: string;
};

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<TodayParams>;
}) {
  const params = await searchParams;
  const range = resolveNewsRange(params.range, params.from, params.to);
  const stories = await getTodayStories(14, {
    country: params.country,
    ...range,
  });
  const lead = stories[0];
  const rest = stories.slice(1);
  const brief = await getBrief();
  const sources = await getSourceHealth();
  const lastRun = await getLastRun();
  const stats = await getStats();
  const countries = await getCountryFacets("news");
  const hasFilters = Boolean(
    (params.country && params.country !== "all") ||
      (params.range && params.range !== "any") ||
      params.from ||
      params.to,
  );

  return (
    <div>
      <section className="flex flex-wrap items-end justify-between gap-6 border-b border-line pb-6">
        <div>
          <p className="rule-label">{formatLongDate()}</p>
          <h1 className="mt-2 text-balance font-display text-5xl leading-[0.92] tracking-[-0.035em] text-ink sm:text-6xl">
            The day, <em className="text-accent">edited</em>.
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
            A quiet local desk for the loud world. {stats.today} headlines today,
            clustered across {stats.sources} sources.
          </p>
        </div>
        <dl className="grid grid-cols-3 gap-5 font-mono text-[10px] uppercase tracking-wider text-muted sm:gap-8">
          <div>
            <dt>Articles</dt>
            <dd className="mt-1 font-display text-2xl normal-case tracking-normal text-ink">
              {stats.articles}
            </dd>
          </div>
          <div>
            <dt>Multi-source</dt>
            <dd className="mt-1 font-display text-2xl normal-case tracking-normal text-ink">
              {stats.multiSource}
            </dd>
          </div>
          <div>
            <dt>Sources</dt>
            <dd className="mt-1 font-display text-2xl normal-case tracking-normal text-ink">
              {stats.sources}
            </dd>
          </div>
        </dl>
      </section>

      <div className="mt-4 border-b border-line pb-3">
        <NewsFilters
          countries={countries}
          country={params.country ?? "all"}
          range={params.range ?? "any"}
          from={params.from}
          to={params.to}
        />
      </div>

      <div className="mt-8 grid gap-12 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section aria-label="Today's stories">
          {lead ? (
            <LeadStory story={lead} />
          ) : (
            <EmptyState
              title={hasFilters ? "No stories match." : "The desk is empty."}
              body={
                hasFilters
                  ? "Try a wider date range, another country, or clear the filters."
                  : "Fetch the first batch of headlines to start clustering coverage and writing a brief."
              }
            >
              {hasFilters ? null : <RefreshButton />}
            </EmptyState>
          )}

          {rest.length ? (
            <div className="mt-2">
              {rest.map((story, index) => (
                <StoryRow key={story.id} story={story} index={index + 1} />
              ))}
            </div>
          ) : null}

          {lead && rest.length === 0 ? (
            <p className="py-6 text-sm text-muted">
              Only one story on the desk so far. Fetch again in a little while.
            </p>
          ) : null}
        </section>

        <aside className="space-y-6">
          <BriefPanel brief={brief} />
          <SourcePulse sources={sources} lastRun={lastRun} />
          <section className="rounded-xl border border-line px-5 py-4">
            <p className="rule-label">How to read</p>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Stories group coverage from multiple sources. Open one to see the
              spread, or use the wire to skim every headline.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 font-mono text-[9px] uppercase tracking-wider text-muted/80">
              <span>⌘K search</span>
              <span>j/k move</span>
              <span>s save</span>
              <span>m mark read</span>
              <span>g t today</span>
              <span>g h history</span>
              <span>g b blindspot</span>
              <span>g m my bias</span>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
