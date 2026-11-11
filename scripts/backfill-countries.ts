import { backfillArticleCountries } from "../src/lib/tagging";

async function main() {
  const result = await backfillArticleCountries();
  console.log(
    `Tagged ${result.tags} country links across ${result.articles} previously untagged articles.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
