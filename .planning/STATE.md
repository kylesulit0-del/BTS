# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-25)

**Core value:** Fans see a rich, diverse stream of BTS content from everywhere with engagement stats that help surface the best content, all without leaving the app.
**Current focus:** Phase 2: Feed Expansion

## Current Position

Phase: 2 of 4 (Feed Expansion)
Plan: 5 of 5 in current phase
Status: Phase 2 complete
Last activity: 2026-02-25 -- Completed 02-05-PLAN.md (Tumblr + YouTube source curation)

Progress: [██████████] 100% (Phase 2: 5/5 plans)

## Performance Metrics

**Velocity:**
- Total plans completed: 9
- Average duration: 3min
- Total execution time: 0.52 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 4 | 13min | 3min |
| 02-feed-expansion | 5 | 18min | 4min |

**Recent Trend:**
- Last 5 plans: 02-05 (13min), 02-04 (1min), 02-03 (1min), 02-02 (2min), 02-01 (2min)
- Trend: 02-05 higher due to extensive Tumblr/YouTube source research

*Updated after each plan completion*
| Phase 02 P03 | 1min | 1 tasks | 1 files |
| Phase 02 P04 | 1min | 1 tasks | 2 files |
| Phase 02 P05 | 13min | 2 tasks | 1 files |

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

### Pending Todos

None yet.

### Blockers/Concerns

- Zero test coverage for feed logic -- config refactor in Phase 1 risks regressions
- CORS proxy services have no SLA -- increased source count amplifies fragility
- TikTok embed library (react-social-media-embed) needs React 19 compatibility verification before Phase 3

## Session Continuity

Last session: 2026-02-25
Stopped at: Completed 02-05-PLAN.md (Tumblr + YouTube source curation) -- Phase 2 complete
Resume file: None
