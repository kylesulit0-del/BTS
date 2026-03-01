# Requirements: BTS Army Feed

**Defined:** 2026-03-01
**Core Value:** Fans see a rich, diverse stream of content from everywhere with engagement stats that help surface the best content, all without leaving the app.

## v2.0 Requirements

Requirements for the Content Scraping Engine milestone. Each maps to roadmap phases.

### Infrastructure

- [x] **INFRA-01**: Monorepo with shared types between frontend and backend (npm workspaces)
- [x] **INFRA-02**: SQLite database with Drizzle ORM schema for content items, engagement snapshots, moderation results, and scrape runs
- [ ] **INFRA-03**: Scraping engine framework with abstract scraper interface, error handling, rate limiting, and retry logic
- [ ] **INFRA-04**: Scheduled scraping via node-cron at configurable 15-30 minute intervals
- [ ] **INFRA-05**: URL-based deduplication with normalized canonical URLs as unique constraint
- [ ] **INFRA-06**: Content age windowing with configurable max age and periodic cleanup
- [x] **INFRA-07**: Config-driven group targeting -- all scrape targets, keywords, and member names in swappable config

### Source Scrapers

- [ ] **SCRAPE-01**: Reddit scraper via JSON endpoints (6+ subreddits from config, engagement stats)
- [ ] **SCRAPE-02**: YouTube scraper via RSS feeds with optional Data API for view counts
- [ ] **SCRAPE-03**: RSS/news site scrapers (Soompi, AllKPop, Koreaboo, HELLOKPOP, KpopStarz, and more)
- [ ] **SCRAPE-04**: Tumblr scraper via RSS feeds (5+ blogs from config)
- [ ] **SCRAPE-05**: Bluesky scraper via AT Protocol public API (keyword-based post search)
- [ ] **SCRAPE-06**: Expanded K-pop news sources via RSS (Seoulbeats, Asian Junkie, Korea Herald entertainment, Seoul Space)
- [ ] **SCRAPE-07**: Thumbnail and media URL extraction per source for feed card display

### Content Pipeline

- [ ] **PIPE-01**: LLM provider abstraction with configurable provider (Claude, OpenAI, etc.)
- [ ] **PIPE-02**: LLM relevance filtering -- classify scraped content as group-related or not, with confidence score
- [ ] **PIPE-03**: LLM content moderation -- flag inappropriate or unsafe content
- [ ] **PIPE-04**: LLM content type classification (news, fan art, meme, video, discussion, translation, official)
- [ ] **PIPE-05**: Batched LLM processing -- combine relevance + moderation + classification in single call, 10-20 items per batch
- [ ] **PIPE-06**: Three-stage content status pipeline (raw -> pending -> approved/rejected) with auto-approve fallback

### Ranking

- [ ] **RANK-01**: Cross-source engagement normalization via per-source z-score over rolling 7-day window
- [ ] **RANK-02**: Smart blend scoring -- weighted combination of recency, normalized engagement, source diversity, and content type variety
- [ ] **RANK-03**: Fan translation account prioritization via configurable priority boost in source config

### API & Integration

- [ ] **API-01**: REST API server (Fastify) with paginated feed endpoint, single-item endpoint, and source health endpoint
- [ ] **API-02**: Dual-mode frontend -- API mode when `VITE_API_URL` is set, client-side fallback otherwise
- [ ] **API-03**: Engagement data collection and storage with per-source stat extraction

## v2.1+ Requirements

Deferred to future milestones. Tracked but not in current roadmap.

### Fragile Source Scrapers

- **SCRAPE-08**: Twitter/X scraper -- HIGH complexity, needs budget decision ($25-50/mo third-party API or 10-15 hrs/month DIY maintenance)
- **SCRAPE-09**: TikTok scraper -- HIGH complexity, Playwright + anti-bot measures, periodic breakage expected
- **SCRAPE-10**: Instagram scraper -- HIGH complexity, GraphQL rotates every 2-4 weeks, needs residential proxies $20-50/mo

### Advanced Features

- **SEARCH-01**: Full-text search via SQLite FTS5 extension
- **NOTIFY-01**: Push notifications for high-priority content (official posts)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Weverse scraping | No public API, HMAC-authenticated private API, aggressive anti-scraping, legal risk |
| Real-time WebSocket updates | 15-min polling sufficient; content is not time-critical |
| User accounts / authentication | Member bias filtering + localStorage preferences sufficient |
| Multi-tenant group switching | Config-driven clone-and-swap model is simpler and proven |
| Media caching / CDN proxy | Storage costs, copyright issues; source CDN URLs are stable |
| Scraping authenticated/private content | Legal liability, ToS violations, ethical boundary |
| Automated proxy rotation | Only needed for adversarial platforms (deferred sources) |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFRA-01 | Phase 5 | Complete |
| INFRA-02 | Phase 5 | Complete |
| INFRA-03 | Phase 5 | Pending |
| INFRA-04 | Phase 5 | Pending |
| INFRA-05 | Phase 5 | Pending |
| INFRA-06 | Phase 6 | Pending |
| INFRA-07 | Phase 5 | Complete |
| SCRAPE-01 | Phase 5 | Pending |
| SCRAPE-02 | Phase 6 | Pending |
| SCRAPE-03 | Phase 6 | Pending |
| SCRAPE-04 | Phase 6 | Pending |
| SCRAPE-05 | Phase 6 | Pending |
| SCRAPE-06 | Phase 6 | Pending |
| SCRAPE-07 | Phase 6 | Pending |
| PIPE-01 | Phase 7 | Pending |
| PIPE-02 | Phase 7 | Pending |
| PIPE-03 | Phase 7 | Pending |
| PIPE-04 | Phase 7 | Pending |
| PIPE-05 | Phase 7 | Pending |
| PIPE-06 | Phase 7 | Pending |
| RANK-01 | Phase 8 | Pending |
| RANK-02 | Phase 8 | Pending |
| RANK-03 | Phase 8 | Pending |
| API-01 | Phase 5 | Pending |
| API-02 | Phase 8 | Pending |
| API-03 | Phase 6 | Pending |

**Coverage:**
- v2.0 requirements: 26 total
- Mapped to phases: 26
- Unmapped: 0

---
*Requirements defined: 2026-03-01*
*Last updated: 2026-03-01 after roadmap creation*
