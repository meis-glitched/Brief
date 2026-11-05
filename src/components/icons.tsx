import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function Base({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function TodayIcon(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
    </Base>
  );
}

export function StoriesIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M4 5h16M4 12h16M4 19h10" />
      <circle cx="18" cy="19" r="2" />
    </Base>
  );
}

export function HistoryIcon(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l3 2" />
      <path d="M4 4v3h3" />
    </Base>
  );
}

export function WireIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M4 6h16M4 12h12M4 18h8" />
      <path d="M18 12v6" />
    </Base>
  );
}

export function SavedIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M6 4h12v16l-6-4-6 4z" />
    </Base>
  );
}

export function SourcesIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M5 19a14 14 0 0 1 14-14" />
      <path d="M5 13a8 8 0 0 1 8-8" />
      <circle cx="6" cy="18" r="1" fill="currentColor" stroke="none" />
    </Base>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="11" cy="11" r="6" />
      <path d="m16 16 4 4" />
    </Base>
  );
}

export function RefreshIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M20 11a8 8 0 1 0-2.3 5.7" />
      <path d="M20 4v7h-7" />
    </Base>
  );
}

export function MoonIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z" />
    </Base>
  );
}

export function SunIcon(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
    </Base>
  );
}

export function ReaderIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M12 6.5C10.5 5.2 8.4 4.5 5 4.5v13c3.4 0 5.5.7 7 2 1.5-1.3 3.6-2 7-2v-13c-3.4 0-5.5.7-7 2Z" />
      <path d="M12 6.5v13" />
    </svg>
  );
}

export function ArrowUpRightIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M7 17 17 7M8 7h9v9" />
    </Base>
  );
}

export function ArrowLeftIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M19 12H5M11 18l-6-6 6-6" />
    </Base>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="m5 12 4 4L19 6" />
    </Base>
  );
}

export function BookmarkIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M6 4h12v16l-6-4-6 4z" />
    </Base>
  );
}

export function BookmarkFilledIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M6 4h12v16l-6-4-6 4z" fill="currentColor" />
    </Base>
  );
}

export function XIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Base>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="m9 6 6 6-6 6" />
    </Base>
  );
}

export function CommandIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M9 6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3Z" />
    </Base>
  );
}

export function BiasIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M12 4v16M6 8 4 14h4L6 8ZM18 8l-2 6h4l-2-6Z" />
      <path d="M8 20h8" />
    </Base>
  );
}

export function SignalIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M4 20v-4M9 20v-8M14 20V8M19 20V4" />
    </Base>
  );
}
