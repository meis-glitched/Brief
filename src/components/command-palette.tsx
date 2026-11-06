"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowUpRightIcon,
  BiasIcon,
  CommandIcon,
  HistoryIcon,
  ReaderIcon,
  SavedIcon,
  SearchIcon,
  SourcesIcon,
  StoriesIcon,
  TodayIcon,
  WireIcon,
} from "./icons";
import { cn } from "@/lib/utils";

type Result = {
  type: "story" | "article" | "wiki";
  id: number;
  title: string;
  subtitle: string;
  href: string;
};

const commands = [
  { title: "Today", subtitle: "The day, edited", href: "/", icon: TodayIcon },
  { title: "Stories", subtitle: "Clustered coverage", href: "/stories", icon: StoriesIcon },
  { title: "The wire", subtitle: "Every headline", href: "/feed", icon: WireIcon },
  { title: "History", subtitle: "The long record", href: "/history", icon: HistoryIcon },
  { title: "Wiki", subtitle: "Reference desk", href: "/wiki", icon: ReaderIcon },
  { title: "Blindspot", subtitle: "What the desk is missing", href: "/blindspot", icon: BiasIcon },
  { title: "My news bias", subtitle: "How you read", href: "/my-bias", icon: BiasIcon },
  { title: "Saved", subtitle: "Your reading list", href: "/saved", icon: SavedIcon },
  { title: "Sources", subtitle: "Feed health", href: "/sources", icon: SourcesIcon },
];

