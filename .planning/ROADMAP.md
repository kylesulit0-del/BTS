# Roadmap: BTS Army Feed

## Milestones

- ✅ **v1.0 Army Feed Expansion** -- Phases 1-4 (shipped 2026-03-01)
- ✅ **v2.0 Content Scraping Engine** -- Phases 5-8 (shipped 2026-03-02)
- ✅ **v3.0 Immersive Feed Experience** -- Phases 9-12 (shipped 2026-03-03)
- 🚧 **v4.0 Enhanced Feed UI & Navigation** -- Phases 13-15 (in progress)

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

<details>
<summary>✅ v3.0 Immersive Feed Experience (Phases 9-12) -- SHIPPED 2026-03-03</summary>

- [x] Phase 9: API Contract and State Foundation (2/2 plans) -- completed 2026-03-03
- [x] Phase 10: Snap Feed Core (4/4 plans) -- completed 2026-03-03
- [x] Phase 11: Sort and Filter Controls (2/2 plans) -- completed 2026-03-03
- [x] Phase 12: Polish and Animations (2/2 plans) -- completed 2026-03-03

</details>

### 🚧 v4.0 Enhanced Feed UI & Navigation (In Progress)

- [ ] **Phase 13: Fixed Header & Sort Bottom Sheet** - Always-visible header with branding and sort/filter actions; sort bottom sheet matching filter design
- [ ] **Phase 14: Video Touch Overlay** - Transparent gesture layer over video iframes enabling swipe navigation and tap play/pause
- [ ] **Phase 15: Media-Centric Card Layout** - Unified two-zone card layout with media top, info bottom, auto-snippets, and source links

## Phase Details

### Phase 13: Fixed Header & Sort Bottom Sheet
**Goal**: Users always see the app header and can access sort/filter controls without scrolling or tapping a reveal zone
**Depends on**: Phase 12
**Requirements**: NAV-01, NAV-02, NAV-03, NAV-04, NAV-05
**Success Criteria** (what must be TRUE):
  1. "Army Feed" branding is visible at the top of the screen on every card in the feed, without tapping or scrolling to reveal it
  2. Sort and Filter buttons in the header open their respective bottom sheets, and both sheets share the same slide-up animation and visual design
  3. Selecting a sort option in the Sort sheet reorders the feed (Recommended/Newest/Oldest/Popular/Discussed all work)
  4. The old auto-hide control bar, snap-reveal-zone, and useControlBarVisibility code are gone -- no invisible tap targets remain
  5. Vertical swipe navigation between cards still works correctly with the header in place (feed height adjusts to remaining viewport)
**Plans:** 2 plans
Plans:
- [ ] 13-01-PLAN.md -- Create FixedHeader and SortSheet components with CSS styles
- [ ] 13-02-PLAN.md -- Wire into News.tsx, delete old control bar code, verify integration

### Phase 14: Video Touch Overlay
**Goal**: Users can swipe vertically through video cards just as smoothly as image and text cards, and tap to play/pause
**Depends on**: Phase 13
**Requirements**: GEST-01, GEST-02, GEST-03
**Success Criteria** (what must be TRUE):
  1. Swiping up or down on a card with an embedded YouTube video navigates to the next/previous card (verified on physical iOS device)
  2. Tapping on a video card toggles play/pause on the video player
  3. Right-swiping on a video card opens the source URL in a new tab, same as on image and text cards
**Plans**: TBD

### Phase 15: Media-Centric Card Layout
**Goal**: Every card in the feed has a consistent, media-forward layout with media filling the top ~60% and structured info below
**Depends on**: Phase 14
**Requirements**: CARD-01, CARD-02, CARD-03, CARD-04, CARD-05, CARD-06, CARD-07
**Success Criteria** (what must be TRUE):
  1. All card types (video, image, text) display a two-zone layout: media/visual at top (~60% viewport), info panel at bottom
  2. Every card shows a bold title, metadata row (date + available engagement stats), and a text snippet (first 100-150 characters of description)
  3. "(Show More)" at the end of the snippet opens the original source URL in a new tab
  4. Text-only posts without media display a branded gradient placeholder in the media zone instead of a blank area
  5. The SeeMoreSheet component is removed (replaced by the "(Show More)" source URL link)

## Progress

**Execution Order:** Phases execute sequentially: 13 → 14 → 15

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
| 9. API Contract and State Foundation | v3.0 | 2/2 | Complete | 2026-03-03 |
| 10. Snap Feed Core | v3.0 | 4/4 | Complete | 2026-03-03 |
| 11. Sort and Filter Controls | v3.0 | 2/2 | Complete | 2026-03-03 |
| 12. Polish and Animations | v3.0 | 2/2 | Complete | 2026-03-03 |
| 13. Fixed Header & Sort Bottom Sheet | v4.0 | 0/2 | In progress | - |
| 14. Video Touch Overlay | v4.0 | 0/? | Not started | - |
| 15. Media-Centric Card Layout | v4.0 | 0/? | Not started | - |
