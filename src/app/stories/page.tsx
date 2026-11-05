import { EmptyState } from "@/components/empty-state";
import { RefreshButton } from "@/components/refresh-button";
import { StoryRow } from "@/components/story-card";
import { NewsFilters } from "@/components/filters";
import {
  getCountryFacets,
  getStats,
  getWeeklyStories,
} from "@/db/queries";
import { resolveNewsRange } from "@/lib/date-filters";

export const dynamic = "force-dynamic";

type StoriesParams = {
  country?: string;
  range?: string;
  from?: string;
  to?: string;
};

export default async function StoriesPage({
  searchParams,
}: {
  searchParams: Promise<StoriesParams>;
}) {
  const params = await searchParams;
  const range = resolveNewsRange(params.range, params.from, params.to);
  const stories = getWeeklyStories(120, {
    country: params.country,
    ...range,
  });
  const stats = getStats();
  const countries = getCountryFacets("news");

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-5 border-b border-line pb-5">
        <div>
          <p className="rule-label">Stories</p>
          <h1 className="mt-1 text-balance font-display text-4xl leading-none tracking-[-0.02em] text-ink sm:text-5xl">
            Coverage, clustered.
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
            The same event, gathered from every desk that covered it. Wider source
            spread means a story is harder to ignore. Showing the {stories.length} most
            recent clusters.
          </p>
        </div>
        <div className="flex items-center gap-6 font-mono text-[10px] uppercase tracking-wider text-muted">
          <div>
            <span className="block">Clusters</span>
            <span className="mt-1 block font-display text-2xl normal-case tracking-normal text-ink">
              {stats.stories}
            </span>
          </div>
          <div>
            <span className="block">Multi-source</span>
            <span className="mt-1 block font-display text-2xl normal-case tracking-normal text-ink">
              {stats.multiSource}
            </span>
          </div>
        </div>
      </header>

      <div className="sticky top-16 z-20 -mx-5 border-b border-line bg-paper/90 px-5 py-3 backdrop-blur lg:-mx-10 lg:px-10">
        <div className="flex flex-wrap items-center gap-2">
          <NewsFilters
            countries={countries}
            country={params.country ?? "all"}
            range={params.range ?? "any"}
            from={params.from}
            to={params.to}
          />
          <span className="ml-auto font-mono text-[9px] uppercase tracking-wider text-muted">
            {stories.length} shown
          </span>
        </div>
      </div>

      {stories.length ? (
        <div className="mt-2">
          {stories.map((story, index) => (
            <StoryRow key={story.id} story={story} index={index} />
          ))}
        </div>
      ) : (
        <div className="mt-8">
          <EmptyState
            title="No clusters yet."
            body="Once headlines arrive, related coverage is grouped into stories here."
          >
            <RefreshButton />
          </EmptyState>
        </div>
      )}
    </div>
  );
}
