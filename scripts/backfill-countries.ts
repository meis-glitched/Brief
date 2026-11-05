import { backfillArticleCountries } from "../src/lib/tagging";

const result = backfillArticleCountries();
console.log(
  `Tagged ${result.tags} country links across ${result.articles} previously untagged articles.`,
);
