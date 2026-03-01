# Roadmap: BTS Army Feed

## Milestones

- ✅ **v1.0 Army Feed Expansion** -- Phases 1-4 (shipped 2026-03-01)
- **v2.0 Content Scraping Engine** -- Phases 5-8 (in progress)

## Phases

<details>
<summary>v1.0 Army Feed Expansion (Phases 1-4) -- SHIPPED 2026-03-01</summary>

- [x] Phase 1: Foundation (4/4 plans) -- completed 2026-02-25
- [x] Phase 2: Feed Expansion (5/5 plans) -- completed 2026-02-25
- [x] Phase 3: Short-Form Video (2/2 plans) -- completed 2026-02-26
- [x] Phase 4: Config-Driven UI (2/2 plans) -- completed 2026-02-26

</details>

### v2.0 Content Scraping Engine

- [x] **Phase 5: Foundation** -- Monorepo, database, scraper framework, Reddit scraper, minimal API, frontend feature flag
- [ ] **Phase 6: Scraper Expansion** -- All remaining source scrapers, engagement collection, thumbnails, scheduling
- [ ] **Phase 7: LLM Moderation Pipeline** -- Provider abstraction, relevance filtering, moderation, classification, batched processing
- [ ] **Phase 8: Smart Blend and Integration** -- Cross-source ranking, engagement normalization, API polish, frontend dual-mode

## Phase Details

### Phase 5: Foundation
**Goal**: A working end-to-end pipeline -- monorepo structure, database, one scraper (Reddit) writing to the DB on a schedule, and a minimal API endpoint serving that content -- proving the architecture before expanding
**Depends on**: Phase 4 (v1.0 complete)
**Requirements**: INFRA-01, INFRA-02, INFRA-03, INFRA-04, INFRA-05, INFRA-07, SCRAPE-01, API-01
**Success Criteria** (what must be TRUE):
  1. Running `npm install` from the repo root builds all three workspace packages (shared, frontend, server) with shared TypeScript types working in both
  2. The Reddit scraper runs on a cron schedule, writes deduplicated content items to the SQLite database, and a second run does not create duplicate rows
  3. `GET /api/feed` returns paginated JSON content from the database that matches the shared `FeedItem` type
  4. The existing v1.0 frontend continues to work unchanged (client-side fetching) when `VITE_API_URL` is not set
**Plans:** 4 plans

Plans:
- [x] 05-01-PLAN.md -- Monorepo restructure, shared types, and database schema
- [x] 05-02-PLAN.md -- Scraper framework, Reddit scraper, and scheduling
- [x] 05-03-PLAN.md -- Fastify API server, routes, and end-to-end verification
- [x] 05-04-PLAN.md -- Gap closure: configurable cron schedule and single-item feed endpoint

### Phase 6: Scraper Expansion
**Goal**: Full source coverage -- all configured sources scraped on schedule with engagement stats, thumbnails extracted, and stale content cleaned up
**Depends on**: Phase 5
**Requirements**: SCRAPE-02, SCRAPE-03, SCRAPE-04, SCRAPE-05, SCRAPE-06, SCRAPE-07, INFRA-06, API-03
**Success Criteria** (what must be TRUE):
  1. YouTube, RSS/news (Soompi, AllKPop, Koreaboo, HELLOKPOP, KpopStarz, Seoulbeats, Asian Junkie, Seoul Space), Tumblr, and Bluesky scrapers each produce content items in the database with source-appropriate engagement stats
  2. Every content item in the database has a thumbnail URL (or explicit null for text-only sources), and feed cards display media from all sources
  3. Content older than the configured age window is automatically cleaned up, and the database does not grow unbounded
  4. Scrape health is observable -- `scrape_runs` table tracks success/failure per source per run
**Plans:** 4 plans

Plans:
- [ ] 06-01-PLAN.md -- Schema evolution, shared types, soft-delete cleanup, engagement stats JSON
- [ ] 06-02-PLAN.md -- Source config expansion, thumbnail utilities, YouTube + RSS/news scrapers
- [ ] 06-03-PLAN.md -- Tumblr + Bluesky scrapers, all scrapers registered
- [ ] 06-04-PLAN.md -- Health status page, feed card thumbnails, broken image handling, verification

### Phase 7: LLM Moderation Pipeline
**Goal**: Scraped content is automatically filtered for relevance, moderated for safety, and classified by type -- with configurable LLM provider and cost controls
**Depends on**: Phase 6
**Requirements**: PIPE-01, PIPE-02, PIPE-03, PIPE-04, PIPE-05, PIPE-06
**Success Criteria** (what must be TRUE):
  1. Content items flow through a three-stage pipeline (raw -> pending -> approved/rejected) and the API only serves approved items
  2. Swapping the LLM provider via environment variable (e.g., Claude to OpenAI to mock) changes the moderation backend without code changes
  3. Irrelevant content from broad sources (e.g., general K-pop subreddits) is filtered out, and each approved item has a content type label (news, fan art, meme, video, discussion, translation, official)
  4. LLM calls are batched (10-20 items per call) and the system continues to function (auto-approve fallback) when the LLM provider is unavailable or over budget
**Plans**: TBD

Plans:
- [ ] 07-01: TBD
- [ ] 07-02: TBD

### Phase 8: Smart Blend and Integration
**Goal**: The feed is ranked by a multi-signal blend that surfaces the best content across sources, and the frontend consumes the API as its primary data source
**Depends on**: Phase 7
**Requirements**: RANK-01, RANK-02, RANK-03, API-02
**Success Criteria** (what must be TRUE):
  1. Feed ordering reflects a weighted blend of recency, normalized engagement, source diversity, and content type variety -- not just raw engagement or chronological order
  2. No single source dominates the feed -- engagement scores are normalized across sources so Reddit upvotes and YouTube views are comparable
  3. Fan translation accounts configured with priority boost appear higher in the feed than equivalent-engagement general content
  4. The frontend fetches from the API when `VITE_API_URL` is set, falls back to client-side fetching when it is not, and both modes produce a working feed
**Plans**: TBD

Plans:
- [ ] 08-01: TBD
- [ ] 08-02: TBD

## Progress

**Execution Order:** Phases execute in numeric order: 5 -> 6 -> 7 -> 8

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation | v1.0 | 4/4 | Complete | 2026-02-25 |
| 2. Feed Expansion | v1.0 | 5/5 | Complete | 2026-02-25 |
| 3. Short-Form Video | v1.0 | 2/2 | Complete | 2026-02-26 |
| 4. Config-Driven UI | v1.0 | 2/2 | Complete | 2026-02-26 |
| 5. Foundation | v2.0 | 4/4 | Complete | 2026-03-01 |
| 6. Scraper Expansion | v2.0 | 0/? | Not started | - |
| 7. LLM Moderation Pipeline | v2.0 | 0/? | Not started | - |
| 8. Smart Blend and Integration | v2.0 | 0/? | Not started | - |
