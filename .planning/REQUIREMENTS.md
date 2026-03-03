# Requirements: BTS Army Feed

**Defined:** 2026-03-03
**Core Value:** Fans see a rich, diverse stream of content from everywhere with engagement stats that help surface the best content, all without leaving the app.

## v3.0 Requirements

Requirements for the Immersive Feed Experience milestone. Each maps to roadmap phases.

### Snap Feed

- [x] **SNAP-01**: User sees a full-viewport vertical snap feed where each post fills the screen (100svh)
- [x] **SNAP-02**: User can flick/scroll to snap to the next content piece
- [x] **SNAP-03**: User sees adaptive card layouts — video posts get full-bleed player, image posts get large background with overlay, text posts get reading-focused layout
- [x] **SNAP-04**: User sees only a configurable number of items rendered in DOM at any time (default 5 — current + 2 prev + 2 next) for performance
- [x] **SNAP-05**: User sees long text collapsed with "See More" that opens a modal/drawer overlay
- [x] **SNAP-06**: User can tap a source link icon to navigate to the original content in a new tab
- [x] **SNAP-07**: Videos autoplay when snapped into view and pause when scrolled away

### Sort & Filter

- [x] **FILT-01**: User can sort the feed by Recommended (default), Newest, Oldest, Most Popular, or Most Discussed
- [x] **FILT-02**: User sees a unified control bar consolidating source, member, and content type filters
- [x] **FILT-03**: User can filter by source (Reddit, YouTube, RSS, Tumblr, Bluesky)
- [x] **FILT-04**: User can filter by member (RM, Jin, Suga, j-hope, Jimin, V, Jungkook, OT7)
- [x] **FILT-05**: User can filter by content type (Video, Image, News, Discussion)
- [x] **FILT-06**: Control bar auto-hides on scroll-down and reappears on scroll-up

### Performance

- [x] **PERF-01**: At most one video iframe exists in the DOM at any time (facade pattern for others)
- [x] **PERF-02**: Sort is computed server-side via API `sort` query parameter
- [x] **PERF-03**: Filter/sort state persists in URL params and survives page refresh

### Polish

- [ ] **PLSH-01**: Cards animate in/out with Motion entrance/exit transitions
- [x] **PLSH-02**: Engagement stats displayed as vertical action bar (icons + abbreviated counts)
- [x] **PLSH-03**: Loading state shows full-viewport skeleton card

### Config

- [x] **CONF-01**: Config feature flag `feedMode: 'snap' | 'list'` toggles between snap feed and traditional list
- [x] **CONF-02**: Extended ThemeConfig with semantic styling tokens applied as CSS custom properties

## Future Requirements

Deferred to v3.1+ or later milestones.

### Polish Enhancements

- **PLSH-04**: Haptic feedback on snap (Android only, navigator.vibrate)
- **PLSH-05**: Web Share API integration on each card
- **PLSH-06**: Auto-refresh feed when tab becomes visible after 5+ minutes

### Advanced Theming

- **THEME-01**: Full semantic + component token system in config (primitives → semantic → component layers)
- **THEME-02**: Gesture-based quick filters (long-press card to filter by source/member)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Framer Motion drag-based navigation | Conflicts with native CSS scroll-snap physics — Motion cannot control scroll |
| Infinite scroll auto-fetch | Wrong model for snap feed; current API returns full ranked feed |
| Pull-to-refresh | Conflicts with scroll-snap overscroll behavior on mobile |
| Horizontal swipe actions | Conflicts with browser back/forward gestures |
| Dark/light mode toggle | App is dark-first; light mode doubles CSS surface area |
| Full-screen video player mode | Embedded iframes already have native fullscreen buttons |
| New source scrapers (Weverse, X, Instagram, TikTok) | High complexity, out of scope for this UI milestone |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SNAP-01 | Phase 10 | Complete |
| SNAP-02 | Phase 10 | Complete |
| SNAP-03 | Phase 10 | Complete |
| SNAP-04 | Phase 10 | Complete |
| SNAP-05 | Phase 10 | Complete |
| SNAP-06 | Phase 10 | Complete |
| SNAP-07 | Phase 10 | Complete |
| FILT-01 | Phase 11 | Complete |
| FILT-02 | Phase 11 | Complete |
| FILT-03 | Phase 11 | Complete |
| FILT-04 | Phase 11 | Complete |
| FILT-05 | Phase 11 | Complete |
| FILT-06 | Phase 11 | Complete |
| PERF-01 | Phase 10 | Complete |
| PERF-02 | Phase 9 | Complete |
| PERF-03 | Phase 9 | Complete |
| PLSH-01 | Phase 12 | Pending |
| PLSH-02 | Phase 12 | Complete |
| PLSH-03 | Phase 12 | Complete |
| CONF-01 | Phase 9 | Complete |
| CONF-02 | Phase 9 | Complete |

**Coverage:**
- v3.0 requirements: 21 total
- Mapped to phases: 21
- Unmapped: 0

---
*Requirements defined: 2026-03-03*
*Last updated: 2026-03-03 after roadmap creation*
