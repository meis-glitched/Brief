import { FeedView } from "@/components/feed-view";
import { NewsFilters } from "@/components/filters";
import { getArticles, getCountryFacets, getEnabledSources } from "@/db/queries";
import { resolveNewsRange } from "@/lib/date-filters";

export const dynamic = "force-dynamic";

type FeedParams = {
  filter?: string;
  source?: string;
  country?: string;
  range?: string;
  from?: string;
  to?: string;
};

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<FeedParams>;
}) {
  const params = await searchParams;
  const filter =
    params.filter === "unread" || params.filter === "saved"
      ? params.filter
      : "all";
  const range = resolveNewsRange(params.range, params.from, params.to);

  const articles = getArticles({
    limit: 200,
    country: params.country,
    ...range,
  });
  const sources = getEnabledSources();
  const countries = getCountryFacets("news");

  return (
    <FeedView
      key={JSON.stringify(params)}
      initialArticles={articles}
      sources={sources}
      initialFilter={filter}
      initialSourceId={params.source ?? "all"}
      filterSlot={
        <NewsFilters
          countries={countries}
          country={params.country ?? "all"}
          range={params.range ?? "any"}
          from={params.from}
          to={params.to}
        />
      }
    />
  );
}
