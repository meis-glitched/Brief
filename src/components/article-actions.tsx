"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { setArticleRead, toggleArticleSaved } from "@/actions";
import {
  ArrowUpRightIcon,
  BookmarkFilledIcon,
  BookmarkIcon,
  CheckIcon,
  ReaderIcon,
} from "./icons";
import { cn } from "@/lib/utils";

export function ArticleActions({
  id,
  url,
  savedAt,
  readAt,
}: {
  id: number;
  url: string;
  savedAt: number | null;
  readAt: number | null;
}) {
  const [saved, setSaved] = useState(savedAt != null);
  const [read, setRead] = useState(readAt != null);
  const [, startTransition] = useTransition();

  function toggleSave() {
    const next = !saved;
    setSaved(next);
    startTransition(async () => {
      await toggleArticleSaved(id);
    });
  }

  function toggleRead() {
    const next = !read;
    setRead(next);
    startTransition(async () => {
      await setArticleRead(id, next);
    });
  }

  return (
    <div className="flex items-center gap-1">
      <Link
        href={`/articles/${id}`}
        className="grid size-8 place-items-center rounded-full text-muted transition-colors hover:text-accent"
        aria-label="Read in Brief"
        title="Read in Brief"
      >
        <ReaderIcon className="size-4" />
      </Link>
      <button
        type="button"
        onClick={toggleSave}
        className={cn(
          "grid size-8 place-items-center rounded-full transition-colors",
          saved ? "text-accent" : "text-muted hover:text-ink",
        )}
        aria-label={saved ? "Remove from saved" : "Save article"}
        title={saved ? "Remove from saved" : "Save"}
      >
        {saved ? (
          <BookmarkFilledIcon className="size-4" />
        ) : (
          <BookmarkIcon className="size-4" />
        )}
      </button>
      <button
        type="button"
        onClick={toggleRead}
        className={cn(
          "grid size-8 place-items-center rounded-full transition-colors",
          read ? "text-green" : "text-muted hover:text-ink",
        )}
        aria-label={read ? "Mark unread" : "Mark read"}
        title={read ? "Mark unread" : "Mark read"}
      >
        <CheckIcon className="size-4" />
      </button>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="grid size-8 place-items-center rounded-full text-muted transition-colors hover:text-accent"
        aria-label="Open original article"
        title="Open original"
      >
        <ArrowUpRightIcon className="size-4" />
      </a>
    </div>
  );
}
