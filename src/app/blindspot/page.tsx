import Link from "next/link";
import { BiasLegend, CoverageBar } from "@/components/coverage-bar";
import { EmptyState } from "@/components/empty-state";
import { RelativeTime } from "@/components/relative-time";
import { getBlindspotStories, getSourceRatings } from "@/db/coverage";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type BlindspotParams = {
  side?: string;
};

const filters = [
  { value: "all", label: "All blindspots" },
  { value: "left", label: "Left" },
  { value: "right", label: "Right" },
] as const;

export default async function BlindspotPage({
  searchParams,
}: {
  searchParams: Promise<BlindspotParams>;
}) {
  const params = await searchParams;
  const side =
    params.side === "left" || params.side === "right" ? params.side : "all";
  const all = getBlindspotStories({ limit: 250 });
  const stories =
    side === "all"
      ? all
      : all.filter((entry) => entry.coverage.blindspot === side);
  const leftCount = all.filter(
    (entry) => entry.coverage.blindspot === "left",
  ).length;
  const rightCount = all.filter(
    (entry) => entry.coverage.blindspot === "right",
  ).length;
  const ratings = getSourceRatings();
  const rated = ratings.filter((rating) => rating.bias !== "unrated").length;
  const ratingCounts = {
    left: 0,
    "lean-left": 0,
    center: 0,
    "lean-right": 0,
    right: 0,
    unrated: 0,
  };
  for (const rating of ratings) ratingCounts[rating.bias] += 1;
  const rightRated = ratingCounts.right + ratingCounts["lean-right"];

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-5 border-b border-line pb-5">
        <div>
          <p className="rule-label">Blindspot</p>
          <h1 className="mt-1 text-balance font-display text-4xl leading-none tracking-[-0.02em] text-ink sm:text-5xl">
            What the desk is missing.
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
            Stories where one side of the political spectrum is barely represented
            in the coverage we have. A small-desk version of Ground News&apos;
            blindspot feed, built from outlet-level bias labels.
          </p>
        </div>
        <div className="flex items-center gap-6 font-mono text-[10px] uppercase tracking-wider text-muted">
          <div>
            <span className="block">Blindspots</span>
            <span className="mt-1 block font-display text-2xl normal-case tracking-normal text-ink">
              {all.length}
            </span>
          </div>
          <div>
            <span className="block">Rated sources</span>
            <span className="mt-1 block font-display text-2xl normal-case tracking-normal text-ink">
              {rated}/{ratings.length}
            </span>
          </div>
        </div>
      </header>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-b border-line pb-3">
        {filters.map((filter) => {
          const active = side === filter.value;
          const count =
            filter.value === "all"
              ? all.length
              : filter.value === "left"
                ? leftCount
                : rightCount;
          return (
            <Link
              key={filter.value}
              href={
                filter.value === "all"
                  ? "/blindspot"
                  : `/blindspot?side=${filter.value}`
              }
              className={cn(
                "rounded-full border px-3 py-1.5 font-mono text-[9px] uppercase tracking-wider transition-colors",
                active
                  ? "border-accent/30 bg-accent-soft text-accent"
                  : "border-line bg-card text-muted hover:text-ink",
              )}
            >
              {filter.label}
              <span className="ml-1.5 tabular-nums opacity-60">{count}</span>
            </Link>
          );
        })}
        <Link
          href="/my-bias"
          className="ml-auto font-mono text-[9px] uppercase tracking-wider text-muted transition-colors hover:text-accent"
        >
          My news bias →
        </Link>
      </div>

      <div className="mt-8 grid gap-10 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section aria-label="Blindspot stories">
          {stories.length ? (
            <div className="border-t border-line">
              {stories.map((entry, index) => {
                const blindspot = entry.coverage.blindspot;
                if (!blindspot) return null;
                return (
                  <Link
                    key={entry.story.id}
                    href={`/stories/${entry.story.id}`}
                    className="group block animate-rise border-b border-line py-5 transition-colors hover:border-accent/40"
                    style={{ animationDelay: `${Math.min(index, 8) * 35}ms` }}
                  >
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
                      <span
                        className={cn(
                          "rounded-full border px-2 py-0.5",
                          blindspot === "left"
                            ? "border-[#315b7d]/25 bg-[#315b7d]/10 text-[#315b7d] dark:border-[#8fb7d8]/25 dark:bg-[#8fb7d8]/15 dark:text-[#a9c9e4]"
                            : "border-[#a8422e]/25 bg-[#a8422e]/10 text-[#943826] dark:border-[#e08a6f]/25 dark:bg-[#e08a6f]/15 dark:text-[#eaa78f]",
                        )}
                      >
                        {blindspot} blindspot
                      </span>
                      <span>{entry.story.sourceCount} sources</span>
                      <span aria-hidden="true">·</span>
                      <span>{entry.story.articleCount} articles</span>
                      <span aria-hidden="true">·</span>
                      <RelativeTime value={entry.story.lastSeen} />
                    </div>
                    <h2 className="mt-2 text-pretty font-display text-2xl leading-snug text-ink transition-colors group-hover:text-accent">
                      {entry.story.title}
                    </h2>
                    <CoverageBar
                      counts={entry.coverage.counts}
                      total={entry.coverage.totalSources}
                      className="mt-3 max-w-xl"
                    />
                    <p className="mt-2 line-clamp-1 text-xs text-muted">
                      {entry.story.sourceNames}
                    </p>
                  </Link>
                );
              })}
            </div>
          ) : (
            <EmptyState
              title="No blindspots in this window."
              body="The desk has not found a recent story where one side is sharply under-represented. That can change as coverage arrives."
            />
          )}
        </section>

        <aside className="space-y-6">
          <section className="card rounded-xl p-5">
            <p className="rule-label">How this works</p>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              A story is flagged when it has at least three rated sources, at
              least two sources from the opposite side, and that side makes up
              at least 66% of rated coverage while the missing side is at or
              below 25%.
            </p>
            <p className="mt-3 text-xs leading-relaxed text-muted">
              This is a deliberately small-desk threshold. Ground News uses
              larger source counts because it ingests thousands of outlets.
            </p>
            <p className="mt-3 font-mono text-[8px] uppercase leading-relaxed tracking-wider text-muted/70">
              Outlet-level labels from{" "}
              <a
                href="https://www.allsides.com/media-bias/ratings"
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-line underline-offset-2 hover:text-accent"
              >
                AllSides
              </a>{" "}
              · CC BY-NC 4.0
            </p>
          </section>

          <section className="card rounded-xl p-5">
            <p className="rule-label">Desk balance</p>
            <BiasLegend
              counts={ratingCounts}
              total={ratings.length}
              className="mt-3"
              showZero
            />
            {rightRated === 0 ? (
              <p className="mt-4 rounded-lg border border-amber/30 bg-amber/10 px-3 py-2 text-xs leading-relaxed text-amber">
                No right-rated sources are on the desk yet, so every left-heavy
                story will read as a right blindspot. Add a right-rated feed to
                make this feed more useful.
              </p>
            ) : null}
            <Link
              href="/sources"
              className="mt-3 inline-flex font-mono text-[9px] uppercase tracking-wider text-accent transition-opacity hover:opacity-75"
            >
              See source ratings →
            </Link>
          </section>

          <section className="card rounded-xl p-5">
            <p className="rule-label">Unrated is not center</p>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Sources without an AllSides rating are counted separately. They
              never fill in for the missing side, and they are not treated as
              neutral.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
