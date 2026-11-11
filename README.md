# Brief

A local-first news intelligence desk. Brief pulls the wires, dedupes the noise, clusters coverage into stories, and writes a daily brief with a local model. It runs against local SQLite in development and Turso/libSQL in production.

## Features

- **Wire feed** — 13 sources, RSS with HTML fallback, deduped by canonical URL.
- **Stories** — TF-IDF cosine clustering groups the same event across outlets. Multi-source stories are ranked higher.
- **Today** — lead story, multi-source coverage, source pulse, and an Ollama-written brief.
- **Reader** — in-app article view with Readability extraction, feed-summary fallback, and an original-link escape hatch.
- **Images** — feed and story thumbnails, a proxy/cache route, RSS and JSON-LD image extraction, and a media backfill CLI.
- **History** — a dated timeline of the documented human record, from On This Day and Wikidata, with country and era filters and cached Wikipedia thumbnails. Requires an explicit history import.
- **Wikipedia** — a local reference desk: search Wikipedia, read cached pages, and inspect lead images with license and file-page links. Uses local cache and degrades gracefully when Wikipedia is unavailable.
- **Country and date filters** — apply a country and a date range to Today, Stories, and the wire; filter history by country, era, and record type.
- **Keyboard-first** — command palette, `j`/`k` navigation, save/read actions, `g`-prefixed route jumps.
- **Source health** — per-source article counts, last fetch, RSS vs HTML mode, enable/disable, and outlet bias labels.
- **Bias layer** — outlet-level AllSides ratings on stories and sources, with coverage bars that keep unrated sources separate.
- **Blindspot** — recent stories where one side of the political spectrum is sharply under-represented, using a small-desk threshold.
- **My news bias** — a local reading mirror comparing the bias mix of articles you mark read with the mix on the desk.
- **Search** — SQLite FTS5 over the desk, plus live Wikipedia results in the command palette.
- **Local-first** — no accounts and no telemetry; the app only fetches the feeds and Wikipedia pages you ask for.

## Stack

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Drizzle ORM, `@libsql/client`, SQLite/Turso, FTS5, Ollama.

## Setup

Requires Node.js 20+ and npm. Ollama is optional but needed for generated briefs.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. With no Turso variables set, the database is created and migrated automatically at `data/brief.db`, and the source list is seeded on first use.

To pull the wires:

```bash
npm run ingest
```

Or use the refresh control in the app. Ingest is safe to run repeatedly; existing URLs are skipped.

Backfill images for articles that were ingested before media extraction was added:

```bash
npm run backfill:media
```

Use `--limit`, `--concurrency`, `--source`, `--missing-image`, or `--missing-resolved` to narrow the run.

### Import history

The history timeline ships empty. Seed it with the On This Day archive (all 366 days, ancient to present):

```bash
npm run import:history -- --source onthisday
```

Add dated Wikidata events for a year range. The importer only keeps events with an English Wikipedia article:

```bash
npm run import:history -- --source wikidata --from 1500 --to 2026 --step 10
npm run import:history -- --source wikidata --from -3000 --to 1499 --step 50
```

`--source all` runs both. On This Day is resumable: re-running skips days already imported. `--include-people` adds births and deaths (off by default).

### Wikipedia

Open `/wiki` for the reference desk, or use the command palette. Wikipedia results also appear alongside desk results in search. Pages, search results, and lead images are cached in SQLite; non-free files are labeled and link to their file pages.

Country tags for news are inferred from article text on ingest. Backfill older articles with:

```bash
npm run backfill:countries
```

### Import an existing news-aggregator database

```bash
LEGACY_DB=/path/to/news.db npm run import:legacy
```

## Local briefs

Brief calls Ollama at `OLLAMA_URL` (default `http://127.0.0.1:11434`). Pull a model and set it:

```bash
ollama pull dolphin3:8b
```

```env
OLLAMA_MODEL=dolphin3:8b
```

Briefs have a 150s generation budget. If the model is unavailable or too slow, the UI falls back to a deterministic summary of the day's coverage instead of failing.

## Environment

