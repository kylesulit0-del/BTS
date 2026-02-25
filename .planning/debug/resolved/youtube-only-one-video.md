# Debug Session: YouTube Only Showing 1 Video

**Date:** 2026-02-25
**Symptom:** "youtube is only showing 1 video, needs more work to ensure feed has youtube content from more sources and is showing correctly"
**Test:** UAT Test 6 (Fan YouTube channels)
**Severity:** major

## Root Cause

**THREE compounding issues** reduce 4 YouTube sources (40 potential videos) down to 1 visible video:

### Issue 1: HYBE LABELS has wrong channel ID (CRITICAL)

The config has channel ID `UCx2hOXK_cGnRolCRilNUfA` which returns HTTP 404 from YouTube's Atom feed endpoint. The correct HYBE LABELS channel ID is `UC3IZKseVpdzPSBaWxBxundA` (79M subscribers, verified via SocialBlade/NoxInfluencer).

**Evidence:**
```
$ curl -s -o /dev/null -w "%{http_code}" "https://www.youtube.com/feeds/videos.xml?channel_id=UCx2hOXK_cGnRolCRilNUfA"
404

$ curl -s -o /dev/null -w "%{http_code}" "https://www.youtube.com/feeds/videos.xml?channel_id=UC3IZKseVpdzPSBaWxBxundA"
200
```

**Impact:** HYBE source returns 0 videos. Error silently swallowed by `.catch(() => [])` in `feeds.ts` line 96.

### Issue 2: MAX_AGE_MS (7 days) too aggressive for YouTube (CRITICAL)

`feeds.ts` line 7 sets `MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000` (7 days). The `applyFeedPipeline` (line 72) filters out anything older. YouTube channels don't post daily.

**Evidence (as of 2026-02-25):**

| Source | Newest Video Age | Videos Within 7 Days | Total Feed Entries |
|--------|-----------------|---------------------|-------------------|
| BANGTANTV | 15 days | 0 | 15 |
| HYBE LABELS | N/A (404) | 0 | 0 |
| BangtanSubs | ~8 months | 0 | 15 |
| DKDKTV | 0 days | 1 | 15 |

Only 1 DKDKTV video (from today) survives the 7-day age filter. BANGTANTV's newest video is 15 days old -- filtered out despite being fresh YouTube content. BangtanSubs hasn't posted since July 2024.

### Issue 3: BangtanSubs channel is inactive (MINOR)

BangtanSubs (`UC5m4L0y_OJIJ2NWPRcayXvg`) is a valid channel but its most recent upload is from 2024-07-14. Even with a relaxed age filter, this channel contributes nothing to the feed currently.

**Evidence:**
```
Most recent BangtanSubs video: 2024-07-14T23:59:42+00:00 (~8 months ago)
```

## Trace Through the Code

1. `feeds.ts:80` - All 4 YouTube sources pass the `enabled !== false` check
2. `feeds.ts:84` - `getFetcher("youtube")` returns `fetchYouTubeSource` -- correct
3. `youtube.ts:7` - URL constructed as `https://www.youtube.com/feeds/videos.xml?channel_id=${source.url}` -- format is correct
4. `corsProxy.ts` - `fetchWithProxy` races 3 CORS proxies. For HYBE's 404, proxies return 500, `res.ok` check fails, all three throw, `Promise.any` rejects with `AggregateError`, caught as "All proxies failed"
5. `feeds.ts:96` - `.catch(() => [])` silently swallows the HYBE failure -- no user-visible error
6. `youtube.ts:14-15` - BangtanSubs entries pass keyword filter (needsFilter:false), but return 10 items all from 2022-2024
7. `feeds.ts:72` - `applyFeedPipeline` age filter kills ALL BangtanSubs + ALL BANGTANTV items (oldest is 15 days)
8. `youtube.ts:15` - DKDKTV entries go through keyword filter (needsFilter:true). Only BTS-titled videos pass. Of those within 7 days, only 1 video survives
9. **Result: 1 YouTube video in feed**

## Files Involved

| File | Line(s) | Issue |
|------|---------|-------|
| `src/config/groups/bts/sources.ts` | 56 | Wrong HYBE channel ID `UCx2hOXK_cGnRolCRilNUfA` (should be `UC3IZKseVpdzPSBaWxBxundA`) |
| `src/services/feeds.ts` | 7 | `MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000` (7 days) too short for YouTube posting cadence |
| `src/services/feeds.ts` | 96 | `.catch(() => [])` silently swallows fetch failures with no logging |

## NOT the Cause

- YouTube Atom URL format: Correct (`/feeds/videos.xml?channel_id=...`)
- BangtanSubs channel ID: Correct (`UC5m4L0y_OJIJ2NWPRcayXvg`), just inactive
- DKDKTV channel ID: Correct (`UCVEzR8VHu0JC5xlTr53cMwQ`), actively posting
- BANGTANTV channel ID: Correct (`UCLkAepWjdylmXSltofFvsYQ`), actively posting
- Registry: YouTube fetcher correctly registered
- Per-source cap (30): Not limiting anything since so few items arrive
- Deduplication: No duplicates to remove across different channels
- `parseAtom`: Correctly parses YouTube Atom XML with namespaced elements

## Suggested Fix Direction

1. **Fix HYBE channel ID:** Replace `UCx2hOXK_cGnRolCRilNUfA` with `UC3IZKseVpdzPSBaWxBxundA` in sources.ts
2. **Increase MAX_AGE_MS for YouTube:** Either increase the global age to 30 days, or make age filtering source-aware (e.g., 7 days for Reddit, 30 days for YouTube). YouTube channels post weekly or less frequently; a 7-day window is too narrow.
3. **Consider replacing BangtanSubs** with a more active fan channel, or accept it will contribute nothing until it resumes posting
4. **Add error logging** in the `.catch()` to aid future debugging (not root cause, but masked the HYBE failure)
