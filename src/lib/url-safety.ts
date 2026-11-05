import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const BLOCKED_HOSTS = [".localhost", ".local", ".internal"];

export function isPrivateAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) {
    const [a, b] = address.split(".").map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) ||
      a >= 224
    );
  }
  if (family === 6) {
    const value = address.toLowerCase();
    return (
      value === "::" ||
      value === "::1" ||
      value.startsWith("fc") ||
      value.startsWith("fd") ||
      value.startsWith("fe8") ||
      value.startsWith("fe9") ||
      value.startsWith("fea") ||
      value.startsWith("feb") ||
      value.startsWith("::ffff:127.") ||
      value.startsWith("::ffff:10.") ||
      value.startsWith("::ffff:192.168.")
    );
  }
  return true;
}

export async function assertPublicUrl(url: URL): Promise<void> {
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("unsupported protocol");
  }
  const host = url.hostname.toLowerCase();
  if (
    host === "localhost" ||
    BLOCKED_HOSTS.some((suffix) => host.endsWith(suffix))
  ) {
    throw new Error("private host");
  }
  const addresses = isIP(host)
    ? [{ address: host }]
    : await lookup(host, { all: true, verbatim: true });
  if (!addresses.length) throw new Error("no address");
  for (const entry of addresses) {
    if (isPrivateAddress(entry.address)) throw new Error("private address");
  }
}

export async function fetchPublicUrl(
  input: string,
  init: Omit<RequestInit, "redirect"> & { maxRedirects?: number } = {},
): Promise<Response> {
  const maxRedirects = init.maxRedirects ?? 4;
  let current = new URL(input);

  for (let redirects = 0; redirects <= maxRedirects; redirects += 1) {
    await assertPublicUrl(current);
    const response = await fetch(current, {
      ...init,
      redirect: "manual",
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw new Error("bad redirect");
      current = new URL(location, current);
      continue;
    }

    return response;
  }

  throw new Error("too many redirects");
}
