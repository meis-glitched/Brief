"use client";

import { useState, useTransition } from "react";
import { refreshBrief } from "@/actions";
import { RelativeTime } from "./relative-time";
import { BriefMarkdown } from "./brief-markdown";
import { cn } from "@/lib/utils";

type BriefState = {
  content: string;
  model: string | null;
  createdAt: number;
} | null;

export function BriefPanel({ brief }: { brief: BriefState }) {
  const [state, setState] = useState<BriefState>(brief);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(false);

  function generate() {
    setError(false);
    startTransition(async () => {
      try {
        const result = await refreshBrief();
        setState({
          content: result.content,
          model: result.model,
          createdAt: result.createdAt,
        });
      } catch {
        setError(true);
      }
    });
  }

  return (
    <section className="card rounded-xl p-5">
      <div className="flex items-start justify-between gap-4 border-b border-line pb-3">
        <div>
          <p className="rule-label">The Brief</p>
          <h2 className="mt-1 font-display text-2xl leading-none text-ink">
            Today, in hand.
          </h2>
        </div>
        <button
          type="button"
          onClick={generate}
          disabled={pending}
          className={cn(
            "shrink-0 rounded-full border border-line px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-colors",
            pending
              ? "cursor-wait text-muted"
              : "text-ink-soft hover:border-accent hover:text-accent",
          )}
        >
          {pending ? "Writing" : state ? "Rewrite" : "Compose"}
        </button>
      </div>

      <div className="mt-4">
        {pending && !state ? (
          <div className="space-y-3">
            <div className="skeleton h-4 w-full rounded" />
            <div className="skeleton h-4 w-11/12 rounded" />
            <div className="skeleton h-4 w-4/5 rounded" />
            <div className="skeleton h-4 w-10/12 rounded" />
          </div>
        ) : state ? (
          <BriefMarkdown content={state.content} />
        ) : (
          <div className="py-2">
            <p className="font-display text-lg leading-snug text-ink">
              No brief yet.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Compose a local edit from today&apos;s stories. It runs against your
              Ollama model and falls back to a deterministic desk summary if the
              model is offline or too slow.
            </p>
          </div>
        )}
      </div>

      {error ? (
        <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-amber">
          The brief could not be written. Check logs/server output and try again.
        </p>
      ) : null}

      {state ? (
        <div className="mt-4 flex items-center gap-2 border-t border-line pt-3 font-mono text-[9px] uppercase tracking-wider text-muted">
          <span>{state.model === "fallback" ? "Local fallback" : state.model}</span>
          <span aria-hidden="true">·</span>
          <RelativeTime value={state.createdAt} />
          {state.model === "fallback" ? (
            <span className="ml-auto text-amber">model offline</span>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
