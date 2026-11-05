import type { ReactNode } from "react";

function renderInline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

export function BriefMarkdown({ content }: { content: string }) {
  const lines = content.split("\n");
  const blocks: ReactNode[] = [];
  let bullets: string[] = [];
  let key = 0;

  function flushBullets() {
    if (bullets.length === 0) return;
    blocks.push(
      <ul key={`ul-${key++}`} className="space-y-1.5 pl-5 marker:text-accent">
        {bullets.map((bullet, index) => (
          <li key={index} className="pl-1">
            {renderInline(bullet)}
          </li>
        ))}
      </ul>,
    );
    bullets = [];
  }

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flushBullets();
      continue;
    }
    if (line.startsWith("- ")) {
      bullets.push(line.slice(2));
      continue;
    }
    flushBullets();
    if (line.startsWith("Worth watching:")) {
      blocks.push(
        <p
          key={`watch-${key++}`}
          className="border-l-2 border-accent pl-3 text-ink"
        >
          {renderInline(line)}
        </p>,
      );
      continue;
    }
    blocks.push(
      <p key={`p-${key++}`} className="text-pretty">
        {renderInline(line)}
      </p>,
    );
  }
  flushBullets();

  return (
    <div className="space-y-4 font-display text-[17px] leading-7 text-ink-soft">
      {blocks}
    </div>
  );
}
