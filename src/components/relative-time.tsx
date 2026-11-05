"use client";

import { useEffect, useState } from "react";
import { formatDateTime, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";

export function RelativeTime({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const [label, setLabel] = useState(() => formatRelative(value));

  useEffect(() => {
    const update = () => setLabel(formatRelative(value));
    const initial = window.setTimeout(update, 0);
    const timer = window.setInterval(update, 60_000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
  }, [value]);

  return (
    <time
      dateTime={new Date(value).toISOString()}
      title={formatDateTime(value)}
      suppressHydrationWarning
      className={cn("tabular", className)}
    >
      {label}
    </time>
  );
}
