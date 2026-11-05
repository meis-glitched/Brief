import { RefreshButton } from "@/components/refresh-button";
import { SourceRow } from "@/components/source-row";
import { RelativeTime } from "@/components/relative-time";
import { getLastRun, getSourceHealth, getStats } from "@/db/queries";

export const dynamic = "force-dynamic";

type RunError = { sourceId: string; name: string; error: string };

export default function SourcesPage() {
  const sources = getSourceHealth();
  const lastRun = getLastRun();
  const stats = getStats();
  const healthy = sources.filter((source) => !source.lastError).length;
  const rated = sources.filter((source) => source.bias !== "unrated").length;

  let errors: RunError[] = [];
  if (lastRun?.errors) {
    try {
      errors = JSON.parse(lastRun.errors) as RunError[];
    } catch {
      errors = [];
    }
  }

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-5 border-b border-line pb-5">
        <div>
          <p className="rule-label">Sources</p>
          <h1 className="mt-1 text-balance font-display text-4xl leading-none tracking-[-0.02em] text-ink sm:text-5xl">
            Feeds on the desk.
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
            {healthy} of {sources.length} feeds healthy. {rated} rated by AllSides.
            {" "}{stats.articles} articles on file. Turn a feed off without
            deleting its history.
          </p>
        </div>
        <RefreshButton />
      </header>

      <div className="mt-8 grid gap-10 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section aria-label="Source list">
          <div className="grid grid-cols-[12px_minmax(0,1fr)_44px_48px_86px_40px] gap-3 border-b border-line pb-2 rule-label sm:grid-cols-[12px_minmax(0,1fr)_52px_60px_110px_44px]">
            <span />
            <span>Feed</span>
            <span>Type</span>
            <span>Count</span>
            <span>Fetched</span>
            <span className="justify-self-end">On</span>
          </div>
          {sources.map((source) => (
            <SourceRow key={source.id} source={source} />
          ))}
        </section>

        <aside className="space-y-6">
          <section className="card rounded-xl p-5">
            <p className="rule-label">Last fetch</p>
            {lastRun ? (
              <>
                <p className="mt-2 font-display text-3xl leading-none text-ink">
                  {lastRun.inserted}
                  <span className="ml-2 font-sans text-xs uppercase tracking-wider text-muted">
                    new
                  </span>
                </p>
                <dl className="mt-4 space-y-1.5 font-mono text-[9px] uppercase tracking-wider text-muted">
                  <div className="flex justify-between gap-3">
                    <dt>When</dt>
                    <dd className="text-ink-soft">
                      <RelativeTime value={lastRun.finishedAt ?? lastRun.startedAt} />
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>Sources</dt>
                    <dd className="text-ink-soft">{lastRun.sourceCount}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>Errors</dt>
                    <dd className={lastRun.errorCount ? "text-amber" : "text-ink-soft"}>
                      {lastRun.errorCount}
                    </dd>
                  </div>
                </dl>
              </>
            ) : (
              <p className="mt-2 text-sm text-muted">No fetch has run yet.</p>
            )}
            {errors.length ? (
              <ul className="mt-4 space-y-2 border-t border-line pt-3">
                {errors.slice(0, 5).map((error) => (
                  <li key={error.sourceId} className="text-[11px] leading-snug">
                    <span className="text-ink-soft">{error.name}</span>
                    <span className="mt-0.5 block text-muted">{error.error}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          <section className="card rounded-xl p-5">
            <p className="rule-label">Add a feed</p>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Sources are code, not a form. Edit{" "}
              <code className="rounded bg-paper-deep px-1 py-0.5 font-mono text-[10px] text-ink-soft">
                src/lib/ingest/sources.ts
              </code>{" "}
              and the next fetch will pick it up.
            </p>
            <p className="mt-3 font-mono text-[9px] uppercase leading-relaxed tracking-wider text-muted/80">
              RSS first · HTML fallback
              <br />
              Per-source limits and selectors
              <br />
              Bias labels in src/lib/source-ratings.ts
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
