"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { CountryFacet } from "@/db/queries";
import { cn } from "@/lib/utils";
import { XIcon } from "./icons";

function useFilterNav() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const update = useCallback(
    (updates: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (!value || value === "all" || value === "any") next.delete(key);
        else next.set(key, value);
      }
      next.delete("page");
      const query = next.toString();
      router.push(query ? `${pathname}?${query}` : pathname);
    },
    [pathname, router, searchParams],
  );

  const clear = useCallback(
    (keys: string[]) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const key of keys) next.delete(key);
      next.delete("page");
      const query = next.toString();
      router.push(query ? `${pathname}?${query}` : pathname);
    },
    [pathname, router, searchParams],
  );

  return { searchParams, update, clear };
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex items-center gap-1.5">
      <span className="font-mono text-[9px] uppercase tracking-wider text-muted">
        {label}
      </span>
      {children}
    </label>
  );
}

function Select({
  value,
  onChange,
  ariaLabel,
  children,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label={ariaLabel}
      className={cn(
        "h-8 max-w-52 rounded-full border border-line bg-card px-3 text-xs text-ink-soft outline-none focus:border-accent/50",
        className,
      )}
    >
      {children}
    </select>
  );
}

function ClearButton({ onClick, show }: { onClick: () => void; show: boolean }) {
  if (!show) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-8 items-center gap-1 rounded-full border border-line bg-card px-2.5 font-mono text-[9px] uppercase tracking-wider text-muted transition-colors hover:border-accent hover:text-accent"
    >
      <XIcon className="size-3" />
      Clear
    </button>
  );
}

function countryOptions(countries: CountryFacet[]) {
  return countries.map((country) => (
    <option key={country.code} value={country.code}>
      {country.name} ({country.count})
    </option>
  ));
}

export function NewsFilters({
  countries,
  country = "all",
  range = "any",
  from,
  to,
}: {
  countries: CountryFacet[];
  country?: string;
  range?: string;
  from?: string;
  to?: string;
}) {
  const { update, clear } = useFilterNav();
  const active = Boolean(
    (country && country !== "all") ||
      (range && range !== "any") ||
      from ||
      to,
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Field label="Country">
        <Select
          value={country}
          onChange={(value) => update({ country: value })}
          ariaLabel="Filter by country"
        >
          <option value="all">All countries</option>
          {countryOptions(countries)}
        </Select>
      </Field>

      <Field label="Date">
        <Select
          value={range}
          onChange={(value) => update({ range: value })}
          ariaLabel="Filter by date"
        >
          <option value="any">Any time</option>
          <option value="today">Today</option>
          <option value="week">This week</option>
          <option value="month">This month</option>
          <option value="year">This year</option>
          <option value="custom">Custom range</option>
        </Select>
      </Field>

      {range === "custom" ? (
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={from ?? ""}
            onChange={(event) => update({ range: "custom", from: event.target.value })}
            aria-label="From date"
            className="h-8 rounded-full border border-line bg-card px-3 text-xs text-ink-soft outline-none focus:border-accent/50"
          />
          <span className="text-xs text-muted">to</span>
          <input
            type="date"
            value={to ?? ""}
            onChange={(event) => update({ range: "custom", to: event.target.value })}
            aria-label="To date"
            className="h-8 rounded-full border border-line bg-card px-3 text-xs text-ink-soft outline-none focus:border-accent/50"
          />
        </div>
      ) : null}

      <ClearButton
        show={active}
        onClick={() => clear(["country", "range", "from", "to"])}
      />
    </div>
  );
}

export function HistoryFilters({
  countries,
  country = "all",
  era = "all",
  kind = "all",
  from,
  to,
}: {
  countries: CountryFacet[];
  country?: string;
  era?: string;
  kind?: string;
  from?: string;
  to?: string;
}) {
  const { update, clear } = useFilterNav();
  const active = Boolean(
    (country && country !== "all") ||
      (era && era !== "all") ||
      (kind && kind !== "all") ||
      from ||
      to,
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Field label="Country">
        <Select
          value={country}
          onChange={(value) => update({ country: value })}
          ariaLabel="Filter history by country"
        >
          <option value="all">All countries</option>
          {countryOptions(countries)}
        </Select>
      </Field>

      <Field label="Era">
        <Select
          value={era}
          onChange={(value) => update({ era: value })}
          ariaLabel="Filter by era"
        >
          <option value="all">All time</option>
          <option value="ancient">Ancient (to 499)</option>
          <option value="medieval">Medieval (500–1499)</option>
          <option value="early-modern">Early modern (1500–1799)</option>
          <option value="modern">Modern (1800–1945)</option>
          <option value="contemporary">Contemporary (1946–now)</option>
          <option value="custom">Custom years</option>
        </Select>
      </Field>

      <Field label="Type">
        <Select
          value={kind}
          onChange={(value) => update({ kind: value })}
          ariaLabel="Filter by record type"
        >
          <option value="all">All records</option>
          <option value="event">Events</option>
          <option value="selected">Selected anniversaries</option>
        </Select>
      </Field>

      {era === "custom" ? (
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            defaultValue={from ?? ""}
            onBlur={(event) => update({ era: "custom", from: event.target.value })}
            placeholder="From year"
            aria-label="From year"
            className="h-8 w-24 rounded-full border border-line bg-card px-3 text-xs text-ink-soft outline-none focus:border-accent/50"
          />
          <span className="text-xs text-muted">to</span>
          <input
            type="number"
            defaultValue={to ?? ""}
            onBlur={(event) => update({ era: "custom", to: event.target.value })}
            placeholder="To year"
            aria-label="To year"
            className="h-8 w-24 rounded-full border border-line bg-card px-3 text-xs text-ink-soft outline-none focus:border-accent/50"
          />
        </div>
      ) : null}

      <ClearButton
        show={active}
        onClick={() => clear(["country", "era", "kind", "from", "to"])}
      />
    </div>
  );
}
