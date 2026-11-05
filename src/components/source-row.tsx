"use client";

import { useState, useTransition } from "react";
import type { SourceHealth } from "@/db/queries";
import { toggleSource } from "@/actions";
import { BiasChip } from "./bias-chip";
import { RelativeTime } from "./relative-time";
import { cn } from "@/lib/utils";

export function SourceRow({ source }: { source: SourceHealth }) {
  const [enabled, setEnabled] = useState(Boolean(source.enabled));
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !enabled;
    setEnabled(next);
    startTransition(async () => {
      await toggleSource(source.id);
    });
  }

  return (
    <div
      className={cn(
        "grid grid-cols-[12px_minmax(0,1fr)_44px_48px_86px_40px] items-center gap-3 border-b border-line py-4 transition-opacity sm:grid-cols-[12px_minmax(0,1fr)_52px_60px_110px_44px]",
        !enabled && "opacity-45",
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          source.lastError ? "bg-amber" : enabled ? "bg-green" : "bg-muted",
        )}
        aria-hidden="true"
      />
      <div className="min-w-0">
        <p className="truncate text-sm text-ink">{source.name}</p>
        <a
          href={source.homepage}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-0.5 block truncate font-mono text-[9px] uppercase tracking-wider text-muted hover:text-accent"
        >
          {source.homepage.replace(/^https?:\/\//, "")}
        </a>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <BiasChip
            bias={source.bias}
            score={source.biasScore}
            confidence={source.confidence}
          />
          {source.ownership ? (
            <span className="truncate font-mono text-[9px] uppercase tracking-wider text-muted/70">
              {source.ownership}
              {source.countryCode ? ` · ${source.countryCode}` : ""}
              {source.paywall ? " · paywall" : ""}
            </span>
          ) : null}
        </div>
        {source.lastError ? (
          <p className="mt-1 line-clamp-1 text-[11px] text-amber">{source.lastError}</p>
        ) : null}
      </div>
      <span className="font-mono text-[9px] uppercase tracking-wider text-muted">
        {source.feedUrl ? "RSS" : "HTML"}
      </span>
      <span className="font-mono text-[10px] tabular-nums text-ink-soft">
        {source.articleCount}
      </span>
      <span className="font-mono text-[9px] uppercase tracking-wider text-muted">
        {source.lastFetchedAt ? (
          <RelativeTime value={source.lastFetchedAt} />
        ) : (
          "never"
        )}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label={`${enabled ? "Disable" : "Enable"} ${source.name}`}
        onClick={toggle}
        disabled={pending}
        className={cn(
          "relative h-5 w-9 justify-self-end rounded-full border transition-colors",
          enabled ? "border-accent/30 bg-accent" : "border-line bg-paper-deep",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-3.5 rounded-full bg-card shadow-sm transition-transform",
            enabled ? "translate-x-4" : "translate-x-0.5",
          )}
        />
      </button>
    </div>
  );
}
