import { search } from "@/db/queries";
import { searchWiki } from "@/lib/wiki";
import { wikiHref } from "@/lib/wiki-links";
import { logError } from "@/lib/logger";

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(fallback), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch(() => {
        clearTimeout(timer);
        resolve(fallback);
      });
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";
  if (!query) return Response.json({ results: [] });
  try {
    const local = await search(query, 8);
    const wiki = await withTimeout(searchWiki(query, 4), 3_000, []);

    return Response.json({
      results: [
        ...local,
        ...wiki.map((result) => ({
          type: "wiki" as const,
          id: result.pageId,
          title: result.title,
          subtitle: result.summary ?? "Wikipedia",
          href: wikiHref(result.title),
        })),
      ].slice(0, 10),
    });
  } catch (error) {
    logError("api.search", "GET /api/search failed", error, { query });
    return Response.json({ results: [] });
  }
}
