import { FeedView } from "@/components/feed-view";
import { getArticles, getEnabledSources } from "@/db/queries";

export const dynamic = "force-dynamic";

export default function SavedPage() {
  const articles = getArticles({ limit: 200 });
  const sources = getEnabledSources();

  return (
    <FeedView
      initialArticles={articles}
      sources={sources}
      initialFilter="saved"
      title="Kept for later."
      description="The stories you saved, ready when you are."
      showFilterTabs={false}
    />
  );
}
