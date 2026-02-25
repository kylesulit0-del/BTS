# Roadmap: BTS Army Feed Expansion

## Overview

Expand the Army Feed from 5 sources to 8+ with engagement stats, short-form video embeds, and config-driven architecture that enables clone-and-swap for any fandom. The work flows from security and infrastructure hardening, through config extraction, into new content sources with engagement stats, then short-form video embeds, and finally config-driven UI completion. Each phase delivers a coherent, verifiable capability on top of the previous one.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation** - Security patches, infrastructure hardening, config extraction, and source registry
- [ ] **Phase 2: Feed Expansion** - New content sources (Tumblr, expanded Reddit, fan YouTube) with engagement stats
- [ ] **Phase 3: Short-Form Video** - YouTube Shorts and TikTok embeds with click-to-load pattern
- [ ] **Phase 4: Config-Driven UI** - Dynamic filter/chip generation from config and clone-and-swap validation

## Phase Details

### Phase 1: Foundation
**Goal**: The app is secure against XSS, resilient to CORS proxy failure, and all group-specific data lives in a single typed config object with a modular source registry
**Depends on**: Nothing (first phase)
**Requirements**: SEC-01, SEC-02, INFRA-01, INFRA-02, CONFIG-01, CONFIG-02
**Success Criteria** (what must be TRUE):
  1. All RSS/HTML content is sanitized through DOMPurify before rendering -- no innerHTML on untrusted content anywhere in the codebase
  2. CORS proxy attempts run in parallel and the feed loads noticeably faster when the first proxy in the chain is down
  3. Every BTS-specific keyword, subreddit name, channel ID, and member data value comes from a single typed GroupConfig object -- grep for hardcoded BTS references in service/component code returns zero matches
  4. Feed source fetchers are split into per-source modules with a registry that maps source type to fetcher function
  5. The app produces identical feed results as before the refactor (no regressions in existing functionality)
**Plans**: 4 plans

Plans:
- [ ] 01-01-PLAN.md — DOMPurify sanitization utility and parallel CORS proxy (SEC-01, SEC-02, INFRA-01)
- [ ] 01-02-PLAN.md — GroupConfig type system and BTS config data extraction (CONFIG-01)
- [ ] 01-03-PLAN.md — Source registry and per-source fetcher modules (INFRA-02)
- [ ] 01-04-PLAN.md — Wire config throughout app, eliminate hardcoded BTS references (CONFIG-02)

### Phase 2: Feed Expansion
**Goal**: Users see content from Tumblr fan blogs, additional Reddit subreddits, and fan YouTube channels, with Reddit engagement stats visible on feed cards
**Depends on**: Phase 1
**Requirements**: SRC-01, SRC-02, SRC-03, SRC-04, STAT-01, STAT-02, STAT-03
**Success Criteria** (what must be TRUE):
  1. User can see posts from meme and fan discussion subreddits (beyond the existing BTS subreddit) in the feed
  2. User can see content from fan YouTube channels (not just official BANGTANTV/HYBE) in the feed
  3. User can see Tumblr fan blog posts in the feed with properly sanitized HTML content
  4. User can filter the feed by Tumblr as a source type using the filter UI
  5. Reddit feed cards display upvote count and comment count when available, and show no empty/zero stats when data is missing
**Plans**: TBD

Plans:
- [ ] 02-01: TBD
- [ ] 02-02: TBD

### Phase 3: Short-Form Video
**Goal**: Users encounter short-form video content (YouTube Shorts, TikTok) rendered as embedded players directly in the feed
**Depends on**: Phase 2
**Requirements**: EMBED-01, EMBED-02, EMBED-03
**Success Criteria** (what must be TRUE):
  1. YouTube Shorts URLs render as vertical (9:16 aspect ratio) embedded video players in the feed
  2. TikTok URLs found in Reddit posts render as lazy-loaded embed players in the feed
  3. All video embeds use a click-to-load pattern -- user sees a thumbnail with play overlay, iframe loads only on click
**Plans**: TBD

Plans:
- [ ] 03-01: TBD

### Phase 4: Config-Driven UI
**Goal**: All UI elements that display group-specific data are generated from config, completing the clone-and-swap architecture
**Depends on**: Phase 1
**Requirements**: CONFIG-03, CONFIG-04
**Success Criteria** (what must be TRUE):
  1. FeedFilter tabs and BiasFilter member chips are generated dynamically from the GroupConfig -- no hardcoded filter arrays in component code
  2. Changing the config import in config/index.ts to a different group's config file swaps the entire app (members, sources, filters, keywords) with zero code changes
**Plans**: TBD

Plans:
- [ ] 04-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 0/4 | Planned | - |
| 2. Feed Expansion | 0/0 | Not started | - |
| 3. Short-Form Video | 0/0 | Not started | - |
| 4. Config-Driven UI | 0/0 | Not started | - |