| Variable | Default | Purpose |
| --- | --- | --- |
| `TURSO_DATABASE_URL` | — | Turso/libSQL URL; overrides the local file database |
| `TURSO_AUTH_TOKEN` | — | Turso auth token |
| `BRIEF_DB_PATH` | `./data/brief.db` locally, `/tmp/brief/data/brief.db` on Vercel | Local SQLite database location when Turso is not configured |
| `OLLAMA_URL` | `http://127.0.0.1:11434` | Local Ollama endpoint |
| `OLLAMA_MODEL` | `dolphin3:8b` | Model used for the daily brief |
| `BRIEF_CLUSTER_THRESHOLD` | `0.42` | Cosine similarity needed to join a story |
| `BRIEF_CLUSTER_MIN_SHARED` | `2` | Minimum shared terms before clustering |
| `BRIEF_IMAGE_CACHE_MB` | `500` | On-disk cache limit for proxied article images |
| `BRIEF_WIKI_CACHE_DAYS` | `30` | Freshness window for cached Wikipedia pages |
| `BRIEF_WIKI_SEARCH_CACHE_HOURS` | `24` | Freshness window for Wikipedia search results |
| `BRIEF_WIKI_LEAD_CACHE_DAYS` | `30` | Freshness window for cached lead images |
| `BRIEF_WIKI_CACHE_PAGES` | `1000` | Maximum cached Wikipedia pages |
| `BRIEF_WIKI_LEAD_CACHE` | `5000` | Maximum cached Wikipedia lead images |
| `BRIEF_WIKI_SEARCH_CACHE` | `500` | Maximum cached Wikipedia searches |
| `LEGACY_DB` | — | Source DB for `npm run import:legacy` |

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript, no emit |
| `npm run ingest` | Fetch and cluster all enabled sources |
| `npm run import:history` | Import On This Day and/or Wikidata history |
| `npm run import:legacy` | Import articles from the old aggregator |
| `npm run backfill:countries` | Infer country tags for existing articles |
| `npm run backfill:media` | Backfill images and resolved URLs for existing articles |
| `npm run db:generate` | Generate a Drizzle migration |
| `npm run db:studio` | Open Drizzle Studio |

## Deploying and operations

Vercel and similar serverless hosts have a read-only filesystem outside `/tmp`, so local SQLite is **ephemeral** there. For a persistent deployment, use Turso:

1. Create a database with the Turso CLI or dashboard.
2. Set `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` in the host's environment.
3. Deploy, then run an ingest so the remote database is seeded and populated.

The schema, FTS tables, sources, and AllSides ratings are initialized automatically on first use. Proxied article images are cached in local storage, so that cache may be cold or non-persistent on serverless deployments.

`GET /api/health` reports storage/capability status, the last ingest run, and deployment warnings (including ephemeral local DB on serverless).

Ollama is only reachable from a deployed app if you expose it publicly; otherwise the daily brief falls back to the deterministic summary. Wikipedia and history content depend on external sources and local caches/imports: the history timeline is empty until `npm run import:history`, and Wikipedia pages fall back to cache when upstream requests fail. Server/API failures are logged as structured JSON to stdout/stderr for diagnosis.

## Bias data

Bias labels are outlet-level ratings from [AllSides](https://www.allsides.com/media-bias/ratings), used under CC BY-NC 4.0. They are not article-level judgments, and **unrated is never treated as Center**. Brief does not scrape Ground News, Ad Fontes, or Media Bias/Fact Check.

The Blindspot feed is a small-desk adaptation of Ground News' blindspot concept. It requires at least three rated sources, at least two sources from the opposing side, and an opposing share of at least 66% while the missing side is at or below 25%. With only 13 feeds, this is a prompt to widen sourcing, not a verdict.

There are no AI-written coverage summaries and no factuality labels in this layer.

## Keyboard shortcuts

| Keys | Action |
| --- | --- |
| `Cmd/Ctrl + K`, `/`, `?` | Open search and commands |
| `g` then `t` | Go to Today |
| `g` then `s` | Go to Stories |
| `g` then `f` | Go to Feed |
| `g` then `h` | Go to History |
| `g` then `w` | Go to the Wikipedia reference desk |
| `g` then `b` | Go to Blindspot |
| `g` then `m` | Go to My news bias |
| `g` then `v` | Go to Saved |
| `g` then `r` | Go to Sources |
| `j` / `k` | Move down / up the feed |
| `Enter` | Open the focused story |
| `s` | Save / unsave the focused article |
| `m` | Mark read / unread |
| `v` | Open the original article |
| `Esc` | Close the palette or panel |

## Structure

```
src/app/          routes: Today, feed, stories, reader, history, wiki, blindspot, my bias, saved, sources, API
src/components/   shell, command palette, filters, feed, reader, story rows, brief panel, source UI, bias/coverage UI
src/db/           Drizzle schema, libSQL init, FTS triggers, queries, coverage queries, reader/wiki caches
src/lib/ingest/   source definitions, fetch, ingest run
src/lib/history/  On This Day and Wikidata importers, event upsert
src/lib/          clustering, countries, Ollama brief, source ratings, reader, media, Wikipedia, text utilities
scripts/          ingest, history, country/media backfill, legacy import CLIs
drizzle/          generated migrations
data/             local SQLite database and image cache (gitignored)
```