function isTyping(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  if (!element) return false;
  return (
    element.tagName === "INPUT" ||
    element.tagName === "TEXTAREA" ||
    element.tagName === "SELECT" ||
    element.isContentEditable
  );
}

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastG = useRef(0);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setResults([]);
    setActive(0);
  }, []);

  const choose = useCallback(
    (href: string) => {
      close();
      if (href.startsWith("/")) router.push(href);
      else window.open(href, "_blank", "noopener,noreferrer");
    },
    [close, router],
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const typing = isTyping(event.target);

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
        return;
      }

      if (!open && !typing && event.key === "/") {
        event.preventDefault();
        setOpen(true);
        return;
      }

      if (!open && !typing && event.key === "?") {
        event.preventDefault();
        setOpen(true);
        return;
      }

      if (!open && !typing && event.key.toLowerCase() === "g") {
        lastG.current = Date.now();
        return;
      }

      if (
        !open &&
        !typing &&
        Date.now() - lastG.current < 900 &&
        ["t", "s", "f", "h", "w", "b", "m", "v", "r"].includes(
          event.key.toLowerCase(),
        )
      ) {
        const routes: Record<string, string> = {
          t: "/",
          s: "/stories",
          f: "/feed",
          h: "/history",
          w: "/wiki",
          b: "/blindspot",
          m: "/my-bias",
          v: "/saved",
          r: "/sources",
        };
        event.preventDefault();
        lastG.current = 0;
        router.push(routes[event.key.toLowerCase()]);
        return;
      }

      if (!open) return;

      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }

      const total = query.trim().length >= 2 ? results.length : commands.length;
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActive((value) => (total ? (value + 1) % total : 0));
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setActive((value) => (total ? (value - 1 + total) % total : 0));
      } else if (event.key === "Enter") {
        event.preventDefault();
        if (query.trim().length >= 2 && results[active]) {
          choose(results[active].href);
        } else if (commands[active]) {
          choose(commands[active].href);
        }
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, query, results, active, choose, close, router]);

  useEffect(() => {
    function openSearch() {
      setOpen(true);
    }
    window.addEventListener("brief:open-search", openSearch);
    return () => window.removeEventListener("brief:open-search", openSearch);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => {
      document.body.style.overflow = previous;
      window.clearTimeout(timer);
    };
  }, [open]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!open || trimmed.length < 2) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setResults([]);
      setLoading(true);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("search failed");
        const payload = (await response.json()) as { results: Result[] };
        setResults(payload.results);
        setActive(0);
      } catch (error) {
        if ((error as Error).name !== "AbortError") setResults([]);
      } finally {
        setLoading(false);
      }
    }, 140);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [open, query]);

  const showCommands = query.trim().length < 2;
  const total = showCommands ? commands.length : results.length;

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[10vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default bg-ink/35 backdrop-blur-[3px]"
            onClick={close}
            aria-label="Close search"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Search and jump"
            className="relative w-full max-w-2xl overflow-hidden rounded-xl border border-line bg-card shadow-2xl"
            initial={{ opacity: 0, y: -8, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.99 }}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
          >
            <div className="flex items-center gap-3 border-b border-line px-4 py-3">
              <SearchIcon className="size-4 text-muted" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActive(0);
                }}
                placeholder="Search the desk, or type a command…"
                className="h-8 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-muted/70"
                autoComplete="off"
                spellCheck={false}
              />
              <kbd className="rounded border border-line px-1.5 py-0.5 font-mono text-[10px] text-muted">
                esc
              </kbd>
            </div>

            <div className="max-h-[52vh] overflow-y-auto p-2">
              {showCommands ? (
                <div>
                  <p className="px-3 py-2 rule-label">Jump to</p>
                  {commands.map((command, index) => {
                    const Icon = command.icon;
                    return (
                      <button
                        key={command.href}
                        type="button"
                        onMouseEnter={() => setActive(index)}
                        onClick={() => choose(command.href)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                          active === index ? "bg-accent-soft" : "hover:bg-paper-deep/60",
                        )}
                      >
                        <Icon className="size-4 text-muted" />
                        <span className="flex-1">
                          <span className="block text-sm text-ink">{command.title}</span>
                          <span className="block text-xs text-muted">{command.subtitle}</span>
                        </span>
                        <span className="font-mono text-[10px] text-muted/70">
                          {command.href === "/" ? "G T" : ""}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : loading ? (
                <div className="space-y-2 p-2">
                  {[0, 1, 2].map((item) => (
                    <div key={item} className="flex items-center gap-3 px-3 py-2">
                      <div className="skeleton size-8 rounded-md" />
                      <div className="flex-1 space-y-2">
                        <div className="skeleton h-3 w-2/3 rounded" />
                        <div className="skeleton h-2 w-1/3 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : results.length ? (
                <div>
                  <p className="px-3 py-2 rule-label">
                    {results.length} result{results.length === 1 ? "" : "s"}
                  </p>
                  {results.map((result, index) => (
                    <button
                      key={`${result.type}-${result.id}-${index}`}
                      type="button"
                      onMouseEnter={() => setActive(index)}
                      onClick={() => choose(result.href)}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                        active === index ? "bg-accent-soft" : "hover:bg-paper-deep/60",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 rounded px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider",
                          result.type === "story"
                            ? "bg-accent/10 text-accent"
                            : result.type === "wiki"
                              ? "bg-ink/5 text-ink-soft"
                              : "bg-paper-deep text-muted",
                        )}
                      >
                        {result.type}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-ink">{result.title}</span>
                        <span className="mt-0.5 block truncate text-xs text-muted">
                          {result.subtitle}
                        </span>
                      </span>
                      <ArrowUpRightIcon className="mt-0.5 size-3.5 shrink-0 text-muted" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="px-3 py-10 text-center">
                  <p className="font-display text-xl text-ink">Nothing on the desk.</p>
                  <p className="mt-1 text-sm text-muted">
                    Try a broader word, or run a fetch to bring in fresh copy.
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-4 border-t border-line px-4 py-2.5 font-mono text-[10px] text-muted">
              <span className="flex items-center gap-1.5">
                <CommandIcon className="size-3" /> K
              </span>
              <span>↑↓ navigate</span>
              <span>↵ open</span>
              <span className="ml-auto hidden sm:inline">
                G T / S / F / H / W / B / M / V / R
              </span>
              {total === 0 && !showCommands ? <span>no matches</span> : null}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
