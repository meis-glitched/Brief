import Link from "next/link";
import type { SourceHealth } from "@/db/queries";
import type { IngestRun } from "@/db/schema";
import { cn } from "@/lib/utils";
import { RelativeTime } from "./relative-time";

export function SourcePulse({
  sources,
  lastRun,
}: {
  sources: SourceHealth[];
  lastRun: IngestRun | null;
}) {
  const healthy = sources.filter((source) => !source.lastError).length;
  const failing = sources.length - healthy;

  return (
    <section className="card rounded-xl p-5">
      <div className="flex items-center justify-between border-b border-line pb-3">
        <p className="rule-label">Source pulse</p>
        <Link href="/sources" className="text-[11px] text-muted hover:text-accent">
          All sources
        </Link>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="font-display text-3xl leading-none text-ink">{healthy}</span>
        <span className="text-xs text-muted">of {sources.length} feeds healthy</span>
        {failing > 0 ? (
          <span className="ml-auto font-mono text-[9px] uppercase tracking-wider text-amber">
            {failing} failing
          </span>
        ) : null}
      </div>

      <ul className="mt-4 space-y-2.5">
        {sources.slice(0, 6).map((source) => (
          <li key={source.id} className="flex items-center gap-2 text-xs">
            <span
              className={cn(
                "size-1.5 shrink-0 rounded-full",
                source.lastError ? "bg-amber" : "bg-green",
              )}
              aria-hidden="true"
            />
            <span className="truncate text-ink-soft">{source.name}</span>
            <span className="ml-auto font-mono text-[9px] tabular-nums text-muted">
              {source.articleCount}
            </span>
          </li>
        ))}
      </ul>

      {lastRun ? (
        <p className="mt-4 border-t border-line pt-3 font-mono text-[9px] uppercase tracking-wider text-muted">
          Last fetch{" "}
          <RelativeTime value={lastRun.finishedAt ?? lastRun.startedAt} /> ·{" "}
          {lastRun.inserted} new
        </p>
      ) : (
        <p className="mt-4 border-t border-line pt-3 font-mono text-[9px] uppercase tracking-wider text-muted">
          No fetch yet
        </p>
      )}
    </section>
  );
}
