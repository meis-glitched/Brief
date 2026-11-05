"use client";

import { useState, useTransition } from "react";
import { ingestNow } from "@/actions";
import { RefreshIcon } from "./icons";
import { cn } from "@/lib/utils";

export function RefreshButton({ compact = false }: { compact?: boolean }) {
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState(false);

  function run() {
    setStatus(null);
    setError(false);
    startTransition(async () => {
      try {
        const result = await ingestNow();
        setStatus(result.inserted > 0 ? `+${result.inserted}` : "fresh");
        if (result.errorCount > 0) setError(true);
        window.setTimeout(() => setStatus(null), 4000);
      } catch {
        setError(true);
        setStatus("failed");
        window.setTimeout(() => setStatus(null), 4000);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={run}
      disabled={pending}
      className={cn(
        "flex h-9 items-center gap-2 rounded-full border border-line bg-card px-3 text-xs text-ink-soft transition-colors hover:text-ink disabled:opacity-60",
        compact && "w-9 justify-center px-0",
      )}
      aria-label="Fetch new headlines"
      title="Fetch new headlines"
    >
      <RefreshIcon className={cn("size-4", pending && "animate-spin")} />
      {!compact ? (
        <span className="font-mono text-[10px] uppercase tracking-wider">
          {pending ? "Fetching" : status ?? "Fetch"}
        </span>
      ) : null}
      {error && !compact ? (
        <span className="size-1.5 rounded-full bg-amber" aria-hidden="true" />
      ) : null}
    </button>
  );
}
