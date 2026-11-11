import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleActions } from "@/components/article-actions";
import { ArticleImage } from "@/components/article-image";
import { BiasChip } from "@/components/bias-chip";
import { CoveragePanel } from "@/components/coverage-panel";
import { ArrowLeftIcon, ReaderIcon } from "@/components/icons";
import { RelativeTime } from "@/components/relative-time";
import { getStoryCoverage } from "@/db/coverage";
import { getStory } from "@/db/queries";

export const dynamic = "force-dynamic";

export default async function StoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const storyId = Number(id);
  if (!Number.isInteger(storyId)) notFound();

  const data = await getStory(storyId);
  if (!data) notFound();

  const { story, articles } = data;
  const coverage = await getStoryCoverage(storyId);
  const sourceBias = new Map(
    coverage?.sources.map((source) => [source.sourceId, source.bias]) ?? [],
  );
  const counts = new Map<string, number>();
  for (const article of articles) {
    counts.set(article.sourceName, (counts.get(article.sourceName) ?? 0) + 1);
  }
  const sources = [...counts.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/stories"
        className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted transition-colors hover:text-accent"
      >
        <ArrowLeftIcon className="size-3.5" />
        All stories
      </Link>

      <header className="mt-6 border-b border-line pb-8">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[9px] uppercase tracking-[0.16em] text-muted">
          <span className="text-accent">{story.sourceCount} sources</span>
          <span aria-hidden="true">·</span>
          <span>{story.articleCount} articles</span>
          <span aria-hidden="true">·</span>
          <span>
            first seen <RelativeTime value={story.firstSeen} />
          </span>
          <span aria-hidden="true">·</span>
          <span>
            updated <RelativeTime value={story.lastSeen} />
          </span>
        </div>
        <h1 className="mt-3 text-balance font-display text-4xl leading-[1.02] tracking-[-0.025em] text-ink sm:text-5xl">
          {story.title}
        </h1>
        {story.summary ? (
          <p className="mt-4 max-w-2xl text-pretty text-[15px] leading-7 text-ink-soft">
            {story.summary}
          </p>
        ) : null}
        <div className="mt-5 flex flex-wrap gap-1.5">
          {sources.map(([source, count]) => (
            <span
              key={source}
              className="rounded-full border border-line bg-card px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted"
            >
              {source}
              {count > 1 ? ` ×${count}` : ""}
            </span>
          ))}
        </div>
      </header>

      {coverage ? (
        <div className="mt-6">
          <CoveragePanel coverage={coverage} />
        </div>
      ) : null}

      <section className="mt-8" aria-label="Coverage">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <p className="rule-label">Coverage</p>
          <span className="font-mono text-[9px] uppercase tracking-wider text-muted">
            {articles.length} articles
          </span>
        </div>

        {articles.map((article) => (
          <article
            key={article.id}
            className="grid animate-rise grid-cols-[minmax(0,1fr)_auto] gap-4 border-b border-line py-5"
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
                <span className={article.readAt ? "" : "text-accent"}>
                  {article.sourceName}
                </span>
                {sourceBias.get(article.sourceId) ? (
                  <BiasChip
                    bias={sourceBias.get(article.sourceId)!}
                    compact
                  />
                ) : null}
                <span aria-hidden="true">·</span>
                <RelativeTime value={article.publishedAt ?? article.fetchedAt} />
                {article.author ? (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="max-w-[220px] truncate">{article.author}</span>
                  </>
                ) : null}
              </div>
              <Link
                href={`/articles/${article.id}`}
                className="group mt-1.5 flex items-start gap-2"
              >
                <h2 className="text-pretty font-display text-xl leading-snug text-ink transition-colors group-hover:text-accent">
                  {article.title}
                </h2>
                <ReaderIcon className="mt-1 size-3.5 shrink-0 text-muted opacity-0 transition-opacity group-hover:opacity-100" />
              </Link>
              {article.summary ? (
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
                  {article.summary}
                </p>
              ) : null}
              </div>
            </div>
            <ArticleActions
              id={article.id}
              url={article.url}
              savedAt={article.savedAt}
              readAt={article.readAt}
            />
          </article>
        ))}
      </section>

      <div className="mt-8 flex items-center justify-between">
        <Link
          href="/stories"
          className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted transition-colors hover:text-accent"
        >
          <ArrowLeftIcon className="size-3.5" />
          All stories
        </Link>
        <Link
          href="/feed"
          className="font-mono text-[10px] uppercase tracking-wider text-muted transition-colors hover:text-accent"
        >
          Open the wire
        </Link>
      </div>
    </div>
  );
}
