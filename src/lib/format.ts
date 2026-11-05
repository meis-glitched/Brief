const dateFormatter = new Intl.DateTimeFormat("en", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
});

const shortDateFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
});

const timeFormatter = new Intl.DateTimeFormat("en", {
  hour: "numeric",
  minute: "2-digit",
});

export function formatLongDate(value: Date | number = Date.now()): string {
  return dateFormatter.format(value);
}

export function formatShortDate(value: Date | number): string {
  return shortDateFormatter.format(value);
}

export function formatTime(value: Date | number): string {
  return timeFormatter.format(value);
}

export function formatDateTime(value: Date | number): string {
  return `${formatShortDate(value)} · ${formatTime(value)}`;
}

export function formatRelative(value: Date | number): string {
  const timestamp = typeof value === "number" ? value : value.getTime();
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatShortDate(timestamp);
}

export function dayKey(value: Date | number = Date.now()): string {
  const date = typeof value === "number" ? new Date(value) : value;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function startOfDay(value: Date | number = Date.now()): number {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

export function formatYear(year: number): string {
  return year < 0 ? `${Math.abs(year)} BC` : `${year}`;
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function todaySortKey(): number {
  const date = new Date();
  return (
    date.getFullYear() * 10_000 +
    (date.getMonth() + 1) * 100 +
    date.getDate()
  );
}

export function formatEventDate(
  year: number,
  month?: number | null,
  day?: number | null,
): string {
  if (month && day) return `${day} ${MONTHS[month - 1]} ${formatYear(year)}`;
  if (month) return `${MONTHS[month - 1]} ${formatYear(year)}`;
  return formatYear(year);
}
