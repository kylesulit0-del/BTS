# Debug Session: Thumbnails Not Loading on Feed Pages

**Bug:** UAT Test 1 -- "thumbnails of images on feed pages is not loading"
**Date:** 2026-02-25
**Status:** RESOLVED (Plan 02-04 + 02-05)

## Symptom

User reported that thumbnails/images are not loading on feed pages. Additionally, UAT Test 2 reported that clicking the Tumblr filter chip shows "no Tumblr content available." These two findings are related.

## Data Flow Trace

1. **Fetcher** extracts thumbnail URL:
   - Reddit: `d.thumbnail` from JSON API (filtered by `.startsWith("http")`)
   - YouTube: constructed as `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
   - Tumblr: `extractThumbnail(item.description)` -- parses HTML description for first `<img>` src
   - RSS (news): no thumbnail extraction at all

2. **FeedItem** stores `thumbnail?: string`

3. **Feed pipeline** (`feeds.ts`):
   - `applyFeedPipeline()` filters by `MAX_AGE_MS = 7 days`
   - Deduplicates by URL
   - Caps per source (30 items)
   - Sorts by engagement-weighted score

4. **FeedCard** renders: `{item.thumbnail && <img src={item.thumbnail} />}`

## Hypotheses Tested

### H1: Tumblr extractThumbnail() fails to parse image URLs
**Result: REJECTED.** The RSS `<description>` contains entity-encoded HTML (`&lt;img src="..."&gt;`). When DOMParser parses the XML, `.textContent` decodes entities correctly, producing valid HTML like `<img src="https://64.media.tumblr.com/...">`. The `extractThumbnail` function re-parses this with DOMParser and finds `<img>` tags. Verified: `bangtan.tumblr.com` has 16/20 posts with valid `.jpg` image URLs.

### H2: Image CDNs block cross-origin loading
**Result: REJECTED.** Tumblr media (`64.media.tumblr.com`) and YouTube (`img.youtube.com`) both serve `Access-Control-Allow-Origin: *`. No CSP or referrer policy in the app.

### H3: CSS hides or breaks thumbnail display
**Result: REJECTED.** `.feed-card-thumbnail` has `width:100%; aspect-ratio:16/9; overflow:hidden` and img has `width:100%; height:100%; object-fit:cover`. Standard and correct.

### H4: Mixed content (HTTP images on HTTPS page)
**Result: REJECTED.** All image CDN URLs use HTTPS.

### H5: Service worker intercepts image requests
**Result: REJECTED.** VitePWA with default config uses precaching for app assets only; no runtime caching rules for external images.

### H6: Tumblr posts are all too old and filtered out by MAX_AGE_MS (7-day freshness filter)
**Result: CONFIRMED.** This is the root cause.

All 5 configured Tumblr blogs have stale/inactive content:

| Blog | Latest Post | Age |
|---|---|---|
| btsfandom | May 2021 | ~5 years |
| bangtan | Dec 2021 | ~4 years |
| allforbts | Mar 2020 | ~6 years |
| 0613data | Jun 2022 | ~3.5 years |
| beautifulpersonpeach | Nov 2025 | ~3 months |

The feed pipeline at `src/services/feeds.ts:72` does:
```ts
const fresh = items.filter((item) => now - item.timestamp < MAX_AGE_MS);
```

With `MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000` (7 days), **every single Tumblr post is filtered out** because even the most recent one (beautifulpersonpeach, Nov 2025) is ~3 months old.

This causes:
- Zero Tumblr items in the feed (explains Test 1 and Test 2 failures)
- No Tumblr thumbnails visible (the user's direct complaint)

## Root Cause

**The 7-day freshness filter in `applyFeedPipeline()` eliminates ALL Tumblr posts because every configured Tumblr blog either stopped posting years ago or hasn't posted within the last 7 days.** The thumbnail rendering code itself is correct -- the problem is upstream: no Tumblr FeedItems survive the pipeline to be rendered.

## Secondary Observation

The user's phrasing "thumbnails of images on feed pages is not loading" may also indicate that Reddit/YouTube thumbnails have issues. However:
- YouTube thumbnails are constructed from video IDs and should always resolve
- Reddit thumbnails depend on the source post having one (text posts have `"self"` which is correctly filtered out)

The most impactful fix is addressing the Tumblr content absence. Reddit/YouTube thumbnails appear to be correctly handled in code.

## Files Involved

- `src/services/feeds.ts:7,72` -- `MAX_AGE_MS = 7 days` and freshness filter
- `src/config/groups/bts/sources.ts:133-178` -- All 5 Tumblr blog source entries point to inactive/stale blogs
- `src/services/sources/tumblr.ts:12-16` -- `extractThumbnail()` works correctly but is never reached for rendering because posts get filtered

## Fix Direction

Two-pronged approach needed:
1. **Replace stale Tumblr blogs** with active BTS fan blogs that post regularly (within the last 7 days)
2. **Consider increasing MAX_AGE_MS** for Tumblr sources specifically, or applying a source-specific freshness threshold, since Tumblr fan blogs often post less frequently than Reddit/YouTube
