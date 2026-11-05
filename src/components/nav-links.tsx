"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BiasIcon,
  HistoryIcon,
  SavedIcon,
  SourcesIcon,
  StoriesIcon,
  TodayIcon,
  WireIcon,
} from "./icons";
import { cn } from "@/lib/utils";

type Stats = {
  unread: number;
  saved: number;
  today: number;
};

const items = [
  { href: "/", label: "Today", icon: TodayIcon, index: "01" },
  { href: "/stories", label: "Stories", icon: StoriesIcon, index: "02" },
  { href: "/feed", label: "The wire", icon: WireIcon, index: "03" },
  { href: "/history", label: "History", icon: HistoryIcon, index: "04" },
  { href: "/blindspot", label: "Blindspot", icon: BiasIcon, index: "05" },
  { href: "/saved", label: "Saved", icon: SavedIcon, index: "06" },
  { href: "/sources", label: "Sources", icon: SourcesIcon, index: "07" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function badgeFor(href: string, stats: Stats): number {
  if (href === "/feed") return stats.unread;
  if (href === "/saved") return stats.saved;
  if (href === "/") return stats.today;
  return 0;
}

export function NavLinks({ stats }: { stats: Stats }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1" aria-label="Primary">
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        const badge = badgeFor(item.href, stats);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors",
              active
                ? "bg-card text-ink shadow-sm"
                : "text-ink-soft hover:bg-card/70 hover:text-ink",
            )}
          >
            <span
              className={cn(
                "absolute left-0 top-1/2 h-5 w-px -translate-y-1/2 rounded-full transition-all",
                active ? "bg-accent opacity-100" : "opacity-0 group-hover:opacity-40",
              )}
            />
            <Icon
              className={cn(
                "size-4 shrink-0 transition-colors",
                active ? "text-accent" : "text-muted group-hover:text-ink",
              )}
            />
            <span className="flex-1">{item.label}</span>
            {badge > 0 ? (
              <span className="font-mono text-[10px] tabular-nums text-muted">
                {badge > 999 ? "999+" : badge}
              </span>
            ) : null}
            <span className="font-mono text-[9px] tabular-nums text-muted/50">
              {item.index}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileNav({ stats }: { stats: Stats }) {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      aria-label="Primary"
    >
      <div className="grid grid-cols-7">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          const badge = badgeFor(item.href, stats);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex flex-col items-center gap-1 py-2.5 text-[10px] transition-colors",
                active ? "text-accent" : "text-muted",
              )}
            >
              <Icon className="size-4" />
              <span className="text-[9px]">{item.label}</span>
              {badge > 0 ? (
                <span className="absolute right-[22%] top-1.5 size-1.5 rounded-full bg-accent" />
              ) : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
