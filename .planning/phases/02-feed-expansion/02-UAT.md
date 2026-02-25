---
status: resolved
phase: 02-feed-expansion
source: [02-01-SUMMARY.md, 02-02-SUMMARY.md, 02-03-SUMMARY.md]
started: 2026-02-25T09:25:00Z
updated: 2026-02-25T11:30:00Z
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

[testing complete]

## Tests

### 1. Tumblr posts in feed
expected: Load the app. Tumblr fan blog posts should appear in the feed alongside Reddit/YouTube content. Posts should show a Tumblr source badge and have properly rendered text (no raw HTML tags visible).
result: issue
reported: "thumbnails of images on feed pages is not loading"
severity: major

### 2. Tumblr filter chip
expected: The feed filter bar should show a "Tumblr" chip. Tapping it should filter the feed to show only Tumblr posts. Tapping again (or "All") should restore the full feed.
result: issue
reported: "filter chip for Tumblr appears but clicking it shows no Tumblr content available"
severity: major

### 3. Reddit engagement stats on cards
expected: Reddit feed cards should display upvote count and comment count with small icons next to them. Very low counts (0 or 1) should be hidden rather than showing trivial numbers.
result: pass

### 4. YouTube stats on cards
expected: YouTube feed cards should display view count and/or like count with icons. Counts should be abbreviated (e.g., "1.2k" not "1200").
result: issue
reported: "no stats showing on youtube cards"
severity: major

### 5. Additional Reddit subreddits
expected: Feed should contain posts from multiple BTS-related subreddits — not just r/bangtan but also meme/fan discussion subs like r/heungtan or r/btsmemes. Check source labels on cards.
result: pass

### 6. Fan YouTube channels
expected: Feed should contain YouTube videos from fan channels (BangtanSubs, DKDKTV) in addition to official BANGTANTV/HYBE content. Look for non-official channel names on YouTube cards.
result: issue
reported: "youtube is only showing 1 video, needs more work to ensure feed has youtube content from more sources and is showing correctly"
severity: major

### 7. Engagement-weighted feed ordering
expected: Feed should not be purely chronological. Higher-engagement recent posts should appear near the top. The overall feel should surface popular/interesting content rather than strictly newest-first.
result: pass

### 8. No duplicate posts
expected: The same content should not appear twice in the feed even if multiple sources reference it. Scroll through and verify no obvious duplicates.
result: pass

## Summary

total: 8
passed: 4
issues: 4
pending: 0
skipped: 0

## Gaps

- truth: "Tumblr fan blog posts appear in the feed with properly rendered text and working thumbnails"
  status: resolved
  reason: "User reported: thumbnails of images on feed pages is not loading"
  severity: major
  test: 1
  root_cause: "All 5 configured Tumblr blogs are inactive (last post Nov 2025). The 7-day MAX_AGE_MS filter in feeds.ts eliminates 100% of Tumblr items before rendering."
  artifacts:
    - path: "src/services/feeds.ts"
      issue: "MAX_AGE_MS = 7 days too aggressive for Tumblr posting cadence"
    - path: "src/config/groups/bts/sources.ts"
      issue: "All 5 Tumblr blog entries point to inactive blogs"
  missing:
    - "Replace inactive Tumblr blogs with actively-posting BTS fan blogs"
    - "Consider source-specific age windows or increase MAX_AGE_MS"
  debug_session: ".planning/debug/thumbnails-not-loading.md"
- truth: "Tumblr filter chip filters feed to show only Tumblr posts"
  status: resolved
  reason: "User reported: filter chip for Tumblr appears but clicking it shows no Tumblr content available"
  severity: major
  test: 2
  root_cause: "Same as test 1 — all Tumblr blogs inactive, 7-day age filter drops all items. Fetcher, registry, types, and filter chip all work correctly."
  artifacts:
    - path: "src/services/feeds.ts"
      issue: "MAX_AGE_MS = 7 days filters out all stale Tumblr content"
    - path: "src/config/groups/bts/sources.ts"
      issue: "All 5 Tumblr sources point to inactive blogs"
  missing:
    - "Replace inactive Tumblr blogs with actively-posting BTS fan blogs"
    - "Consider source-specific or longer age window for Tumblr"
  debug_session: ".planning/debug/tumblr-filter-no-content.md"
- truth: "YouTube feed cards display view count and/or like count with icons, abbreviated"
  status: resolved
  reason: "User reported: no stats showing on youtube cards"
  severity: major
  test: 4
  root_cause: "High-engagement BANGTANTV videos (544K views) filtered out by 7-day age limit (newest is 15 days old). Only surviving DKDKTV video has 0 views/1 like, below MIN_STAT_THRESHOLD=2. Stats code is correct end-to-end."
  artifacts:
    - path: "src/services/feeds.ts"
      issue: "MAX_AGE_MS = 7 days filters out BANGTANTV videos with meaningful stats"
    - path: "src/config/groups/bts/sources.ts"
      issue: "HYBE channel ID wrong (404), reducing YouTube pool"
  missing:
    - "Fix HYBE channel ID and increase MAX_AGE_MS to allow YouTube videos with stats into feed"
  debug_session: ".planning/debug/youtube-stats-missing.md"
- truth: "Feed contains YouTube videos from fan channels (BangtanSubs, DKDKTV) alongside official content"
  status: resolved
  reason: "User reported: youtube is only showing 1 video, needs more work to ensure feed has youtube content from more sources and is showing correctly"
  severity: major
  test: 6
  root_cause: "Three compounding issues: (1) HYBE channel ID UCx2hOXK_cGnRolCRilNUfA is wrong, returns 404 — correct ID is UC3IZKseVpdzPSBaWxBxundA. (2) 7-day MAX_AGE_MS too aggressive for YouTube posting cadence, filtering out all BANGTANTV (15 days) and BangtanSubs (8 months). (3) BangtanSubs channel is inactive."
  artifacts:
    - path: "src/config/groups/bts/sources.ts"
      issue: "HYBE channel ID wrong (UCx2hOXK_cGnRolCRilNUfA should be UC3IZKseVpdzPSBaWxBxundA)"
    - path: "src/services/feeds.ts"
      issue: "MAX_AGE_MS = 7 days too short for YouTube posting cadence"
    - path: "src/config/groups/bts/sources.ts"
      issue: "BangtanSubs channel inactive (~8 months stale)"
  missing:
    - "Fix HYBE channel ID to UC3IZKseVpdzPSBaWxBxundA"
    - "Increase MAX_AGE_MS or add source-specific age windows for YouTube"
    - "Replace inactive BangtanSubs with active fan channel"
  debug_session: ".planning/debug/youtube-only-one-video.md"
