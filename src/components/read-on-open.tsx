"use client";

import { useEffect, useTransition } from "react";
import { setArticleRead } from "@/actions";

export function ReadOnOpen({
  id,
  read,
}: {
  id: number;
  read: boolean;
}) {
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (read) return;
    startTransition(async () => {
      await setArticleRead(id, true);
    });
  }, [id, read]);

  return null;
}
