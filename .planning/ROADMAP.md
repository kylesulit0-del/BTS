# Roadmap: BTS Army Feed

## Milestones

- ✅ **v1.0 Army Feed Expansion** -- Phases 1-4 (shipped 2026-03-01)
- ✅ **v2.0 Content Scraping Engine** -- Phases 5-8 (shipped 2026-03-02)
- 🚧 **v3.0 Immersive Feed Experience** -- Phases 9-12 (in progress)

## Phases

<details>
<summary>✅ v1.0 Army Feed Expansion (Phases 1-4) -- SHIPPED 2026-03-01</summary>

- [x] Phase 1: Foundation (4/4 plans) -- completed 2026-02-25
- [x] Phase 2: Feed Expansion (5/5 plans) -- completed 2026-02-25
- [x] Phase 3: Short-Form Video (2/2 plans) -- completed 2026-02-26
- [x] Phase 4: Config-Driven UI (2/2 plans) -- completed 2026-02-26

</details>

<details>
<summary>✅ v2.0 Content Scraping Engine (Phases 5-8) -- SHIPPED 2026-03-02</summary>

- [x] Phase 5: Foundation (4/4 plans) -- completed 2026-03-01
- [x] Phase 6: Scraper Expansion (4/4 plans) -- completed 2026-03-02
- [x] Phase 7: LLM Moderation Pipeline (3/3 plans) -- completed 2026-03-02
- [x] Phase 8: Smart Blend and Integration (2/2 plans) -- completed 2026-03-02

</details>

### 🚧 v3.0 Immersive Feed Experience (In Progress)

**Milestone Goal:** Replace existing feed views with an immersive TikTok-style vertical snap feed with granular sort/filter controls and performant virtualization.

- [ ] **Phase 9: API Contract and State Foundation** - Server-side sort endpoint, feed state hook with URL sync, feature flag routing, theme tokens
- [x] **Phase 10: Snap Feed Core** - Full-viewport snapping cards with adaptive layouts, configurable DOM virtualization (default 5), video lifecycle management (completed 2026-03-03)
- [x] **Phase 11: Sort and Filter Controls** - Unified control bar with sort modes, source/member/type filters, auto-hide behavior (completed 2026-03-03)
- [ ] **Phase 12: Polish and Animations** - Motion entrance/exit transitions, engagement stats action bar, skeleton loading states

## Phase Details

### Phase 9: API Contract and State Foundation
**Goal**: Server-side sort API exists, feed state is managed via URL-synced hook, and the app can route between old and new feed views via config flag
**Depends on**: Phase 8
**Requirements**: PERF-02, PERF-03, CONF-01, CONF-02
**Success Criteria** (what must be TRUE):
  1. User can append `?sort=newest` (or popular/discussed/oldest) to the API URL and receive correctly sorted feed results from the server
  2. User's active filter and sort selections persist in the browser URL and survive a full page refresh
  3. Setting `feedMode: 'snap'` in config renders the new snap feed container; setting `feedMode: 'list'` renders the existing SwipeFeed
  4. CSS custom properties from the extended ThemeConfig tokens are applied to the document and visible in browser dev tools
**Plans**: 2 plans

Plans:
- [ ] 09-01-PLAN.md -- Server-side sort endpoint with SortMode type and frontend API client propagation
- [ ] 09-02-PLAN.md -- URL-synced feed state hook, feedMode config flag, and extended theme tokens

### Phase 10: Snap Feed Core
**Goal**: Users experience an immersive full-screen vertical feed where each content piece fills the viewport, videos play inline, and only a configurable number of items exist in the DOM at any time (default 5)
**Depends on**: Phase 9
**Requirements**: SNAP-01, SNAP-02, SNAP-03, SNAP-04, SNAP-05, SNAP-06, SNAP-07, PERF-01
**Success Criteria** (what must be TRUE):
  1. Each feed post fills the entire viewport height (100svh) and the user can flick/scroll to snap precisely to the next post
  2. Video posts show an inline player that autoplays when snapped into view and pauses when scrolled away; at most one video iframe exists in the DOM
  3. Image posts display a large background with text overlay, and text-heavy posts use a reading-focused layout -- card type adapts to content
  4. Long text on any card is collapsed with a "See More" tap target that opens a modal/drawer overlay (not in-place expansion)
  5. User can tap a source link icon on any card to open the original content in a new browser tab
