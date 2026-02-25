# Debug Session: YouTube Stats Missing on Cards

**Date:** 2026-02-25
**Symptom:** "no stats showing on youtube cards"
**Test:** UAT Test 4 (YouTube stats on cards)
**Severity:** major

## Root Cause

**The only YouTube video surviving the feed pipeline has near-zero engagement (0 views, 1 like), and `MIN_STAT_THRESHOLD = 2` correctly hides these trivially low stats.** The user sees a YouTube card with no visible stats because the actual stats are below the display threshold.

This is a **downstream consequence** of the `MAX_AGE_MS = 7 days` filter (diagnosed in youtube-only-one-video.md), NOT a code bug in stats extraction or rendering.

### Why the stats code is correct

The entire stats pipeline was verified end-to-end:

1. **XML parsing** (`xmlParser.ts` lines 31-42): `getElementsByTagNameNS` correctly extracts `media:statistics views` and `media:starRating count` from YouTube's Atom feed. Verified with JSDOM, linkedom, and live CORS proxy fetch.

2. **YouTube fetcher** (`youtube.ts` lines 22-37): Correctly maps parsed views/likes to `FeedItem.stats` when values > 0.

3. **FeedCard rendering** (`FeedCard.tsx` lines 43-68): Correctly renders views/likes with SVG icons when `stats` exists and values >= `MIN_STAT_THRESHOLD`.

4. **Built bundle** (`dist/assets/index-CXSuFx1a.js`): Contains all stats extraction and rendering code. Verified by grepping for `starRating`, `community`, `feed-card-stat`.

5. **CORS proxies**: Return valid YouTube Atom XML with `media:community` data intact (tested corsproxy.io and codetabs.com).

### Why no stats appear at runtime

The root cause chain:

```
MAX_AGE_MS = 7 days
      |
      v
BANGTANTV newest video = 15 days old --> FILTERED OUT (has 544K views, 106K likes)
HYBE LABELS channel ID is wrong     --> 404, 0 videos
BangtanSubs is inactive (~8 months) --> FILTERED OUT
DKDKTV has 1 video from yesterday   --> PASSES age filter
      |
      v
DKDKTV video stats: views=0, likes=1 (starRating count=1)
      |
      v
MIN_STAT_THRESHOLD = 2
likes (1) < threshold (2)    --> NOT RENDERED
views (0) <= 0               --> NOT INCLUDED in stats object
      |
      v
User sees: YouTube card with NO stats
```

### Evidence

**DKDKTV video Atom feed data** (the only YouTube video in the feed):
```xml
<media:community>
  <media:starRating count="1" average="5.00" min="1" max="5"/>
  <media:statistics views="0"/>
</media:community>
```

**YouTube fetcher logic** (`youtube.ts` line 22):
```typescript
const hasStats = (entry.views && entry.views > 0) || (entry.likes && entry.likes > 0);
// entry.views = 0 -> falsy, entry.likes = 1 -> truthy
// hasStats = true, but stats = { likes: 1 } (views excluded as <= 0)
```

**FeedCard threshold** (`FeedCard.tsx` line 63):
```typescript
{item.stats.likes != null && item.stats.likes >= MIN_STAT_THRESHOLD && (...)}
// 1 >= 2 -> false -> likes NOT rendered
```

**Contrast with BANGTANTV** (filtered out by age):
- Newest video: 15 days old (published 2026-02-10)
- Stats: 544,536 views, 106,844 likes
- Would display beautifully as "544.5k views, 106.8k likes" -- but filtered out by MAX_AGE_MS

## Relationship to Other Bugs

This bug is a **direct consequence** of the youtube-only-one-video bug (Test 6). They share the same root cause:

| Root Issue | Test 6 Effect | Test 4 Effect |
|-----------|---------------|---------------|
| MAX_AGE_MS = 7 days too short for YouTube | Only 1 video survives (DKDKTV) | Only video surviving has near-zero stats |
| HYBE channel ID wrong | 0 HYBE videos | 0 HYBE stats |
| BangtanSubs inactive | 0 BangtanSubs videos | 0 BangtanSubs stats |
| BANGTANTV 15 days old | Filtered out despite being valid | High-stat videos (544K views) are unreachable |

**Fixing the MAX_AGE_MS issue (Test 6) will automatically fix this stats bug (Test 4)** because BANGTANTV videos with hundreds of thousands of views will be included in the feed.

## Files Involved

| File | Line(s) | Role |
|------|---------|------|
| `src/services/feeds.ts` | 7 | `MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000` -- primary cause. Filters out all BANGTANTV videos (15+ days old) that have meaningful stats |
| `src/config/groups/bts/sources.ts` | 56 | Wrong HYBE channel ID -- secondary cause, reduces YouTube pool |
| `src/components/FeedCard.tsx` | 12 | `MIN_STAT_THRESHOLD = 2` -- correctly hides trivial stats, but means the only surviving video (likes=1) shows nothing |

## NOT the Cause

- XML namespace parsing: `querySelectorAll("entry")` works in browsers for XML with default namespace (verified via W3C spec and jsdom/jsdom#2159)
- `parseAtom` stats extraction: Correctly reads `media:community > media:statistics views` and `media:starRating count`
- YouTube fetcher stats mapping: Correctly populates `FeedItem.stats`
- FeedCard rendering: Correctly checks `stats.views` and `stats.likes` against threshold
- CSS: No styles hiding stats (`.feed-card-stat` is `display: inline-flex`, no `overflow: hidden`)
- CORS proxies: Return valid XML with stats data
- Service worker: Current sw.js precaches the correct bundle with stats code
- dist build: Contains all stats code (verified by grepping bundle for `starRating`)
- Cache: `useFeed` cache doesn't strip stats

## Suggested Fix Direction

**No separate fix needed.** Fixing the `MAX_AGE_MS` issue from youtube-only-one-video.md will resolve this automatically:

1. Increase `MAX_AGE_MS` to 30 days (or make it source-specific) -> BANGTANTV videos with 544K+ views enter the feed -> stats display correctly
2. Fix HYBE channel ID -> more YouTube videos with real engagement -> more stats visible
3. (Optional) Consider lowering `MIN_STAT_THRESHOLD` to 1, but this is not the real fix -- the real fix is letting high-engagement videos through the age filter
