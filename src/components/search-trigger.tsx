"use client";

import { SearchIcon } from "./icons";

export function SearchTrigger() {
  function open() {
    window.dispatchEvent(new Event("brief:open-search"));
  }

  return (
    <button
      type="button"
      onClick={open}
      className="flex h-9 items-center gap-2 rounded-full border border-line bg-card px-3 text-xs text-muted transition-colors hover:text-ink"
      aria-label="Search"
      title="Search"
    >
      <SearchIcon className="size-4" />
      <span className="hidden font-mono text-[10px] uppercase tracking-wider sm:inline">
        Search
      </span>
      <kbd className="hidden rounded border border-line px-1 py-0.5 font-mono text-[9px] text-muted sm:inline">
        ⌘K
      </kbd>
    </button>
  );
}
