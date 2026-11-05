export function normalizeWikiTitle(value: string): string {
  return value.replace(/_/g, " ").replace(/\s+/g, " ").trim();
}

export function wikiHref(title: string): string {
  const clean = normalizeWikiTitle(title);
  return `/wiki/${clean.split("/").map(encodeURIComponent).join("/")}`;
}

export function wikiTitleFromUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (!/(^|\.)wikipedia\.org$/i.test(url.hostname)) return null;
    const match = url.pathname.match(/^\/wiki\/(.+)$/);
    if (!match) return null;
    return normalizeWikiTitle(decodeURIComponent(match[1]));
  } catch {
    return null;
  }
}
