import Link from "next/link";
import { getStats } from "@/db/queries";
import { formatLongDate } from "@/lib/format";
import { CommandPalette } from "./command-palette";
import { MobileNav, NavLinks } from "./nav-links";
import { RefreshButton } from "./refresh-button";
import { SearchTrigger } from "./search-trigger";
import { ThemeToggle } from "./theme-toggle";
import { ReaderIcon, SignalIcon } from "./icons";

export const dynamic = "force-dynamic";

function Wordmark({ small = false }: { small?: boolean }) {
  return (
    <Link href="/" className="group flex items-center gap-3" aria-label="Brief home">
      <span className="relative grid size-9 place-items-center rounded-full border border-line bg-card">
        <span className="size-2.5 rounded-full bg-accent transition-transform group-hover:scale-110" />
        <span className="absolute inset-1 rounded-full border border-accent/20" />
      </span>
      <span
        className={
          small
            ? "font-display text-xl tracking-tight text-ink"
            : "font-display text-2xl tracking-tight text-ink"
        }
      >
        Brief
      </span>
    </Link>
  );
}

export async function AppShell({ children }: { children: React.ReactNode }) {
  const stats = await getStats();

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-line px-5 py-6 lg:flex">
        <Wordmark />
        <div className="mt-10 flex-1">
          <p className="mb-3 px-3 rule-label">The desk</p>
          <NavLinks stats={stats} />
          <Link
            href="/wiki"
            className="mt-3 flex items-center justify-between rounded-md px-3 py-2 font-mono text-[9px] uppercase tracking-wider text-muted transition-colors hover:bg-card hover:text-ink"
          >
            <span className="flex items-center gap-2">
              <ReaderIcon className="size-3.5" />
              Reference desk
            </span>
            <span aria-hidden="true">→</span>
          </Link>
          <Link
            href="/my-bias"
            className="mt-1 flex items-center justify-between rounded-md px-3 py-2 font-mono text-[9px] uppercase tracking-wider text-muted transition-colors hover:bg-card hover:text-ink"
          >
            My news bias
            <span aria-hidden="true">→</span>
          </Link>
        </div>
        <div className="border-t border-line pt-4">
          <div className="flex items-center gap-2 px-3 text-xs text-muted">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-green opacity-40" />
              <span className="relative inline-flex size-2 rounded-full bg-green" />
            </span>
            <span>Local edition</span>
            <SignalIcon className="ml-auto size-3.5" />
          </div>
          <p className="mt-2 px-3 font-mono text-[10px] leading-relaxed text-muted/70">
            {stats.sources} sources · libSQL
            <br />
            {stats.articles} articles on file
          </p>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur">
          <div className="mx-auto flex h-16 w-full max-w-[1500px] items-center gap-4 px-5 lg:px-10">
            <div className="lg:hidden">
              <Wordmark small />
            </div>
            <div className="hidden items-center gap-3 lg:flex">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                {formatLongDate()}
              </span>
              <span className="h-3 w-px bg-line" />
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                {stats.today} today
              </span>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <SearchTrigger />
              <RefreshButton />
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1500px] px-5 pb-28 pt-8 lg:px-10 lg:pb-16 lg:pt-10">
          {children}
        </main>
      </div>

      <MobileNav stats={stats} />
      <CommandPalette />
    </div>
  );
}
