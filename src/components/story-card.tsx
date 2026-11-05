import Link from "next/link";
import type { StoryWithSources } from "@/db/queries";
import { ArticleImage } from "./article-image";
import { RelativeTime } from "./relative-time";
import { ArrowUpRightIcon } from "./icons";

function sourceList(story: StoryWithSources): string[] {
  return (story.sourceNames ?? "")
    .split(" · ")
    .map((source) => source.trim())
    .filter(Boolean);
}

function Meta({ story, lead = false }: { story: StoryWithSources; lead?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[9px] uppercase tracking-[0.16em] text-muted">
      {lead ? (
        <span className="inline-flex items-center gap-1.5 text-accent">
          <span className="size-1.5 rounded-full bg-accent" />
          Lead story
        </span>
      ) : null}
      <span>{story.sourceCount} sources</span>
      <span aria-hidden="true">·</span>
      <span>{story.articleCount} articles</span>
      <span aria-hidden="true">·</span>
      <RelativeTime value={story.lastSeen} />
    </div>
  );
}

export function LeadStory({ story }: { story: StoryWithSources }) {
  const sources = sourceList(story);

  return (
    <article className="animate-rise border-b border-line pb-8">
      <Meta story={story} lead />
      <Link href={`/stories/${story.id}`} className="group block">
        <h2 className="mt-3 text-balance font-display text-4xl leading-[1.02] tracking-[-0.02em] text-ink transition-colors group-hover:text-accent sm:text-5xl">
          {story.title}
        </h2>
      </Link>
      {story.summary ? (
        <p className="mt-4 max-w-2xl text-pretty text-[15px] leading-7 text-ink-soft">
          {story.summary}
        </p>
      ) : null}
      {story.imageUrl ? (
        <Link href={`/stories/${story.id}`} className="mt-5 block">
          <ArticleImage
            url={story.imageUrl}
            alt={story.title}
            className="aspect-[16/9] w-full border border-line"
            sizes="(min-width: 1024px) 720px, 100vw"
            priority
          />
        </Link>
      ) : null}
      {sources.length ? (
        <div className="mt-5 flex flex-wrap gap-1.5">
          {sources.slice(0, 8).map((source) => (
            <span
              key={source}
              className="rounded-full border border-line bg-card px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted"
            >
              {source}
            </span>
          ))}
        </div>
      ) : null}
      <Link
        href={`/stories/${story.id}`}
        className="mt-5 inline-flex items-center gap-1.5 text-xs text-accent transition-opacity hover:opacity-75"
      >
        Read the coverage
        <ArrowUpRightIcon className="size-3.5" />
      </Link>
    </article>
  );
}

export function StoryRow({
  story,
  index,
}: {
  story: StoryWithSources;
  index: number;
}) {
  return (
    <Link
      href={`/stories/${story.id}`}
      className="group grid animate-rise grid-cols-[28px_minmax(0,1fr)] gap-4 border-b border-line py-5 transition-colors hover:border-accent/40"
      style={{ animationDelay: `${Math.min(index, 8) * 35}ms` }}
    >
      <span className="pt-0.5 font-mono text-[10px] tabular-nums text-muted/60">
        {String(index + 1).padStart(2, "0")}
      </span>
      <div className="flex min-w-0 gap-4">
        <div className="min-w-0">
          <Meta story={story} />
          <h3 className="mt-1.5 text-pretty font-display text-xl leading-snug text-ink transition-colors group-hover:text-accent sm:text-2xl">
            {story.title}
          </h3>
          {story.sourceNames ? (
            <p className="mt-1 line-clamp-1 text-xs text-muted">{story.sourceNames}</p>
          ) : null}
        </div>
        {story.imageUrl ? (
          <ArticleImage
            url={story.imageUrl}
            alt=""
            className="hidden h-20 w-28 shrink-0 border border-line sm:block"
            sizes="112px"
          />
        ) : null}
      </div>
    </Link>
  );
}
