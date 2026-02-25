# Debug Session: Tumblr Filter Shows No Content

**Bug:** Filter chip for Tumblr appears but clicking it shows no Tumblr content available
**UAT Test:** 2
**Date:** 2026-02-25

## Hypotheses Tested

### H1: Tumblr fetcher not registered in registry
**Result:** REJECTED
- `src/services/sources/registry.ts` line 16: `tumblr: fetchTumblrSource` is registered
- `getFetcher("tumblr")` will return the correct fetcher function

### H2: Source type mismatch between config and filter/FeedItem
**Result:** REJECTED
- Config sources use `type: "tumblr"` (sources.ts lines 135-168)
- Fetcher sets `source: "tumblr" as const` (tumblr.ts line 33)
- FeedSource type includes `"tumblr"` (feed.ts line 1)
- FeedFilter has `{ label: "Tumblr", value: "tumblr" }` (FeedFilter.tsx line 13)
- useFeed filters with `item.source === filter` (useFeed.ts line 150)
- All types match correctly

### H3: CORS proxy fails for Tumblr RSS URLs
**Result:** PARTIAL -- proxy works but is fragile
- allorigins.win: HTTP 500 for Tumblr URLs
- corsproxy.io: HTTP 200 (works)
- codetabs: HTTP 301 (redirect, may or may not follow)
- `Promise.any` pattern means only one proxy needs to succeed
- Errors are silently caught (feeds.ts line 96: `.catch(() => [])`)
- Even if fetch fails, this would produce empty results, not stale results

### H4: Tumblr blogs are inactive -- all posts older than MAX_AGE_MS (7 days)
**Result:** CONFIRMED -- ROOT CAUSE

Tumblr blog last post dates:
| Blog | Last Post | Age |
|------|-----------|-----|
| btsfandom.tumblr.com | 2021-05-01 | ~4.8 years |
| bangtan.tumblr.com | 2021-12-06 | ~4.2 years |
| allforbts.tumblr.com | 2020-03-31 | ~5.9 years (blog explicitly closed) |
| 0613data.tumblr.com | 2022-06-02 | ~3.7 years |
| beautifulpersonpeach.tumblr.com | 2025-11-11 | ~3.5 months |

`applyFeedPipeline()` in `src/services/feeds.ts` line 72:
```typescript
const fresh = items.filter((item) => now - item.timestamp < MAX_AGE_MS);
```

Where `MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000` (7 days).

Every single Tumblr item from all 5 configured blogs is older than 7 days. The freshness filter drops 100% of Tumblr items before they ever reach the UI.

## Root Cause

**All 5 configured Tumblr blogs are inactive (last posts range from March 2020 to November 2025). The 7-day freshness filter (`MAX_AGE_MS`) in `applyFeedPipeline()` eliminates every Tumblr item before it reaches the filtered view.**

The fetcher works. The registry works. The filter chip works. The type matching works. But there are simply zero Tumblr items surviving the freshness pipeline.

## Files Involved

- `src/services/feeds.ts` (lines 7, 71-72): `MAX_AGE_MS` = 7 days, freshness filter drops all stale items
- `src/config/groups/bts/sources.ts` (lines 134-178): All 5 Tumblr sources point to inactive blogs

## Fix Direction

Two-pronged fix needed:
1. **Replace inactive Tumblr blogs** with actively-posting BTS fan blogs (need to find blogs that post within the last 7 days)
2. **Consider** whether `MAX_AGE_MS` should be longer for Tumblr sources specifically, or whether a source-specific age limit would help surface at least some content when all items are stale
