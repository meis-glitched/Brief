import { SignalIcon } from "./icons";

export function EmptyState({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-start rounded-xl border border-dashed border-line px-6 py-10">
      <SignalIcon className="size-6 text-muted/60" />
      <h2 className="mt-4 font-display text-2xl text-ink">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">{body}</p>
      {children ? <div className="mt-5">{children}</div> : null}
    </div>
  );
}
