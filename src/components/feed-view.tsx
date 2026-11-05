"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { ArticleWithSource } from "@/db/queries";
import { markAllRead, setArticleRead, toggleArticleSaved } from "@/actions";
import {
  ArrowUpRightIcon,
  BookmarkFilledIcon,
  BookmarkIcon,
  CheckIcon,
  ReaderIcon,
  SearchIcon,
  StoriesIcon,
} from "./icons";
import { ArticleImage } from "./article-image";
import { RelativeTime } from "./relative-time";
import { cn } from "@/lib/utils";

type Filter = "all" | "unread" | "saved";

const filters: Array<{ id: Filter; label: string }> = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "saved", label: "Saved" },
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

export function FeedView({
  initialArticles,
  sources,
  initialFilter = "all",
  initialSourceId = "all",
  title = "Every headline.",
  description = "The full wire, deduplicated and ready to skim.",
  showFilterTabs = true,
  filterSlot,
}: {
  initialArticles: ArticleWithSource[];
  sources: Array<{ id: string; name: string; articleCount: number }>;
  initialFilter?: Filter;
  initialSourceId?: string;
  title?: string;
  description?: string;
  showFilterTabs?: boolean;
  filterSlot?: ReactNode;
}) {
  const router = useRouter();
  const [items, setItems] = useState(initialArticles);
  const [filter, setFilter] = useState<Filter>(initialFilter);
  const [sourceId, setSourceId] = useState(initialSourceId);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items.filter((article) => {
      if (filter === "unread" && article.readAt) return false;
      if (filter === "saved" && !article.savedAt) return false;
      if (sourceId !== "all" && article.sourceId !== sourceId) return false;
      if (
        needle &&
        !article.title.toLowerCase().includes(needle) &&
        !(article.summary ?? "").toLowerCase().includes(needle)
      ) {
        return false;
      }
      return true;
    });
  }, [items, filter, sourceId, query]);

  const counts = useMemo(
    () => ({
      all: items.length,
      unread: items.filter((article) => !article.readAt).length,
      saved: items.filter((article) => article.savedAt).length,
    }),
    [items],
  );

  function markRead(id: number, read: boolean) {
    setItems((current) =>
      current.map((article) =>
        article.id === id ? { ...article, readAt: read ? Date.now() : null } : article,
      ),
    );
    startTransition(async () => {
      await setArticleRead(id, read);
    });
  }

  function toggleSaved(id: number) {
    const current = items.find((article) => article.id === id);
    const next = !current?.savedAt;
    setItems((list) =>
      list.map((article) =>
        article.id === id
          ? { ...article, savedAt: next ? Date.now() : null }
          : article,
      ),
    );
    startTransition(async () => {
      await toggleArticleSaved(id);
    });
  }

  function openArticle(article: ArticleWithSource) {
    if (!article.readAt) markRead(article.id, true);
    router.push(`/articles/${article.id}`);
  }

  function openOriginal(article: ArticleWithSource) {
    if (!article.readAt) markRead(article.id, true);
    window.open(article.url, "_blank", "noopener,noreferrer");
  }

  function markEverythingRead() {
    setItems((current) =>
      current.map((article) =>
        article.readAt ? article : { ...article, readAt: Date.now() },
      ),
    );
    startTransition(async () => {
      await markAllRead();
    });
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (isTyping(event.target)) return;
      const current = filtered[activeIndex];
      if (event.key === "j") {
        event.preventDefault();
        setActiveIndex((index) => Math.min(filtered.length - 1, index + 1));
      } else if (event.key === "k") {
        event.preventDefault();
        setActiveIndex((index) => Math.max(0, index - 1));
      } else if (event.key === "Enter" && current) {
        event.preventDefault();
        openArticle(current);
      } else if (event.key === "o" && current) {
        event.preventDefault();
        openOriginal(current);
      } else if (event.key === "s" && current) {
        event.preventDefault();
        toggleSaved(current.id);
      } else if (event.key === "m" && current) {
        event.preventDefault();
        markRead(current.id, !current.readAt);
      } else if (event.key === "v" && current?.storyId) {
        event.preventDefault();
        router.push(`/stories/${current.storyId}`);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-5 border-b border-line pb-5">
        <div>
          <p className="rule-label">The wire</p>
          <h1 className="mt-1 font-display text-4xl leading-none tracking-[-0.02em] text-ink sm:text-5xl">
            {title}
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">{description}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden font-mono text-[9px] uppercase tracking-wider text-muted xl:inline">
            j/k navigate · enter read · o original · s save · m read
          </span>
          <button
            type="button"
            onClick={markEverythingRead}
            className="rounded-full border border-line bg-card px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-ink-soft transition-colors hover:border-accent hover:text-accent"
          >
            Mark all read
          </button>
        </div>
      </header>

      <div className="sticky top-16 z-20 -mx-5 border-b border-line bg-paper/90 px-5 py-3 backdrop-blur lg:-mx-10 lg:px-10">
        <div className="flex flex-wrap items-center gap-2">
          {showFilterTabs ? (
            <div className="flex items-center gap-0.5 rounded-full border border-line bg-card p-1">
              {filters.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setFilter(item.id);
                    setActiveIndex(-1);
                  }}
                  className={cn(
                    "rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors",
                    filter === item.id
                      ? "bg-ink text-paper"
                      : "text-muted hover:text-ink",
                  )}
                >
                  {item.label}
                  <span className="ml-1.5 opacity-60">{counts[item.id]}</span>
                </button>
              ))}
            </div>
          ) : null}

          <label className="relative">
            <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActiveIndex(-1);
              }}
              placeholder="Filter the wire…"
              className="h-8 w-44 rounded-full border border-line bg-card pl-8 pr-3 text-xs text-ink outline-none placeholder:text-muted/70 focus:border-accent/50 sm:w-56"
            />
          </label>

          <select
            value={sourceId}
            onChange={(event) => {
              setSourceId(event.target.value);
              setActiveIndex(-1);
            }}
            className="h-8 max-w-44 rounded-full border border-line bg-card px-3 text-xs text-ink-soft outline-none focus:border-accent/50"
            aria-label="Filter by source"
          >
            <option value="all">All sources</option>
            {sources.map((source) => (
              <option key={source.id} value={source.id}>
                {source.name}
              </option>
            ))}
          </select>

          {filterSlot}

          <span className="ml-auto font-mono text-[9px] uppercase tracking-wider text-muted">
            {filtered.length} shown
          </span>
        </div>
      </div>

      <div>
        {filtered.length ? (
          filtered.map((article, index) => (
            <article
              key={article.id}
              className={cn(
                "wire-row group grid animate-rise grid-cols-[minmax(0,1fr)_auto] gap-4 border-b border-line px-1 py-4 transition-colors",
                activeIndex === index && "bg-accent-soft/45",
              )}
              style={{ animationDelay: `${Math.min(index, 8) * 25}ms` }}
            >
              <div className="flex min-w-0 gap-4">
                {article.imageUrl ? (
                  <ArticleImage
                    url={article.imageUrl}
                    alt=""
                    width={article.imageWidth}
                    height={article.imageHeight}
                    className="hidden h-20 w-28 shrink-0 border border-line sm:block"
                    sizes="112px"
                  />
                ) : null}
                <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
                  <span className={cn(!article.readAt && "text-accent")}>
                    {article.sourceName}
                  </span>
                  <span aria-hidden="true">·</span>
                  <RelativeTime value={article.publishedAt ?? article.fetchedAt} />
                  {article.storyId ? (
                    <>
                      <span aria-hidden="true">·</span>
                      <Link
                        href={`/stories/${article.storyId}`}
                        className="max-w-[240px] truncate text-muted/80 hover:text-accent"
                      >
                        {article.storyTitle ?? "Story"}
                      </Link>
                    </>
                  ) : null}
                </div>
                <Link
                  href={`/articles/${article.id}`}
                  onClick={() => {
                    if (!article.readAt) markRead(article.id, true);
                  }}
                  className="mt-1.5 block"
                >
                  <h2
                    className={cn(
                      "text-pretty font-display text-lg leading-snug transition-colors group-hover:text-accent sm:text-xl",
                      article.readAt ? "text-muted" : "text-ink",
                    )}
                  >
                    {article.title}
                  </h2>
                </Link>
                {article.summary ? (
                  <p className="mt-1 line-clamp-2 max-w-3xl text-sm leading-relaxed text-muted">
                    {article.summary}
                  </p>
                ) : null}
                {article.countryNames ? (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {article.countryNames.split(" · ").map((country) => (
                      <span
                        key={country}
                        className="rounded-full border border-line px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted"
                      >
                        {country}
                      </span>
                    ))}
                  </div>
                ) : null}
                </div>
              </div>

              <div className="flex items-start gap-0.5">
                <Link
                  href={`/articles/${article.id}`}
                  onClick={() => {
                    if (!article.readAt) markRead(article.id, true);
                  }}
                  className="hidden size-8 place-items-center rounded-full text-muted transition-colors hover:bg-card hover:text-accent sm:grid"
                  aria-label="Read in Brief"
                  title="Read in Brief"
                >
                  <ReaderIcon className="size-4" />
                </Link>
                <button
                  type="button"
                  onClick={() => toggleSaved(article.id)}
                  className={cn(
                    "grid size-8 place-items-center rounded-full transition-colors",
                    article.savedAt
                      ? "text-accent"
                      : "text-muted hover:bg-card hover:text-ink",
                  )}
                  aria-label={article.savedAt ? "Remove from saved" : "Save article"}
                  title={article.savedAt ? "Remove from saved" : "Save"}
                >
                  {article.savedAt ? (
                    <BookmarkFilledIcon className="size-4" />
                  ) : (
                    <BookmarkIcon className="size-4" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => markRead(article.id, !article.readAt)}
                  className={cn(
                    "grid size-8 place-items-center rounded-full transition-colors",
                    article.readAt
                      ? "text-green"
                      : "text-muted hover:bg-card hover:text-ink",
                  )}
                  aria-label={article.readAt ? "Mark unread" : "Mark read"}
                  title={article.readAt ? "Mark unread" : "Mark read"}
                >
                  <CheckIcon className="size-4" />
                </button>
                {article.storyId ? (
                  <Link
                    href={`/stories/${article.storyId}`}
                    className="hidden size-8 place-items-center rounded-full text-muted transition-colors hover:bg-card hover:text-accent sm:grid"
                    aria-label="Open story"
                    title="Open story"
                  >
                    <StoriesIcon className="size-4" />
                  </Link>
                ) : null}
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="grid size-8 place-items-center rounded-full text-muted transition-colors hover:bg-card hover:text-accent"
                  aria-label="Open original article"
                  title="Open original"
                >
                  <ArrowUpRightIcon className="size-4" />
                </a>
              </div>
            </article>
          ))
        ) : (
          <div className="py-16 text-center">
            <p className="font-display text-2xl text-ink">Nothing matches.</p>
            <p className="mt-2 text-sm text-muted">
              Try a different filter, source, or word.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
