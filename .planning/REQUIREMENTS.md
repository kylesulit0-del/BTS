# Requirements: BTS Army Feed Expansion

**Defined:** 2026-02-25
**Core Value:** Fans see a rich, diverse stream of BTS content from everywhere — official and fan-created — with engagement stats that help surface the best content, all without leaving the app.

## v1 Requirements

Requirements for v1.0 milestone. Each maps to roadmap phases.

### Config Architecture

- [ ] **CONFIG-01**: All BTS-specific keywords, subreddit names, channel IDs, and member data extracted to a single typed GroupConfig object
- [ ] **CONFIG-02**: App reads all group-specific data from config — zero hardcoded BTS references in service/component code
- [ ] **CONFIG-03**: FeedFilter tabs and BiasFilter chips generated dynamically from config instead of hardcoded arrays
- [ ] **CONFIG-04**: Changing the config import in `config/index.ts` swaps the entire app to a different group with no code changes

### Security

- [ ] **SEC-01**: `stripHtml` replaced with DOMPurify sanitization for all RSS/HTML content
- [ ] **SEC-02**: Tumblr HTML content sanitized with restrictive DOMPurify allowlist before rendering

### Infrastructure

- [ ] **INFRA-01**: CORS proxy attempts run in parallel (all proxies tried simultaneously, first success used)
- [ ] **INFRA-02**: Feed source fetchers split into per-source modules with a source registry mapping type to fetcher function

### Feed Sources

- [ ] **SRC-01**: User can see content from additional Reddit subreddits (memes, fan discussion) in the feed
- [ ] **SRC-02**: User can see content from fan YouTube channels (beyond official BANGTANTV/HYBE) in the feed
- [ ] **SRC-03**: User can see Tumblr fan blog content in the feed via RSS integration
- [ ] **SRC-04**: User can filter feed by new source types (Tumblr appears as a filter option)

### Engagement Stats

- [ ] **STAT-01**: User can see upvote count on Reddit feed cards
- [ ] **STAT-02**: User can see comment count on Reddit feed cards
- [ ] **STAT-03**: Engagement stats display gracefully — shown when available, hidden when not (no empty/zero stats)

### Short-Form Video

- [ ] **EMBED-01**: YouTube Shorts detected and rendered in 9:16 vertical aspect ratio iframe
- [ ] **EMBED-02**: TikTok URLs detected in Reddit posts and rendered as lazy-loaded embed players
- [ ] **EMBED-03**: Video embeds use click-to-load pattern (thumbnail + play overlay, load iframe on click)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Engagement Enrichment

- **ENRICH-01**: YouTube view counts displayed on YouTube feed cards (requires optional API key in config)
- **ENRICH-02**: Cross-source engagement normalization for popularity-based sorting

### Content Expansion

- **CONTENT-01**: Weverse content via curated links in config (link-out only)
- **CONTENT-02**: YouTube inline video embed in FeedCard list view (port SwipeFeed iframe pattern)
- **CONTENT-03**: Instagram Reels embeds (requires backend proxy for Meta access token)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Instagram Reels embeds | Meta requires developer app + access token + server-side proxy; impossible client-side |
| Weverse content scraping | No public API, no RSS, client-side scraping architecturally impossible |
| YouTube view counts | Requires API key, adds deployment friction for every clone; defer to v2 |
| Backend server | Staying client-side with CORS proxies per project constraint |
| User accounts/authentication | Not part of this app's model |
| Multi-group in single instance | Config is per-clone, not multi-tenant per project constraint |
| Real-time feed updates | No backend for WebSocket; polling through CORS proxies would hit rate limits |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| CONFIG-01 | — | Pending |
| CONFIG-02 | — | Pending |
| CONFIG-03 | — | Pending |
| CONFIG-04 | — | Pending |
| SEC-01 | — | Pending |
| SEC-02 | — | Pending |
| INFRA-01 | — | Pending |
| INFRA-02 | — | Pending |
| SRC-01 | — | Pending |
| SRC-02 | — | Pending |
| SRC-03 | — | Pending |
| SRC-04 | — | Pending |
| STAT-01 | — | Pending |
| STAT-02 | — | Pending |
| STAT-03 | — | Pending |
| EMBED-01 | — | Pending |
| EMBED-02 | — | Pending |
| EMBED-03 | — | Pending |

**Coverage:**
- v1 requirements: 18 total
- Mapped to phases: 0
- Unmapped: 18

---
*Requirements defined: 2026-02-25*
*Last updated: 2026-02-25 after initial definition*
