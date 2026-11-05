import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, stat, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import sharp from "sharp";
import { assertPublicUrl } from "@/lib/url-safety";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CACHE_DIR = join(process.cwd(), "data", "image-cache");
const MAX_BYTES = 8 * 1024 * 1024;
const MAX_CACHE_MB = Number.parseInt(process.env.BRIEF_IMAGE_CACHE_MB ?? "500", 10);
const UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

let lastPrune = 0;

async function readLimited(response: Response): Promise<Buffer> {
  const length = Number.parseInt(response.headers.get("content-length") ?? "0", 10);
  if (length > MAX_BYTES) throw new Error("image too large");
  if (!response.body) throw new Error("empty image");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BYTES) {
      await reader.cancel();
      throw new Error("image too large");
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
}

async function fetchImage(input: string): Promise<{ buffer: Buffer; type: string }> {
  let current = new URL(input);
  for (let redirects = 0; redirects < 4; redirects += 1) {
    await assertPublicUrl(current);
    const response = await fetch(current, {
      redirect: "manual",
      headers: {
        "User-Agent": UA,
        "Accept": "image/avif,image/webp,image/png,image/jpeg,image/gif,*/*;q=0.5",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": `${current.origin}/`,
      },
      signal: AbortSignal.timeout(12_000),
      cache: "no-store",
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw new Error("bad redirect");
      current = new URL(location, current);
      continue;
    }
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const type = (response.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    if (!ALLOWED_TYPES.has(type)) throw new Error(`unsupported image type ${type}`);
    return { buffer: await readLimited(response), type };
  }
  throw new Error("too many redirects");
}

async function pruneCache() {
  if (Date.now() - lastPrune < 10 * 60_000) return;
  lastPrune = Date.now();
  const limit = Math.max(50, MAX_CACHE_MB) * 1024 * 1024;
  const files: Array<{ path: string; size: number; mtime: number }> = [];
  async function walk(dir: string) {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(path);
      } else {
        const info = await stat(path).catch(() => null);
        if (info) files.push({ path, size: info.size, mtime: info.mtimeMs });
      }
    }
  }
  await walk(CACHE_DIR);
  let total = files.reduce((sum, file) => sum + file.size, 0);
  if (total <= limit) return;
  files.sort((a, b) => a.mtime - b.mtime);
  for (const file of files) {
    if (total <= limit) break;
    await unlink(file.path).catch(() => undefined);
    total -= file.size;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("url");
  const width = Math.min(1600, Math.max(120, Number.parseInt(searchParams.get("w") ?? "640", 10) || 640));
  if (!raw) return new Response("Missing image URL", { status: 400 });

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return new Response("Invalid image URL", { status: 400 });
  }

  const key = createHash("sha1").update(`${url.toString()}|${width}`).digest("hex");
  const path = join(CACHE_DIR, key.slice(0, 2), `${key}.webp`);

  try {
    const cached = await readFile(path);
    return new Response(cached, {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    // not cached
  }

  try {
    const { buffer } = await fetchImage(url.toString());
    const output = await sharp(buffer)
      .rotate()
      .resize({ width, withoutEnlargement: true, fit: "inside" })
      .webp({ quality: 82, effort: 4 })
      .toBuffer();
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, output);
    void pruneCache();
    return new Response(output, {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    return new Response(error instanceof Error ? error.message : "Image failed", {
      status: 404,
      headers: { "Cache-Control": "public, max-age=300" },
    });
  }
}
