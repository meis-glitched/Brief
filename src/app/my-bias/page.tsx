import Link from "next/link";
import { BiasLegend, CoverageBar } from "@/components/coverage-bar";
import { EmptyState } from "@/components/empty-state";
import { getMyBias } from "@/db/coverage";

export const dynamic = "force-dynamic";

function sideShare(
  counts: { left: number; "lean-left": number; right: number; "lean-right": number },
  total: number,
): { left: number; right: number } {
  const left = counts.left + counts["lean-left"];
  const right = counts.right + counts["lean-right"];
  if (!total) return { left: 0, right: 0 };
  return {
    left: Math.round((left / total) * 100),
    right: Math.round((right / total) * 100),
  };
}

export default function MyBiasPage() {
  const bias = getMyBias();
  const readSides = sideShare(bias.read.counts, bias.read.total);
  const availableSides = sideShare(bias.available.counts, bias.available.total);

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-5 border-b border-line pb-5">
        <div>
          <p className="rule-label">My news bias</p>
          <h1 className="mt-1 text-balance font-display text-4xl leading-none tracking-[-0.02em] text-ink sm:text-5xl">
            How you read.
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
            A local, private reading mirror. It compares the bias mix of the
            articles you mark read with the mix sitting on the desk. Nothing
            leaves this machine.
          </p>
        </div>
        <div className="flex items-center gap-6 font-mono text-[10px] uppercase tracking-wider text-muted">
          <div>
            <span className="block">Read</span>
            <span className="mt-1 block font-display text-2xl normal-case tracking-normal text-ink">
              {bias.readArticles}
            </span>
          </div>
          <div>
            <span className="block">Saved</span>
            <span className="mt-1 block font-display text-2xl normal-case tracking-normal text-ink">
              {bias.savedArticles}
            </span>
          </div>
          <div>
            <span className="block">On desk</span>
            <span className="mt-1 block font-display text-2xl normal-case tracking-normal text-ink">
              {bias.availableArticles}
            </span>
          </div>
        </div>
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="card rounded-xl p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="rule-label">Your reading</p>
              <p className="mt-1 font-display text-3xl leading-none text-ink">
                {bias.readArticles}
                <span className="ml-2 font-sans text-[10px] uppercase tracking-wider text-muted">
                  articles marked read
                </span>
              </p>
            </div>
            <div className="text-right font-mono text-[9px] uppercase tracking-wider text-muted">
              <p>
                <span className="text-ink-soft">{readSides.left}%</span> left
              </p>
              <p className="mt-1">
                <span className="text-ink-soft">{readSides.right}%</span> right
              </p>
            </div>
          </div>
          <CoverageBar
            counts={bias.read.counts}
            total={bias.read.total}
            className="mt-5"
            height="h-3"
          />
          <BiasLegend
            counts={bias.read.counts}
            total={bias.read.total}
            className="mt-4"
            showZero
          />
          {bias.readArticles === 0 ? (
            <p className="mt-4 text-xs leading-relaxed text-muted">
              Mark a few articles read in the wire or on a story page to start
              the mirror.
            </p>
          ) : null}
        </section>

        <section className="card rounded-xl p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="rule-label">The desk</p>
              <p className="mt-1 font-display text-3xl leading-none text-ink">
                {bias.availableArticles}
                <span className="ml-2 font-sans text-[10px] uppercase tracking-wider text-muted">
                  articles available
                </span>
              </p>
            </div>
            <div className="text-right font-mono text-[9px] uppercase tracking-wider text-muted">
              <p>
                <span className="text-ink-soft">{availableSides.left}%</span> left
              </p>
              <p className="mt-1">
                <span className="text-ink-soft">{availableSides.right}%</span> right
              </p>
            </div>
          </div>
          <CoverageBar
            counts={bias.available.counts}
            total={bias.available.total}
            className="mt-5"
            height="h-3"
          />
          <BiasLegend
            counts={bias.available.counts}
            total={bias.available.total}
            className="mt-4"
            showZero
          />
          <p className="mt-4 text-xs leading-relaxed text-muted">
            This is the baseline you are choosing from, including unrated
            sources. It is not a recommendation.
          </p>
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="card rounded-xl p-5">
          <p className="rule-label">Saved for later</p>
          {bias.savedArticles ? (
            <>
              <p className="mt-2 font-display text-2xl text-ink">
                {bias.savedArticles} saved
              </p>
              <CoverageBar
                counts={bias.saved.counts}
                total={bias.saved.total}
                className="mt-4"
              />
              <BiasLegend
                counts={bias.saved.counts}
                total={bias.saved.total}
                className="mt-3"
              />
            </>
          ) : (
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Nothing saved yet. Saved articles are included as a second signal,
              separate from what you have read.
            </p>
          )}
        </section>

        <aside className="space-y-6">
          <section className="card rounded-xl p-5">
            <p className="rule-label">Small sample warning</p>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {bias.readArticles < 20
                ? "With fewer than 20 read articles, this mirror is noisy. Treat it as a prompt, not a verdict."
                : "A useful mirror, but still outlet-level. Individual articles and story selection can differ from the outlet rating."}
            </p>
          </section>

          <section className="card rounded-xl p-5">
            <p className="rule-label">Where the labels come from</p>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Bias labels are outlet-level ratings from{" "}
              <a
                href="https://www.allsides.com/media-bias/ratings"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent underline decoration-line underline-offset-2 hover:opacity-75"
              >
                AllSides
              </a>
              , used under CC BY-NC 4.0. Unrated sources are never counted as
              Center.
            </p>
            <p className="mt-3 text-xs leading-relaxed text-muted">
              The desk uses five political buckets, from Left to Right, plus
              Unrated.
            </p>
          </section>

          <Link
            href="/blindspot"
            className="inline-flex font-mono text-[9px] uppercase tracking-wider text-accent transition-opacity hover:opacity-75"
          >
            Open the blindspot feed →
          </Link>
        </aside>
      </div>

      {bias.readArticles === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="The mirror is still blank."
            body="Open the wire, mark a handful of stories read, then come back. The comparison gets more useful as the sample grows."
          >
            <Link
              href="/feed"
              className="inline-flex rounded-full border border-line bg-card px-3 py-1.5 font-mono text-[9px] uppercase tracking-wider text-ink-soft transition-colors hover:text-accent"
            >
              Open the wire
            </Link>
          </EmptyState>
        </div>
      ) : null}
    </div>
  );
}
