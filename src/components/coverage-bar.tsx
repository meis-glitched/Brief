import type { BiasCounts } from "@/db/coverage";
import { BIAS_ORDER, BIAS_META, type Bias } from "@/lib/source-ratings";
import { cn } from "@/lib/utils";

export function CoverageBar({
  counts,
  total,
  className,
  height = "h-2",
}: {
  counts: BiasCounts;
  total: number;
  className?: string;
  height?: string;
}) {
  const safeTotal = total > 0 ? total : 1;
  const label = BIAS_ORDER.filter((bias) => counts[bias] > 0)
    .map((bias) => `${BIAS_META[bias].label} ${counts[bias]}`)
    .join(", ");

  return (
    <div
      role="img"
      aria-label={label || "No coverage"}
      className={cn(
        "flex overflow-hidden rounded-full bg-paper-deep",
        height,
        className,
      )}
    >
      {BIAS_ORDER.map((bias) =>
        counts[bias] > 0 ? (
          <span
            key={bias}
            title={`${BIAS_META[bias].label}: ${counts[bias]}`}
            className={cn("h-full", BIAS_META[bias].barClassName)}
            style={{ width: `${(counts[bias] / safeTotal) * 100}%` }}
          />
        ) : null,
      )}
    </div>
  );
}

export function BiasLegend({
  counts,
  total,
  className,
  showZero = false,
}: {
  counts: BiasCounts;
  total: number;
  className?: string;
  showZero?: boolean;
}) {
  return (
    <dl
      className={cn(
        "flex flex-wrap gap-x-4 gap-y-2 font-mono text-[9px] uppercase tracking-wider text-muted",
        className,
      )}
    >
      {BIAS_ORDER.filter((bias) => showZero || counts[bias] > 0).map(
        (bias: Bias) => (
          <div key={bias} className="flex items-center gap-1.5">
            <span
              className={cn("size-2 rounded-full", BIAS_META[bias].barClassName)}
              aria-hidden="true"
            />
            <dt>{BIAS_META[bias].label}</dt>
            <dd className="tabular-nums text-ink-soft">
              {counts[bias]}
              {total > 0 ? (
                <span className="ml-1 text-muted/70">
                  {Math.round((counts[bias] / total) * 100)}%
                </span>
              ) : null}
            </dd>
          </div>
        ),
      )}
    </dl>
  );
}
