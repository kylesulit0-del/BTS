# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-25)

**Core value:** Fans see a rich, diverse stream of BTS content from everywhere with engagement stats that help surface the best content, all without leaving the app.
**Current focus:** Phase 4: Config-Driven UI

## Current Position

Phase: 4 of 4 (Config-Driven UI)
Plan: 2 of 2 in current phase
Status: Complete
Last activity: 2026-02-26 -- Completed 04-02-PLAN.md (Config-driven UI wiring)

Progress: [██████████] 100% (Phase 4: 2/2 plans)

## Performance Metrics

**Velocity:**
- Total plans completed: 13
- Average duration: 3min
- Total execution time: 0.77 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 4 | 13min | 3min |
| 02-feed-expansion | 5 | 18min | 4min |
| 03-short-form-video | 2 | 10min | 5min |
| 04-config-driven-ui | 2 | 5min | 3min |

**Recent Trend:**
- Last 5 plans: 04-02 (2min), 04-01 (3min), 03-02 (8min), 03-01 (2min), 02-05 (13min)
- Trend: Phase 4 complete, both plans clean and fast

*Updated after each plan completion*
| Phase 02 P03 | 1min | 1 tasks | 1 files |
| Phase 02 P04 | 1min | 1 tasks | 2 files |
| Phase 02 P05 | 13min | 2 tasks | 1 files |
| Phase 03 P01 | 2min | 2 tasks | 4 files |
| Phase 03 P02 | 8min | 3 tasks | 6 files |
| Phase 04 P01 | 3min | 2 tasks | 6 files |
| Phase 04 P02 | 2min | 2 tasks | 14 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Config-driven architecture over multi-tenant (per-clone independence)
- oEmbed/iframe for TikTok/Instagram over scraping (platform-sanctioned)
- Client-side only, no backend (existing architecture constraint)
- Weverse and Instagram Reels descoped (architecturally infeasible client-side)
- Used satisfies GroupConfig for compile-time config validation without widening types
- Built keywords RegExp dynamically from member aliases at module load time
- Added common fan nicknames/misspellings to aliases beyond existing MEMBER_KEYWORDS
- Used import type { Config } from dompurify (v3 exports at top level, not namespace)
- Cast DOMPurify.sanitize() return as string for TrustedHTML compatibility
- Used AbortSignal.any() for combined shared abort + per-request timeout in CORS proxy
- Fetchers throw on error, orchestrator catches uniformly -- no per-fetcher try/catch
- RSS fetcher is generic (handles Soompi, AllKPop, any future RSS) via SourceEntry
- useFeed.ts bias filtering migrated from MEMBER_KEYWORDS to config.members.aliases
- sourceBadgeColors/sourceEmojis kept as local constants -- platform-themed, not group-specific
- FeedCard uses div wrapper with internal View original link instead of anchor wrapper
- Auto-retry uses 5s/10s delays, max 2 retries, no error messages during retry
- Tours.tsx BTS WORLD TOUR title left as event-specific content, not group branding
- Fan YouTube IDs: Jackpot Army (UCdSjMikohmTPDF2bggxa9CQ) replaced inactive BangtanSubs, DKDKTV (UCVEzR8VHu0JC5xlTr53cMwQ) retained
- DKDKTV set needsFilter:true since it covers broader K-pop topics beyond BTS
- Tumblr fetcher is separate from generic RSS fetcher for future API upgrade path
- Reddit stats use d.score (accurate) not d.ups (fuzzed by Reddit)
- MIN_STAT_THRESHOLD=2 hides trivial single-digit stats on feed cards
- Inline SVG icons (14x14, path-only, currentColor) over icon library to avoid dependency
- applyFeedPipeline extracted as shared function for incremental and batch fetch paths
- Per-source cap (30 items) sorts by engagement before truncating to keep best content
- [Phase 02]: 30-day age window chosen to match YouTube posting cadences (BANGTANTV posts every 2-3 weeks)
- [Phase 02]: Tumblr sources curated: bts-trans (needsFilter:false), kimtaegis/userparkjimin/namjin/jikook (needsFilter:true for mixed content)
- [Phase 02]: Jackpot Army YouTube channel selected as BangtanSubs replacement (BTS-dedicated reaction/commentary, needsFilter:false)
- [Phase 03]: VideoType defined in feed.ts alongside FeedItem for colocation
- [Phase 03]: detectVideo checks url_overridden_by_dest plus selftext for video URL detection
- [Phase 03]: TikTok short URLs store short path as videoId with isShortUrl flag (CORS blocks redirect resolution)
- [Phase 03]: TikTok compilation YouTube channel added as enabled:false pending verified channel ID
- [Phase 03]: YouTube Shorts in channel feeds detected via oEmbed dimensions (height > width = vertical = Shorts)
- [Phase 03]: postMessage API for cross-origin iframe control (YouTube JSON event/command, TikTok x-tiktok-player)
- [Phase 03]: Module-level currentlyPlaying state enforces one-video-at-a-time across all VideoEmbed instances
- [Phase 03]: Videos start muted per browser autoplay policy, unmute on user tap
- [Phase 04]: Event/NewsItem interfaces use string types for region/status (config-driven flexibility)
- [Phase 04]: FeedSource and BiasId loosened from literal unions to string for config-driven source tabs and member chips
- [Phase 04]: src/data/* files preserved unchanged; Plan 02 will migrate imports and delete old files
- [Phase 04]: vite.config.ts imports from src/config/index.ts (single swap point) not directly from groups/bts/
- [Phase 04]: index.html keeps hardcoded values as dev-server fallbacks; transformIndexHtml overwrites at build
- [Phase 04]: Example config uses buildKeywords pattern matching BTS config for clone-and-swap consistency

### Pending Todos

None yet.

### Blockers/Concerns

- Zero test coverage for feed logic -- config refactor in Phase 1 risks regressions
- CORS proxy services have no SLA -- increased source count amplifies fragility
- TikTok embed library (react-social-media-embed) needs React 19 compatibility verification before Phase 3

## Session Continuity

Last session: 2026-02-26
Stopped at: Completed 04-02-PLAN.md (Config-driven UI wiring) -- Phase 4 complete, all phases done
Resume file: None
