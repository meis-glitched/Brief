import { join } from "node:path";

/**
 * Returns the base directory used for local runtime data.
 *
 * On Vercel/Netlify-like hosts only `/tmp` is writable, so data is routed
 * there instead of the immutable project root.
 */
export function dataDir(): string {
  const isServerless =
    process.env.VERCEL === "1" || process.env.NOW_REGION !== undefined;

  if (isServerless) return join("/tmp", "brief", "data");
  return join(process.cwd(), "data");
}

/**
 * Absolute path to the SQLite database file.
 */
export function databasePath(): string {
  if (process.env.BRIEF_DB_PATH) return process.env.BRIEF_DB_PATH;
  return join(dataDir(), "brief.db");
}

/**
 * Absolute path used to cache proxied article images.
 */
export function imageCacheDir(): string {
  return join(dataDir(), "image-cache");
}
