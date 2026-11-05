import { importOnThisDay } from "../src/lib/history/onthisday";
import { importWikidata } from "../src/lib/history/wikidata";

function arg(name: string, fallback?: string): string | undefined {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  return process.argv[index + 1] ?? fallback;
}

function has(name: string): boolean {
  return process.argv.includes(name);
}

async function main() {
  const source = arg("--source", "onthisday") ?? "onthisday";
  const includePeople = has("--include-people");
  const fromYear = Number.parseInt(arg("--from", "1500") ?? "1500", 10);
  const toYear = Number.parseInt(
    arg("--to", String(new Date().getFullYear())) ??
      String(new Date().getFullYear()),
    10,
  );
  const step = Number.parseInt(arg("--step", "10") ?? "10", 10);

  if (source === "onthisday" || source === "all") {
    console.log(
      `Importing On This Day${includePeople ? " (including births and deaths)" : ""}…`,
    );
    const result = await importOnThisDay({
      includePeople,
      onProgress: (message) => console.log(`  ${message}`),
    });
    console.log(
      `On This Day: ${result.inserted} new, ${result.updated} updated across ${result.days} days (${result.failed} failed).`,
    );
  }

  if (source === "wikidata" || source === "all") {
    console.log(`Importing Wikidata events ${fromYear}…${toYear}…`);
    const result = await importWikidata({
      fromYear,
      toYear,
      step,
      onProgress: (message) => console.log(`  ${message}`),
    });
    console.log(
      `Wikidata: ${result.inserted} new, ${result.updated} updated across ${result.chunks} chunks.`,
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
