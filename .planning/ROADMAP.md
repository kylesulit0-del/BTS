# Roadmap: BTS Army Feed

## Milestones

- ✅ **v1.0 Army Feed Expansion** -- Phases 1-4 (shipped 2026-03-01)
- ✅ **v2.0 Content Scraping Engine** -- Phases 5-8 (shipped 2026-03-02)
- ✅ **v3.0 Immersive Feed Experience** -- Phases 9-12 (shipped 2026-03-03)
- ✅ **v4.0 Enhanced Feed UI & Navigation** -- Phases 13-15 (shipped 2026-03-06)
- 🚧 **v5.1 Quick Wins** -- Phases 16-17 (in progress)

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

<details>
<summary>✅ v4.0 Enhanced Feed UI & Navigation (Phases 13-15) -- SHIPPED 2026-03-06</summary>

- [x] Phase 13: Fixed Header & Sort Bottom Sheet (2/2 plans) -- completed 2026-03-04
- [x] Phase 14: Video Touch Overlay (1/1 plans) -- completed 2026-03-04
- [x] Phase 15: Media-Centric Card Layout (2/2 plans) -- completed 2026-03-06

</details>

### 🚧 v5.1 Quick Wins (In Progress)

- [ ] **Phase 16: Source Expansion** - Add Reddit subs, Google News RSS, K-pop news RSS, AO3, and Tumblr blogs to scraper config
- [ ] **Phase 17: Content Type Filter Expansion** - Add fan_fiction and music types across shared types, LLM pipeline, server filter, and frontend UI

## Phase Details

### Phase 16: Source Expansion
**Goal**: Users see content from a wider range of sources -- solo member subreddits, Google News, AO3 fan fiction, and additional Tumblr/news blogs
**Depends on**: Phase 15 (v4.0 complete)
**Requirements**: SRCX-01, SRCX-02, SRCX-03, SRCX-04, SRCX-05, SRCX-06, SRCX-07, SRCX-08
**Success Criteria** (what must be TRUE):
  1. Feed contains posts from r/BTSARMY, r/Korean_Hip_Hop, and 7 solo member subreddits (r/Namjoon, r/jinbts, r/Suga, r/jhope, r/jimin, r/taehyung, r/jungkook)
  2. Feed contains Google News articles from BTS-scoped query feeds
  3. Feed contains AO3 fan fiction entries (title, author, summary, link -- no story text)
  4. K-pop news RSS sources (Billboard, Rolling Stone) are either added as working feeds or documented as unavailable
  5. FilterSheet source filter shows correct labels and badge colors for all new source types
**Plans**: TBD

### Phase 17: Content Type Filter Expansion
**Goal**: Users can filter the feed by expanded content type categories including fan fiction and music
**Depends on**: Phase 16 (new sources must exist for source-level defaults)
**Requirements**: CTYP-01, CTYP-02, CTYP-03, CTYP-04, CTYP-05, CTYP-06
**Success Criteria** (what must be TRUE):
  1. LLM pipeline classifies content into expanded type set including `fan_fiction` and `music`
  2. AO3 items are automatically classified as `fan_fiction` at ingest time (source-level default, no LLM needed)
  3. FilterSheet displays updated content type categories (Fan Fiction, Music, and others) with correct badge colors
  4. Selecting a content type filter in the UI returns only items of that type from the server
**Plans**: TBD

## Progress

**Execution Order:** 16 → 17

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
| 13. Fixed Header & Sort Bottom Sheet | v4.0 | 2/2 | Complete | 2026-03-04 |
| 14. Video Touch Overlay | v4.0 | 1/1 | Complete | 2026-03-04 |
| 15. Media-Centric Card Layout | v4.0 | 2/2 | Complete | 2026-03-06 |
| 16. Source Expansion | v5.1 | 0/? | Not started | - |
| 17. Content Type Filter Expansion | v5.1 | 0/? | Not started | - |
