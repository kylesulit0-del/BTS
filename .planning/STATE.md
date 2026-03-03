# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-03)

**Core value:** Fans see a rich, diverse stream of content from everywhere with engagement stats that help surface the best content, all without leaving the app.
**Current focus:** v3.0 Immersive Feed Experience -- Phase 10: Snap Feed Core

## Current Position

Phase: 10 of 12 (Snap Feed Core) -- COMPLETE
Plan: 3 of 3 in current phase
Status: Phase Complete
Last activity: 2026-03-03 -- Completed 10-03 (video lifecycle & swipe gesture)

Progress: [█████████████████████████░░░░░] 79% (31/39 plans complete; 3/3 in Phase 10)

## Performance Metrics

**Velocity (v1.0):**
- Total plans completed: 13
- Total execution time: ~5 days
- Average: ~2.6 plans/day

**Velocity (v2.0):**
- Total plans completed: 13
- Total execution time: ~6 days
- Average: ~2.2 plans/day

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [v3.0 Roadmap]: useReducer + useSearchParams over Zustand for feed state (page-local, no external dep needed)
- [v3.0 Roadmap]: 100svh with 100vh fallback, NOT 100dvh (iOS Safari regression)
- [v3.0 Roadmap]: Motion for card animations only, NOT scroll physics (cross-browser flickering with scroll-snap)
- [v3.0 Roadmap]: Manual 3-item DOM window over TanStack Virtual (documented scroll-snap incompatibility)
- [09-01]: Sort applied to 500-item candidate set in-memory before pagination, not via SQL ORDER BY
- [09-01]: engagementStats parsed only for popular sort mode to minimize JSON.parse overhead
- [09-02]: useFeedState uses useRef to skip initial mount URL sync, avoiding unnecessary history entry
- [09-02]: Theme tokens mapped to existing CSS variable names (surfaceColor -> --bg-card) so existing CSS rules benefit
- [09-02]: feedMode defaults to 'list' for backward compat; snap placeholder ready for Phase 10
- [10-01]: DOM_WINDOW_SIZE default 5, IntersectionObserver threshold 0.6 for snap detection
- [10-01]: useLayoutEffect for scroll position adjustment to prevent visual jumps during window shifts
- [10-01]: Items fewer than window size skip virtualization entirely to avoid duplicate keys
- [10-02]: SeeMoreSheet rendered via createPortal to escape scroll-snap stacking context
- [10-02]: Card type discriminator priority: videoType+videoId > youtube source > thumbnail > text
- [10-02]: Shared SnapCardMeta component for consistent metadata across all card variants
- [10-02]: Video card facade-only pre-Plan 03; isActive prop accepted for future iframe rendering
- [10-03]: Session mute starts muted per browser autoplay policy; auto-unmutes after first user interaction
- [10-03]: Custom progress bar hidden for TikTok (native progress_bar=1 suffices)
- [10-03]: iframe rendered directly in SnapCardVideo, not via VideoEmbed (avoid conflicting IntersectionObservers)
- [10-03]: Right-swipe threshold 120px with 1.5x axis lock ratio; left-swipe does nothing
- [10-03]: Exported sendCommand from useVideoAutoplay for reuse in snap feed context

### Pending Todos

None.

### Blockers/Concerns

- Reddit/Bluesky/Tumblr scrapers returning empty on some server IPs (from v2.0, does not block v3.0)
- v2.0 UAT tests all skipped (need live deployment verification)

## Session Continuity

Last session: 2026-03-03
Stopped at: Completed 10-03-PLAN.md (video lifecycle & swipe gesture -- Phase 10 complete)
Resume with: /gsd:execute-phase 11 (next phase)
