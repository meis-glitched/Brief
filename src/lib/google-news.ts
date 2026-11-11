import { GoogleDecoder } from "google-news-url-decoder";
import { logWarn } from "./logger";
const decoder = new GoogleDecoder();
const cache = new Map<string, string | null>();

export function isGoogleNewsUrl(value: string): boolean {
  try {
    const host = new URL(value).hostname.toLowerCase();
    return host === "news.google.com" || host.endsWith(".news.google.com");
  } catch {
    return false;
  }
}

export async function resolveGoogleNewsUrl(value: string): Promise<string | null> {
  if (!isGoogleNewsUrl(value)) return value;
  if (cache.has(value)) return cache.get(value) ?? null;

  try {
    const result = await decoder.decode(value);
    const resolved = result.status ? result.decoded_url : null;
    if (resolved) cache.set(value, resolved);
    return resolved;
  } catch (error) {
    logWarn("google-news", "Failed to resolve Google News URL", { url: value, error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}
