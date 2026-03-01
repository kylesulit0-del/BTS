---
phase: 02-feed-expansion
verified: 2026-02-25T12:30:00Z
status: passed
score: 17/17 must-haves verified
re_verification:
  previous_status: passed
  previous_score: 13/13
  gaps_closed:
    - "YouTube videos up to 30 days old appear in the feed (MAX_AGE_MS = 30 days, commit 2bb5cbe)"
    - "HYBE LABELS channel returns valid content (UC3IZKseVpdzPSBaWxBxundA returns HTTP 200 with Feb 25 2026 content)"
    - "All 5 Tumblr source entries replaced with actively-posting blogs (all return HTTP 200, all posted within 5 days, commit e5ffde6)"
    - "Inactive BangtanSubs replaced with Jackpot Army (UCdSjMikohmTPDF2bggxa9CQ, last post Feb 24 2026, commit f70881a)"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Load the app and apply the Tumblr filter chip"
    expected: "Feed shows Tumblr posts from bts-trans, kimtaegis, userparkjimin, namjin, jikook with thumbnail images, text previews, and Tumblr source badges"
    why_human: "Tumblr RSS endpoints confirmed live (HTTP 200) but CORS proxy behavior requires browser verification"
  - test: "Load the app and view Reddit cards"
    expected: "Reddit cards show upvote count (arrow icon) and comment count (speech bubble icon) inline with metadata when values >= 2"
    why_human: "Stat values depend on live Reddit API response; visual rendering requires browser"
  - test: "Verify fan YouTube content appears from HYBE and Jackpot Army"
    expected: "Cards from HYBE LABELS (UC3IZKseVpdzPSBaWxBxundA) and Jackpot Army (UCdSjMikohmTPDF2bggxa9CQ) appear with view/like stats. BANGTANTV 15-day-old videos (544K views) now pass the 30-day filter."
    why_human: "Channel IDs verified via curl but stat display requires browser with live YouTube Atom feed data"
  - test: "Verify feed ordering feels relevance-weighted, not purely chronological"
    expected: "High-engagement older posts appear above low-engagement recent posts"
    why_human: "Engagement-weighted scoring behavior requires live data and subjective assessment"
---

# Phase 02: Feed Expansion Verification Report (Re-verification after Plans 02-04 and 02-05)

**Phase Goal:** Users see content from Tumblr fan blogs, additional Reddit subreddits, and fan YouTube channels, with Reddit engagement stats visible on feed cards
**Verified:** 2026-02-25T12:30:00Z
**Status:** passed
**Re-verification:** Yes -- after UAT gap closure (Plans 02-04 and 02-05)

## Context

The previous verification passed (13/13) based on code-level checks, but UAT run found 4 real-world failures:

