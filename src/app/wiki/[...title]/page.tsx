import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleImage } from "@/components/article-image";
import { ArrowLeftIcon, ArrowUpRightIcon } from "@/components/icons";
import { aspectRatio } from "@/lib/images";
import { loadWikiPage } from "@/lib/wiki";

export const dynamic = "force-dynamic";

function decodeSegments(segments: string[]): string {
  return segments
    .map((segment) => {
      try {
        return decodeURIComponent(segment);
      } catch {
        return segment;
      }
    })
    .join("/");
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ title: string[] }>;
}): Promise<Metadata> {
  const { title } = await params;
  const page = await loadWikiPage(decodeSegments(title));
  return {
    title: page?.title ?? "Wikipedia",
    description: page?.summary ?? undefined,
  };
}

function LicenseLine({
  license,
  licenseUrl,
  artist,
  filePageUrl,
  nonFree,
}: {
  license: string | null;
  licenseUrl: string | null;
  artist: string | null;
  filePageUrl: string | null;
  nonFree: boolean;
}) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-relaxed text-muted">
      {artist ? <span>{artist}</span> : null}
      {license ? (
        licenseUrl ? (
          <a
            href={licenseUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-line underline-offset-2 hover:text-accent"
          >
            {license}
          </a>
        ) : (
          <span>{license}</span>
        )
      ) : null}
      {nonFree ? (
        <span className="rounded-full border border-[#a8422e]/25 bg-[#a8422e]/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-[#943826] dark:border-[#e08a6f]/25 dark:bg-[#e08a6f]/15 dark:text-[#eaa78f]">
          Non-free
        </span>
      ) : null}
      {filePageUrl ? (
        <a
          href={filePageUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-[9px] uppercase tracking-wider underline decoration-line underline-offset-2 hover:text-accent"
        >
          File page
        </a>
      ) : null}
    </div>
  );
}

export default async function WikiPage({
  params,
}: {
  params: Promise<{ title: string[] }>;
}) {
  const { title } = await params;
  const page = await loadWikiPage(decodeSegments(title));
  if (!page) notFound();

  const paragraphs = (page.extract ?? page.summary ?? "")
    .split(/\n+/)
    .map((part) => part.trim())
    .filter(Boolean);

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/wiki"
        className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted transition-colors hover:text-accent"
      >
        <ArrowLeftIcon className="size-3.5" />
        Reference desk
      </Link>

      <header className="mt-6 border-b border-line pb-7">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[9px] uppercase tracking-[0.16em] text-muted">
          <span className="text-accent">Wikipedia</span>
          <span aria-hidden="true">·</span>
          <span>Page {page.pageId}</span>
          {page.leadImageNonFree ? (
            <>
              <span aria-hidden="true">·</span>
              <span>Includes non-free media</span>
            </>
          ) : null}
        </div>
        <h1 className="mt-3 text-balance font-display text-4xl leading-[1.04] tracking-[-0.025em] text-ink sm:text-5xl">
          {page.title}
        </h1>
        {page.summary ? (
          <p className="mt-4 max-w-3xl text-pretty text-[15px] leading-7 text-ink-soft">
            {page.summary}
          </p>
        ) : null}
        <a
          href={page.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-ink-soft transition-colors hover:border-accent hover:text-accent"
        >
          Open on Wikipedia
          <ArrowUpRightIcon className="size-3.5" />
        </a>
      </header>

      {page.leadImageUrl ? (
        <figure className="mt-7">
          <ArticleImage
            url={page.leadImageUrl}
            alt={page.title}
            width={page.leadImageWidth}
            height={page.leadImageHeight}
            className="w-full border border-line bg-paper-deep/60"
            imageClassName="object-contain"
            sizes="(min-width: 1024px) 896px, 100vw"
            priority
            style={{
              aspectRatio: aspectRatio(page.leadImageWidth, page.leadImageHeight),
            }}
          />
          <figcaption>
            <LicenseLine
              license={page.leadImageLicense}
              licenseUrl={page.leadImageLicenseUrl}
              artist={page.leadImageArtist}
              filePageUrl={page.leadImageFilePage}
              nonFree={Boolean(page.leadImageNonFree)}
            />
          </figcaption>
        </figure>
      ) : null}

      <article className="mt-8">
        {paragraphs.length ? (
          paragraphs.map((paragraph, index) => (
            <p
              key={index}
              className="mb-5 text-pretty text-[17px] leading-8 text-ink-soft"
            >
              {paragraph}
            </p>
          ))
        ) : (
          <p className="text-sm text-muted">No summary is cached for this page.</p>
        )}
      </article>

      {page.images.length ? (
        <section className="mt-12 border-t border-line pt-7" aria-label="Images">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="rule-label">Images</p>
              <p className="mt-1 text-sm text-muted">
                Media from the article. Licenses and file pages are shown for
                each image.
              </p>
            </div>
            <span className="font-mono text-[9px] uppercase tracking-wider text-muted">
              {page.images.length}
            </span>
          </div>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            {page.images.map((image) => (
              <figure
                key={image.id}
                className="rounded-lg border border-line bg-card p-3"
              >
                <ArticleImage
                  url={image.thumbUrl ?? image.url}
                  alt={image.caption ?? page.title}
                  width={image.width}
                  height={image.height}
                  className="w-full bg-paper-deep/60"
                  imageClassName="object-contain"
                  sizes="(min-width: 640px) 400px, 100vw"
                  style={{ aspectRatio: aspectRatio(image.width, image.height) }}
                />
                <figcaption>
                  {image.caption ? (
                    <p className="mt-2 text-xs leading-relaxed text-ink-soft">
                      {image.caption}
                    </p>
                  ) : null}
                  <LicenseLine
                    license={image.license}
                    licenseUrl={image.licenseUrl}
                    artist={image.artist}
                    filePageUrl={image.filePageUrl}
                    nonFree={Boolean(image.nonFree)}
                  />
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      ) : null}

      <footer className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5">
        <p className="max-w-md text-xs leading-relaxed text-muted">
          Text and media from Wikipedia, available under its applicable
          licenses. Non-free files are labeled and link to their file pages.
        </p>
        <a
          href={page.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted transition-colors hover:text-accent"
        >
          Wikipedia
          <ArrowUpRightIcon className="size-3.5" />
        </a>
      </footer>
    </div>
  );
}
