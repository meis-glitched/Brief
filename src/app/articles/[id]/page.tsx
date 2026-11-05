import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleActions } from "@/components/article-actions";
import { ArticleImage } from "@/components/article-image";
import { BiasChip } from "@/components/bias-chip";
import {
  ArrowLeftIcon,
  ArrowUpRightIcon,
  StoriesIcon,
} from "@/components/icons";
import { ReadOnOpen } from "@/components/read-on-open";
import { ReaderBody } from "@/components/reader-body";
import { RelativeTime } from "@/components/relative-time";
import { getReaderArticle } from "@/db/queries";
import { getReader } from "@/lib/reader";
import { SOURCE_RATINGS_BY_ID } from "@/lib/source-ratings";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STATUS_LABEL = {
  full: "Full text",
  feed: "Feed version",
  summary: "Summary only",
  external: "External",
} as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const articleId = Number(id);
  if (!Number.isInteger(articleId)) return { title: "Article" };
  const article = getReaderArticle(articleId);
  if (!article) return { title: "Article" };
  return {
    title: article.title,
    description: article.summary ?? undefined,
  };
}

export default async function ArticlePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ refresh?: string }>;
}) {
  const { id } = await params;
  const articleId = Number(id);
  if (!Number.isInteger(articleId) || articleId < 1) notFound();

  const article = getReaderArticle(articleId);
  if (!article) notFound();

  const { refresh } = await searchParams;
  const payload = await getReader(
    {
      id: article.id,
      url: article.url,
      title: article.title,
      sourceName: article.sourceName,
      author: article.author,
      summary: article.summary,
      imageUrl: article.imageUrl,
      imageWidth: article.imageWidth,
      imageHeight: article.imageHeight,
      feedContent: article.feedContent,
      resolvedUrl: article.resolvedUrl,
    },
    { force: refresh === "1" },
  );

  const rating = SOURCE_RATINGS_BY_ID.get(article.sourceId);
  const originalUrl = article.resolvedUrl ?? article.url;
  const firstImage = payload.blocks.find((block) => block.type === "image");
  const leadImage =
    payload.leadImageUrl && payload.leadImageUrl !== firstImage?.src
      ? payload.leadImageUrl
      : null;
  const statusLabel = STATUS_LABEL[payload.status];

  return (
    <div className="mx-auto max-w-3xl">
      <ReadOnOpen id={article.id} read={article.readAt !== null} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={article.storyId ? `/stories/${article.storyId}` : "/feed"}
          className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted transition-colors hover:text-accent"
        >
          <ArrowLeftIcon className="size-3.5" />
          {article.storyId ? "Back to coverage" : "Back to the wire"}
        </Link>
        {article.storyId ? (
          <Link
            href={`/stories/${article.storyId}`}
            className="inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider text-muted transition-colors hover:text-accent"
          >
            <StoriesIcon className="size-3.5" />
            Compare sources
          </Link>
        ) : null}
      </div>

      <header className="mt-6 border-b border-line pb-7">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-muted">
          <span className="text-accent">{article.sourceName}</span>
          {rating ? (
            <>
              <BiasChip
                bias={rating.bias}
                score={rating.biasScore}
                confidence={rating.confidence}
              />
              {rating.providerUrl ? (
                <a
                  href={rating.providerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline decoration-line underline-offset-2 transition-colors hover:text-accent"
                  title="AllSides outlet rating"
                >
                  rating
                </a>
              ) : null}
            </>
          ) : null}
          <span aria-hidden="true">·</span>
          <RelativeTime value={article.publishedAt ?? article.fetchedAt} />
          <span aria-hidden="true">·</span>
          <span
            className={cn(
              "rounded-full border px-2 py-0.5",
              payload.status === "full"
                ? "border-green/30 bg-green/10 text-green"
                : "border-line bg-card text-muted",
            )}
          >
            {statusLabel}
          </span>
          {payload.wordCount ? (
            <>
              <span aria-hidden="true">·</span>
              <span>{payload.wordCount.toLocaleString()} words</span>
            </>
          ) : null}
        </div>

        <h1 className="mt-3 text-balance font-display text-4xl leading-[1.04] tracking-[-0.025em] text-ink sm:text-5xl">
          {payload.title ?? article.title}
        </h1>
        {payload.byline ? (
          <p className="mt-3 text-sm text-muted">By {payload.byline}</p>
        ) : null}
        {payload.excerpt && payload.excerpt !== payload.title ? (
          <p className="mt-4 max-w-2xl text-pretty text-[15px] leading-7 text-ink-soft">
            {payload.excerpt}
          </p>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={originalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-ink-soft transition-colors hover:border-accent hover:text-accent"
            >
              Read original
              <ArrowUpRightIcon className="size-3.5" />
            </a>
            {payload.status !== "full" ? (
              <Link
                href={`/articles/${article.id}?refresh=1`}
                className="font-mono text-[10px] uppercase tracking-wider text-muted transition-colors hover:text-accent"
              >
                Refresh extraction
              </Link>
            ) : null}
          </div>
          <ArticleActions
            id={article.id}
            url={originalUrl}
            savedAt={article.savedAt}
            readAt={article.readAt}
          />
        </div>
      </header>

      {leadImage ? (
        <div className="mt-7">
          <ArticleImage
            url={leadImage}
            alt={payload.title ?? article.title}
            width={article.imageWidth}
            height={article.imageHeight}
            className="aspect-[16/9] w-full border border-line"
            priority
            sizes="(min-width: 1024px) 768px, 100vw"
          />
        </div>
      ) : null}

      {payload.error ? (
        <div className="mt-6 rounded-lg border border-line bg-card px-4 py-3 text-sm leading-relaxed text-muted">
          <span className="font-mono text-[9px] uppercase tracking-wider text-accent">
            Reader note
          </span>
          <p className="mt-1">{payload.error}</p>
          {payload.status !== "full" ? (
            <p className="mt-2 text-xs text-muted/80">
              Brief never bypasses paywalls. The original publisher link is
              above.
            </p>
          ) : null}
        </div>
      ) : null}

      <ReaderBody blocks={payload.blocks} />

      <footer className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5">
        <p className="max-w-md text-xs leading-relaxed text-muted">
          Read in Brief. Images and text belong to the original publisher.
        </p>
        <a
          href={originalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted transition-colors hover:text-accent"
        >
          Open at {payload.siteName ?? article.sourceName}
          <ArrowUpRightIcon className="size-3.5" />
        </a>
      </footer>
    </div>
  );
}