1. Tumblr thumbnails not loading / no content (all 5 configured blogs were inactive)
2. Tumblr filter chip shows "no content" (same root cause as #1)
3. No stats on YouTube cards (7-day age filter eliminated all BANGTANTV videos; videos are 15+ days old)
4. Only 1 YouTube video visible (wrong HYBE channel ID UCx2hOXK_cGnRolCRilNUfA returned 404; BangtanSubs inactive since Jul 2024)

Gap closure plans 02-04 and 02-05 applied three fixes across 3 commits (2bb5cbe, e5ffde6, f70881a).

This re-verification checks all 4 UAT gap closures and regresses all previously-passing truths.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Reddit fetcher returns FeedItems with stats.upvotes and stats.comments populated | VERIFIED | `reddit.ts` line 31: `stats: { upvotes: d.score > 0 ? d.score : undefined, comments: d.num_comments > 0 ? d.num_comments : undefined }` -- unchanged from previous verification |
| 2 | YouTube fetcher returns FeedItems with stats.views from Atom media:statistics | VERIFIED | `youtube.ts` extracts from `parseAtom`; `xmlParser.ts` parses `media:community` namespace -- unchanged |
| 3 | Tumblr RSS feeds are fetched, parsed, and returned as FeedItems with source 'tumblr' | VERIFIED | `tumblr.ts` registered in `registry.ts` line 16 -- unchanged; all 5 Tumblr RSS URLs now return HTTP 200 |
| 4 | BTS config contains 6 Reddit sources, 5 Tumblr sources, 4 YouTube sources -- all active | VERIFIED | 6 Reddit (`grep -c 'type: "reddit"'` = 6), 5 Tumblr (`grep -c 'type: "tumblr"'` = 5), 4 YouTube (`grep -c 'type: "youtube"'` = 4); 0 `enabled: false` entries |
| 5 | MAX_AGE_MS is 30 days (UAT gap #3 and #4 fix) | VERIFIED | `feeds.ts` line 7: `const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;` -- changed from 7 days in commit 2bb5cbe |
| 6 | HYBE LABELS channel ID is UC3IZKseVpdzPSBaWxBxundA and returns HTTP 200 (UAT gap #4 fix) | VERIFIED | `sources.ts` line 56: `url: "UC3IZKseVpdzPSBaWxBxundA"` -- curl confirms HTTP 200 with content published 2026-02-25 |
| 7 | All 5 Tumblr blogs post within 30 days and return HTTP 200 (UAT gap #1 and #2 fix) | VERIFIED | bts-trans: Feb 24, kimtaegis: Feb 21, userparkjimin: Feb 24, namjin: Feb 23, jikook: Feb 20 -- all HTTP 200 confirmed by live curl |
| 8 | BangtanSubs replaced with active Jackpot Army channel (UAT gap #4 fix) | VERIFIED | `sources.ts` line 107: `url: "UCdSjMikohmTPDF2bggxa9CQ"` (Jackpot Army); old BangtanSubs ID UC5m4L0y_OJIJ2NWPRcayXvg absent from config; Jackpot Army Atom feed confirms last post Feb 24, 2026 |
| 9 | No inactive sources remain (old IDs and blog names absent from config) | VERIFIED | `grep` for UCx2hOXK_cGnRolCRilNUfA, UC5m4L0y_OJIJ2NWPRcayXvg, btsfandom, allforbts, 0613data, beautifulpersonpeach, bangtan.tumblr returns empty |
| 10 | Sources with enabled:false are skippable | VERIFIED | `feeds.ts` lines 80, 106: `config.sources.filter((s) => s.enabled !== false)` -- unchanged; 0 entries disabled |
| 11 | Reddit feed cards display upvote and comment counts inline with metadata | VERIFIED | `FeedCard.tsx` lines 43-66: `MIN_STAT_THRESHOLD = 2`, conditional rendering with `abbreviateNumber()` -- unchanged |
| 12 | YouTube feed cards display view count and like count when above threshold | VERIFIED | `FeedCard.tsx` lines 57-66: renders `item.stats.views` and `item.stats.likes` with icons -- unchanged |
| 13 | Stats are completely hidden when zero, missing, or below threshold | VERIFIED | `FeedCard.tsx` line 43: `{item.stats && ...}` outer guard; per-stat null check + threshold check -- unchanged |
| 14 | Tumblr appears as a filter chip in the feed filter bar | VERIFIED | `FeedFilter.tsx` line 13: `{ label: "Tumblr", value: "tumblr" }` -- unchanged |
| 15 | Feed is sorted by engagement-weighted score (50% recency, 50% engagement) | VERIFIED | `feeds.ts` lines 36-41: `computeFeedScore` implements `0.5 * recencyScore + 0.5 * engagementScore` -- unchanged |
| 16 | Duplicate URLs across sources are deduplicated | VERIFIED | `feeds.ts` lines 43-53: `deduplicateByUrl` uses normalized URL, keeps higher `getEngagementValue` -- unchanged |
| 17 | TypeScript compiles without errors | VERIFIED | `npx tsc --noEmit` passes clean with 0 errors |

**Score:** 17/17 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/services/feeds.ts` | MAX_AGE_MS = 30 days; computeFeedScore, deduplicateByUrl, applyFeedPipeline, enabled filter | VERIFIED | Line 7: `30 * 24 * 60 * 60 * 1000`; all pipeline functions intact |
| `src/config/groups/bts/sources.ts` | Active Tumblr blogs (5), corrected HYBE ID, Jackpot Army, no inactive sources, no enabled:false | VERIFIED | 5 Tumblr (all active), HYBE = UC3IZKseVpdzPSBaWxBxundA, Jackpot Army = UCdSjMikohmTPDF2bggxa9CQ, 0 disabled entries, 0 old IDs |
| `src/types/feed.ts` | FeedStats interface, 'tumblr' in FeedSource union, stats field on FeedItem | VERIFIED | Unchanged from previous verification |
| `src/utils/formatNumber.ts` | abbreviateNumber utility | VERIFIED | Unchanged from previous verification |
| `src/services/sources/tumblr.ts` | Tumblr RSS fetcher | VERIFIED | Unchanged from previous verification |
| `src/services/sources/registry.ts` | Tumblr fetcher registration | VERIFIED | Unchanged; `tumblr: fetchTumblrSource` at line 16 |
| `src/components/FeedCard.tsx` | Inline engagement stats display with abbreviateNumber | VERIFIED | Unchanged from previous verification |
| `src/components/FeedFilter.tsx` | Tumblr filter chip | VERIFIED | Unchanged from previous verification |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `sources.ts` (HYBE entry) | YouTube Atom feed | UC3IZKseVpdzPSBaWxBxundA channel ID | VERIFIED | HTTP 200 with content published 2026-02-25 |
| `sources.ts` (Jackpot Army) | YouTube Atom feed | UCdSjMikohmTPDF2bggxa9CQ channel ID | VERIFIED | HTTP 200 with content published 2026-02-24 |
| `sources.ts` (5 Tumblr blogs) | Tumblr RSS feeds | RSS URLs fetched by tumblr fetcher | VERIFIED | All 5 return HTTP 200; all posted within 5 days of verification date |
| `feeds.ts` MAX_AGE_MS | `applyFeedPipeline` age filter | constant used in filter expression | VERIFIED | Line 72: `now - item.timestamp < MAX_AGE_MS` with value = 30 days |
| `src/services/sources/reddit.ts` | `src/types/feed.ts` | stats field on FeedItem | VERIFIED | Unchanged |
| `src/components/FeedCard.tsx` | `src/utils/formatNumber.ts` | abbreviateNumber import | VERIFIED | Unchanged |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| SRC-01 | 02-01-PLAN | User can see content from additional Reddit subreddits | SATISFIED | 6 Reddit sources (r/bangtan, r/kpop, r/heungtan, r/bts7, r/kpoopheads, r/BTSWorld) all enabled |
| SRC-02 | 02-03-PLAN, 02-04-PLAN, 02-05-PLAN | User can see content from fan YouTube channels | SATISFIED | HYBE fixed (UC3IZKseVpdzPSBaWxBxundA), Jackpot Army added (UCdSjMikohmTPDF2bggxa9CQ), DKDKTV retained; 30-day age window allows videos through |
| SRC-03 | 02-01-PLAN, 02-05-PLAN | User can see Tumblr fan blog content via RSS integration | SATISFIED | 5 active Tumblr blogs (all posted within 5 days), fetcher implemented and registered |
| SRC-04 | 02-02-PLAN | User can filter feed by new source types | SATISFIED | Tumblr filter chip in FeedFilter.tsx; filter wiring in App.tsx unchanged |
| STAT-01 | 02-01-PLAN | User can see upvote count on Reddit feed cards | SATISFIED | Reddit fetcher populates `stats.upvotes`; FeedCard renders with arrow icon when >= 2 |
| STAT-02 | 02-01-PLAN | User can see comment count on Reddit feed cards | SATISFIED | Reddit fetcher populates `stats.comments`; FeedCard renders with speech bubble icon |
| STAT-03 | 02-02-PLAN | Engagement stats display gracefully | SATISFIED | `{item.stats && ...}` guard + per-stat null check + MIN_STAT_THRESHOLD; 30-day window means YouTube videos with real stats (544K views) now pass the age filter |

### Anti-Patterns Scan

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/types/feed.ts` | 3 | `// TODO: Move BiasId to config-derived type in Plan 04` | INFO | Planned future work; does not affect Phase 2 |

No blockers found. No new TODOs or placeholders introduced by Plans 02-04 or 02-05.

### Regression Check

All 13 truths from the previous verification were regressed after the gap closure commits:

| Previously-passing item | Regression check | Result |
|-------------------------|-----------------|--------|
| Reddit stats in fetcher | `reddit.ts` line 31 still populates stats | CLEAN |
| YouTube stats extraction | `youtube.ts` / `xmlParser.ts` unchanged | CLEAN |
| Tumblr fetcher registered | `registry.ts` line 16 still maps tumblr | CLEAN |
| Reddit source count (6) | `grep -c 'type: "reddit"'` = 6 | CLEAN |
| computeFeedScore formula | `0.5 * recencyScore + 0.5 * engagementScore` intact | CLEAN |
| deduplicateByUrl logic | `normalizeUrl` + `getEngagementValue` comparison intact | CLEAN |
| enabled !== false filter | Lines 80, 106 in feeds.ts intact | CLEAN |
| FeedCard stats rendering | MIN_STAT_THRESHOLD = 2, abbreviateNumber used, icons present | CLEAN |
| FeedCard YouTube stats | `item.stats.views` and `item.stats.likes` rendering intact | CLEAN |
| Stats hidden at threshold | `{item.stats && ...}` outer guard intact | CLEAN |
| Tumblr filter chip | `FeedFilter.tsx` line 13 intact | CLEAN |
| FeedFilter → FeedSource type | "tumblr" in FeedSource union unchanged | CLEAN |
| App.css stat styles | Not re-checked (no CSS files modified) | N/A |

No regressions introduced by Plans 02-04 or 02-05. Only `feeds.ts` (MAX_AGE_MS) and `sources.ts` (channel IDs, blog URLs) were modified across all 3 commits.

### Gap Closure Verification Summary

| UAT Gap | Root Cause | Fix Applied | Fix Verified |
|---------|-----------|-------------|-------------|
| UAT #1: Tumblr no content | 5 inactive blogs (last posts 2021-2025) | Replaced with bts-trans, kimtaegis, userparkjimin, namjin, jikook (all active Feb 2026) | HTTP 200 + pubDates within 5 days confirmed via curl |
| UAT #2: Tumblr filter chip no content | Same root cause as #1 | Same fix | Same evidence |
| UAT #3: No stats on YouTube cards | 7-day age filter eliminated all BANGTANTV videos (newest was 15 days old) | MAX_AGE_MS changed to 30 days in commit 2bb5cbe | `feeds.ts` line 7 = `30 * 24 * 60 * 60 * 1000` |
| UAT #4: Only 1 YouTube video | Wrong HYBE ID (UCx2hOXK_cGnRolCRilNUfA, 404) + BangtanSubs inactive (Jul 2024) + 7-day filter | HYBE ID fixed to UC3IZKseVpdzPSBaWxBxundA; BangtanSubs replaced with Jackpot Army (UCdSjMikohmTPDF2bggxa9CQ); 30-day window | HYBE HTTP 200 (Feb 25 content); Jackpot Army HTTP 200 (Feb 24 content) |

### Human Verification Required

#### 1. Tumblr Content Display

**Test:** Load the app, click the Tumblr filter chip
**Expected:** Feed shows posts from bts-trans, kimtaegis, userparkjimin, namjin, and/or jikook with thumbnail images, text previews (up to 200 chars), and Tumblr source badges
**Why human:** RSS feeds return HTTP 200 with recent posts, but the CORS proxy used in production may throttle or block Tumblr requests; actual data flow requires browser verification

#### 2. Reddit Stats Rendering

**Test:** Load the app and inspect Reddit feed cards
**Expected:** Cards with meaningful engagement (>= 2 upvotes or comments) show upward arrow icon + count and speech bubble icon + count inline in the card metadata area, formatted as "1.2k" for large numbers
**Why human:** Stat values depend on live Reddit API response and require visual rendering to confirm layout

#### 3. YouTube Content from HYBE and Jackpot Army

**Test:** Load the app with no filter applied, look for YouTube cards from sources other than BANGTANTV
**Expected:** Cards from HYBE LABELS and Jackpot Army appear; BANGTANTV cards show views/likes stats (formerly filtered out by 7-day window); at least 3 distinct YouTube sources visible
**Why human:** Channel IDs and Atom feed responses confirmed via curl but stat rendering and source variety require browser with live data

#### 4. Engagement-Weighted Feed Ordering

**Test:** Compare feed order against publication timestamps
**Expected:** A high-engagement post from 2-3 days ago appears above a low-engagement post from 1 hour ago
**Why human:** Verifying the 50/50 recency+engagement score produces perceptible reordering requires live data and judgment

## Gaps Summary

No gaps remain. All 17 truths verified, all 7 requirements satisfied.

All 4 UAT gaps are closed at the code and live-feed level:
- MAX_AGE_MS is 30 days (verified in `feeds.ts` line 7)
- HYBE channel ID is correct and returns content dated today (Feb 25, 2026)
- Jackpot Army replaces BangtanSubs and posted yesterday (Feb 24, 2026)
- All 5 Tumblr blogs posted within the last 5 days and return HTTP 200

Four human verification items remain covering live data rendering and visual behavior that cannot be confirmed programmatically.

---

_Verified: 2026-02-25T12:30:00Z_
_Verifier: Claude (gsd-verifier)_
