import Link from "next/link";
import type { StoryCoverage } from "@/db/coverage";
import { BiasChip } from "./bias-chip";
import { BiasLegend, CoverageBar } from "./coverage-bar";

function blindspotCopy(blindspot: "left" | "right"): string {
  return blindspot === "left"
    ? "Left blindspot: this story is missing left-rated coverage."
    : "Right blindspot: this story is missing right-rated coverage.";
}

export function CoveragePanel({
  coverage,
  compact = false,
}: {
  coverage: StoryCoverage;
  compact?: boolean;
}) {
  return (
    <section className="card rounded-xl p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="rule-label">Coverage balance</p>
          <p className="mt-1 font-display text-2xl leading-none text-ink">
            {coverage.ratedSources}
            <span className="ml-1.5 font-sans text-[10px] uppercase tracking-wider text-muted">
              of {coverage.totalSources} rated
            </span>
          </p>
        </div>
        {coverage.blindspot ? (
          <Link
            href={`/blindspot?side=${coverage.blindspot}`}
            className="rounded-full border border-accent/30 bg-accent-soft px-2.5 py-1 font-mono text-[9px] uppercase tracking-wider text-accent transition-opacity hover:opacity-75"
          >
            {coverage.blindspot} blindspot
          </Link>
        ) : (
          <span className="rounded-full border border-line px-2.5 py-1 font-mono text-[9px] uppercase tracking-wider text-muted">
            {coverage.ratedSources >= 3 ? "No blindspot" : "Too few ratings"}
          </span>
        )}
      </div>

      <CoverageBar
        counts={coverage.counts}
        total={coverage.totalSources}
        className="mt-4"
        height="h-2.5"
      />
      <BiasLegend
        counts={coverage.counts}
        total={coverage.totalSources}
        className="mt-3"
      />

      <p className="mt-4 text-xs leading-relaxed text-muted">
        {coverage.blindspot
          ? blindspotCopy(coverage.blindspot)
          : "A wider spread means the desk is hearing from more than one side."}{" "}
        {coverage.unratedSources > 0
          ? `${coverage.unratedSources} unrated ${
              coverage.unratedSources === 1 ? "source is" : "sources are"
            } shown separately, never as Center.`
          : null}
      </p>

      {compact ? null : (
        <div className="mt-4 border-t border-line pt-4">
          <p className="rule-label">Sources in this story</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {coverage.sources.map((source) => (
              <span
                key={source.sourceId}
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper px-2 py-1 text-[11px] text-ink-soft"
              >
                <BiasChip bias={source.bias} compact />
                {source.sourceName}
                {source.articleCount > 1 ? (
                  <span className="font-mono text-[9px] text-muted">
                    ×{source.articleCount}
                  </span>
                ) : null}
              </span>
            ))}
          </div>
        </div>
      )}

      <p className="mt-4 font-mono text-[8px] uppercase leading-relaxed tracking-wider text-muted/70">
        Outlet-level bias labels from{" "}
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
  );
}
