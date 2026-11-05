import { runIngest } from "../src/lib/ingest/run";

async function main() {
  const result = await runIngest();
  console.log(
    `Ingested ${result.inserted} new articles from ${result.sourceCount} sources ` +
      `in ${(result.durationMs / 1000).toFixed(1)}s (${result.errorCount} errors).`,
  );
  if (result.errors.length) {
    for (const error of result.errors) {
      console.log(`  ${error.name}: ${error.error}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
