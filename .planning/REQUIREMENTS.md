# Requirements: BTS Army Feed

**Defined:** 2026-03-04
**Core Value:** Fans see a rich, diverse stream of content from everywhere with engagement stats that help surface the best content, all without leaving the app.

## v4.0 Requirements

Requirements for Enhanced Feed UI & Navigation milestone.

### Header & Navigation

- [ ] **NAV-01**: Fixed header with "Army Feed" branding always visible at top-left
- [ ] **NAV-02**: Sort and Filter action buttons at top-right of fixed header
- [ ] **NAV-03**: Sort button opens bottom sheet with sort options (Recommended/Newest/Oldest/Popular/Discussed)
- [ ] **NAV-04**: Sort and Filter bottom sheets share consistent slide-up design language
- [ ] **NAV-05**: Remove auto-hide control bar and related dead code (useControlBarVisibility, snap-reveal-zone)

### Card Layout

- [ ] **CARD-01**: Media asset rendered at top of card, filling ~60% of viewport height
- [ ] **CARD-02**: Post title displayed bold below media for all card types
- [ ] **CARD-03**: Metadata row below title showing upload date and available engagement stats (likes, comments, views)
- [ ] **CARD-04**: Auto-snippet of first 100-150 characters of post description below metadata
- [ ] **CARD-05**: "(Show More)" link at end of snippet opens source URL in new tab
- [ ] **CARD-06**: Text-only posts display branded gradient placeholder in 60% media zone
- [ ] **CARD-07**: Remove SeeMoreSheet component (replaced by source URL link)

### Gesture & Video

- [ ] **GEST-01**: Transparent touch overlay on video iframes intercepts vertical swipes for feed navigation
- [ ] **GEST-02**: Taps on video overlay pass through to video player (play/pause)
- [ ] **GEST-03**: Horizontal swipe gesture continues to work over video cards (open source link)

## Future Requirements

None deferred — full spec included in v4.0.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Dark/light mode toggle | App is dark-first; light mode doubles CSS surface area |
| Infinite scroll auto-fetch | Wrong model for snap feed; API returns full ranked feed |
| Pull-to-refresh | Conflicts with scroll-snap overscroll behavior on mobile |
| Card counter in header | Not requested; keeps header minimal |
| Active filter chips in header | Not requested; filter state visible in filter sheet |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| NAV-01 | — | Pending |
| NAV-02 | — | Pending |
| NAV-03 | — | Pending |
| NAV-04 | — | Pending |
| NAV-05 | — | Pending |
| CARD-01 | — | Pending |
| CARD-02 | — | Pending |
| CARD-03 | — | Pending |
| CARD-04 | — | Pending |
| CARD-05 | — | Pending |
| CARD-06 | — | Pending |
| CARD-07 | — | Pending |
| GEST-01 | — | Pending |
| GEST-02 | — | Pending |
| GEST-03 | — | Pending |

**Coverage:**
- v4.0 requirements: 15 total
- Mapped to phases: 0
- Unmapped: 15

---
*Requirements defined: 2026-03-04*
*Last updated: 2026-03-04 after initial definition*
