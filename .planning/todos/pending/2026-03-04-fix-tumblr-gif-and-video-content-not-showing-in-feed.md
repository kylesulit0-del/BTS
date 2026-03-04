---
created: 2026-03-04T05:02:19.357Z
title: Fix Tumblr GIF and video content not showing in feed
area: api
files:
  - packages/server/src/scrapers/tumblr.ts:66-69
  - packages/server/src/db/schema.ts
  - packages/frontend/src/types/feed.ts
  - packages/frontend/src/components/snap/SnapCard.tsx:33-38
  - packages/frontend/src/components/snap/SnapCardImage.tsx
---

## Problem

Tumblr GIFs are not displaying in the feed. The Tumblr RSS feed contains `<video>` elements with `.mp4` sources (animated GIF-like content), but the server-side scraper only extracts `<img>` tags using regex `/<img[^>]+src=["']([^"']+)["']/i`, completely missing video content.

Example from Tumblr RSS:
```xml
<video controls autoplay playsinline muted
  poster="https://64.media.tumblr.com/.../s540x810/...">
  <source src="https://va.media.tumblr.com/tumblr_xxx.mp4" type="video/mp4">
</video>
```

Additionally:
- DB schema only has `thumbnailUrl` (no media type tracking)
- Frontend `VideoType` only supports YouTube/TikTok, not generic video/GIF
- Card variant logic (`getCardVariant`) routes Tumblr content to image cards even when it's video

## Solution

1. Enhance Tumblr scraper (`tumblr.ts`) to extract `<video><source>` URLs alongside `<img>` tags
2. Extend DB schema to track media type (image vs video/gif)
3. Extend `FeedItem` type to support generic `videoUrl` field
4. Update `getCardVariant` logic to handle Tumblr video content
5. Render Tumblr videos with `<video>` element instead of CSS `background-image`
