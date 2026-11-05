import Link from "next/link";
import { ArrowLeftIcon } from "@/components/icons";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg py-16">
      <p className="rule-label">404</p>
      <h1 className="mt-2 font-display text-4xl text-ink">Off the desk.</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        That story or page is not here. It may have been merged into a different
        cluster.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted transition-colors hover:text-accent"
      >
        <ArrowLeftIcon className="size-3.5" />
        Back to today
      </Link>
    </div>
  );
}
