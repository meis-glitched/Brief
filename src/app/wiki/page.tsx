import Link from "next/link";
import { ArticleImage } from "@/components/article-image";
import { ArrowUpRightIcon, SearchIcon } from "@/components/icons";
import { searchWiki } from "@/lib/wiki";
import { wikiHref } from "@/lib/wiki-links";

export const dynamic = "force-dynamic";

const SUGGESTIONS = ["James Webb Space Telescope", "Treaty of Westphalia", "Chandrayaan-3"];

export default async function WikiSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const results = query ? await searchWiki(query, 20) : [];

  return (
    <div className="mx-auto max-w-4xl">
      <header className="border-b border-line pb-7">
        <p className="rule-label">Reference desk</p>
        <h1 className="mt-1 text-balance font-display text-4xl leading-none tracking-[-0.02em] text-ink sm:text-5xl">
          Look it up.
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
          Search Wikipedia without leaving the desk. Pages and lead images are
          cached locally when available; if Wikipedia is slow or unreachable,
          cached results are used and licenses stay attached to every file.
        </p>

        <form action="/wiki" method="get" className="mt-5 flex max-w-2xl gap-2">
          <label className="relative flex-1">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Search Wikipedia…"
              className="h-10 w-full rounded-full border border-line bg-card pl-9 pr-4 text-sm text-ink outline-none placeholder:text-muted/70 focus:border-accent/50"
            />
          </label>
          <button
            type="submit"
            className="rounded-full border border-line bg-ink px-4 font-mono text-[10px] uppercase tracking-wider text-paper transition-opacity hover:opacity-85"
          >
            Search
          </button>
        </form>
      </header>

      {query ? (
        <section className="mt-2" aria-label="Wikipedia results">
          <div className="flex items-center justify-between border-b border-line py-3">
            <p className="font-mono text-[9px] uppercase tracking-wider text-muted">
              {results.length} results
            </p>
            <a
              href={`https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(query)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider text-muted transition-colors hover:text-accent"
            >
              Search on Wikipedia
              <ArrowUpRightIcon className="size-3.5" />
            </a>
          </div>

          {results.length ? (
            results.map((result) => (
              <article
                key={result.pageId}
                className="group flex animate-rise gap-4 border-b border-line py-4"
              >
                {result.thumbnailUrl ? (
                  <ArticleImage
                    url={result.thumbnailUrl}
                    alt=""
                    className="hidden h-16 w-20 shrink-0 border border-line sm:block"
                    sizes="80px"
                  />
                ) : null}
                <div className="min-w-0 flex-1">
                  <Link
                    href={wikiHref(result.title)}
                    className="font-display text-xl leading-snug text-ink transition-colors group-hover:text-accent"
                  >
                    {result.title}
                  </Link>
                  {result.summary ? (
                    <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-muted">
                      {result.summary}
                    </p>
                  ) : null}
                </div>
                <a
                  href={result.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="grid size-8 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-card hover:text-accent"
                  aria-label={`Open ${result.title} on Wikipedia`}
                  title="Open on Wikipedia"
                >
                  <ArrowUpRightIcon className="size-4" />
                </a>
              </article>
            ))
          ) : (
            <div className="py-14 text-center">
              <p className="font-display text-2xl text-ink">No pages found.</p>
              <p className="mt-2 text-sm text-muted">
                Try a broader name or the full title.
              </p>
            </div>
          )}
        </section>
      ) : (
        <section className="mt-8">
          <p className="rule-label">Try a search</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {SUGGESTIONS.map((suggestion) => (
              <Link
                key={suggestion}
                href={`/wiki?q=${encodeURIComponent(suggestion)}`}
                className="rounded-full border border-line bg-card px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-muted transition-colors hover:border-accent hover:text-accent"
              >
                {suggestion}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
