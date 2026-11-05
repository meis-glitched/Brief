import { BIAS_META, type Bias } from "@/lib/source-ratings";
import { cn } from "@/lib/utils";

export function BiasChip({
  bias,
  score = null,
  confidence,
  className,
  compact = false,
}: {
  bias: Bias;
  score?: number | null;
  confidence?: string;
  className?: string;
  compact?: boolean;
}) {
  const meta = BIAS_META[bias];
  const title = [
    meta.label,
    score !== null ? `AllSides meter ${score > 0 ? `+${score}` : score}` : null,
    confidence && confidence !== "none" ? `${confidence} confidence` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider",
        meta.className,
        className,
      )}
    >
      {compact ? meta.short : meta.label}
    </span>
  );
}
