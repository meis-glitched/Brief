"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-lg py-16">
      <p className="rule-label">Something broke</p>
      <h1 className="mt-2 font-display text-4xl text-ink">The desk jammed.</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        {error.message || "An unexpected error stopped this page from rendering."}
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-full border border-line bg-card px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-ink-soft transition-colors hover:border-accent hover:text-accent"
      >
        Try again
      </button>
    </div>
  );
}
