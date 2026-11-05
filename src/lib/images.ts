export const IMAGE_WIDTHS = [320, 640, 960, 1280] as const;

export function imageProxyUrl(url: string, width = 640): string {
  return `/api/image?url=${encodeURIComponent(url)}&w=${width}`;
}

export function imageSrcSet(url: string): string {
  return IMAGE_WIDTHS.map((width) => `${imageProxyUrl(url, width)} ${width}w`).join(", ");
}

export function imageDimensions(
  width: number | null | undefined,
  height: number | null | undefined,
): { width: number; height: number } {
  if (width && height && width > 0 && height > 0) {
    return { width, height };
  }
  return { width: 16, height: 9 };
}

export function aspectRatio(
  width: number | null | undefined,
  height: number | null | undefined,
): string {
  const dims = imageDimensions(width, height);
  return `${dims.width} / ${dims.height}`;
}