**Plans**: 4 plans

Plans:
- [x] 10-01-PLAN.md -- Snap feed container with CSS scroll-snap, DOM virtualization, and seamless looping
- [x] 10-02-PLAN.md -- Adaptive card layouts (image/video/text), metadata, source link, and See More bottom sheet
- [x] 10-03-PLAN.md -- Video lifecycle (autoplay/pause, single iframe), mute state, and right-swipe gesture
- [x] 10-04-PLAN.md -- Gap closure: reconcile SNAP-04 requirement text with DOM_WINDOW_SIZE=5 implementation

### Phase 11: Sort and Filter Controls
**Goal**: Users can control what appears in their feed through a unified bar offering sort modes and source/member/content-type filters
**Depends on**: Phase 10
**Requirements**: FILT-01, FILT-02, FILT-03, FILT-04, FILT-05, FILT-06
**Success Criteria** (what must be TRUE):
  1. User can switch between Recommended, Newest, Oldest, Most Popular, and Most Discussed sort orders and the feed re-renders with correctly ordered results
  2. User can filter by any combination of source (Reddit, YouTube, RSS, Tumblr, Bluesky), member, and content type, and the feed shows only matching content
  3. The unified control bar consolidates all sort/filter options into a single row that auto-hides on scroll-down and reappears on scroll-up
**Plans**: 2 plans

Plans:
- [ ] 11-01-PLAN.md -- Feed state refactor (multi-select, localStorage), overlay control bar with sort tabs, auto-hide visibility hook
- [ ] 11-02-PLAN.md -- Filter bottom sheet with Source/Member/Type tabs, chip toggles, integration wiring

### Phase 12: Polish and Animations
**Goal**: The feed feels premium with smooth card transitions, visible engagement stats, and polished loading states
**Depends on**: Phase 11
**Requirements**: PLSH-01, PLSH-02, PLSH-03
**Success Criteria** (what must be TRUE):
  1. Cards animate in with Motion entrance transitions when snapping into view and animate out when leaving
  2. Each card displays engagement stats (upvotes, comments, views) as a vertical action bar with icons and abbreviated counts
  3. While the feed loads, the user sees a full-viewport skeleton card placeholder instead of a blank screen or spinner
**Plans**: 2 plans

Plans:
- [ ] 12-01-PLAN.md -- Engagement stats bar (SnapStatsBar) and shimmer skeleton loading state (SnapSkeleton)
- [ ] 12-02-PLAN.md -- Card entrance animations (CSS slide-up + fade-in) and control bar initial slide-down

## Progress

**Execution Order:**
Phases execute in numeric order: 9 -> 10 -> 11 -> 12

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation | v1.0 | 4/4 | Complete | 2026-02-25 |
| 2. Feed Expansion | v1.0 | 5/5 | Complete | 2026-02-25 |
| 3. Short-Form Video | v1.0 | 2/2 | Complete | 2026-02-26 |
| 4. Config-Driven UI | v1.0 | 2/2 | Complete | 2026-02-26 |
| 5. Foundation | v2.0 | 4/4 | Complete | 2026-03-01 |
| 6. Scraper Expansion | v2.0 | 4/4 | Complete | 2026-03-02 |
| 7. LLM Moderation Pipeline | v2.0 | 3/3 | Complete | 2026-03-02 |
| 8. Smart Blend and Integration | v2.0 | 2/2 | Complete | 2026-03-02 |
| 9. API Contract and State Foundation | v3.0 | 0/2 | Not started | - |
| 10. Snap Feed Core | v3.0 | 4/4 | Complete | 2026-03-03 |
| 11. Sort and Filter Controls | 2/2 | Complete    | 2026-03-03 | - |
| 12. Polish and Animations | v3.0 | 0/? | Not started | - |
