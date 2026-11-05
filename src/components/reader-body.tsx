import { ArticleImage } from "./article-image";
import { aspectRatio } from "@/lib/images";
import type { ReaderBlock } from "@/lib/reader-types";

function ImageBlock({ block }: { block: Extract<ReaderBlock, { type: "image" }> }) {
  return (
    <figure className="my-8">
      <ArticleImage
        url={block.src}
        alt={block.caption ?? "Article image"}
        width={block.width}
        height={block.height}
        className="w-full border border-line bg-paper-deep/60"
        imageClassName="object-contain"
        sizes="(min-width: 1024px) 768px, 100vw"
        style={{ aspectRatio: aspectRatio(block.width, block.height) }}
      />
      {block.caption || block.credit ? (
        <figcaption className="mt-2 flex flex-wrap gap-x-2 text-xs leading-relaxed text-muted">
          {block.caption ? <span>{block.caption}</span> : null}
          {block.credit ? (
            <span className="font-mono text-[9px] uppercase tracking-wider text-muted/70">
              {block.credit}
            </span>
          ) : null}
        </figcaption>
      ) : null}
    </figure>
  );
}

export function ReaderBody({ blocks }: { blocks: ReaderBlock[] }) {
  if (!blocks.length) {
    return (
      <p className="text-sm leading-relaxed text-muted">
        There is no readable text for this article yet.
      </p>
    );
  }

  return (
    <div className="mt-8">
      {blocks.map((block, index) => {
        if (block.type === "paragraph") {
          return (
            <p
              key={index}
              className="mb-5 text-pretty text-[17px] leading-8 text-ink-soft"
            >
              {block.text}
            </p>
          );
        }

        if (block.type === "heading") {
          if (block.level === 2) {
            return (
              <h2
                key={index}
                className="mt-10 mb-4 text-balance font-display text-2xl leading-tight text-ink"
              >
                {block.text}
              </h2>
            );
          }
          if (block.level === 3) {
            return (
              <h3
                key={index}
                className="mt-8 mb-3 text-balance font-display text-xl leading-tight text-ink"
              >
                {block.text}
              </h3>
            );
          }
          return (
            <h4
              key={index}
              className="mt-6 mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted"
            >
              {block.text}
            </h4>
          );
        }

        if (block.type === "quote") {
          return (
            <blockquote
              key={index}
              className="my-7 border-l-2 border-accent/50 pl-5 text-pretty font-display text-xl leading-relaxed text-ink"
            >
              {block.text}
              {block.attribution ? (
                <footer className="mt-2 font-mono text-[9px] uppercase tracking-wider text-muted">
                  {block.attribution}
                </footer>
              ) : null}
            </blockquote>
          );
        }

        if (block.type === "list") {
          const Tag = block.ordered ? "ol" : "ul";
          return (
            <Tag
              key={index}
              className="mb-5 list-outside space-y-2 pl-5 text-[17px] leading-8 text-ink-soft marker:text-accent"
              style={{ listStyleType: block.ordered ? "decimal" : "disc" }}
            >
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{item}</li>
              ))}
            </Tag>
          );
        }

        return <ImageBlock key={index} block={block} />;
      })}
    </div>
  );
}
