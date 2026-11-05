"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import { imageProxyUrl, imageSrcSet } from "@/lib/images";
import { cn } from "@/lib/utils";

export function ArticleImage({
  url,
  alt,
  width,
  height,
  className,
  imageClassName,
  sizes = "(min-width: 1024px) 720px, 100vw",
  priority = false,
  style,
}: {
  url: string | null | undefined;
  alt: string;
  width?: number | null;
  height?: number | null;
  className?: string;
  imageClassName?: string;
  sizes?: string;
  priority?: boolean;
  style?: CSSProperties;
}) {
  const [failed, setFailed] = useState(false);
  if (!url || failed) {
    return (
      <div
        className={cn(
          "grid place-items-center overflow-hidden border border-line bg-paper-deep/60",
          className,
        )}
        style={style}
        aria-hidden="true"
      >
        <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted/60">
          Brief
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn("overflow-hidden bg-paper-deep/60", className)}
      style={style}
    >
      <img
        src={imageProxyUrl(url, 960)}
        srcSet={imageSrcSet(url)}
        sizes={sizes}
        alt={alt}
        width={width ?? undefined}
        height={height ?? undefined}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className={cn("size-full object-cover", imageClassName)}
      />
    </div>
  );
}
