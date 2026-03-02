---
status: complete
phase: 08-smart-blend-and-integration
source: [08-01-SUMMARY.md, 08-02-SUMMARY.md]
started: 2026-03-02T06:15:00Z
updated: 2026-03-02T06:20:00Z
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

[testing complete]

## Tests

### 1. Feed ranking order
expected: Start the server and load the feed. Items should NOT be in pure newest-first order. Content with higher engagement should appear above newer but low-engagement content. The feed should feel like a "best of" mix, not a chronological timeline.
result: skipped
reason: need to deploy first to test live

### 2. Source diversity in feed
expected: Scroll through the feed. No more than 2 consecutive items should come from the same source (e.g., you should never see 3 Reddit posts in a row). Sources should be interleaved throughout.
result: issue
reported: "there are no posts from reddit, youtube, bluesky etc — only tumblr and rss in database. Cross-source diversity can't be verified with current data."
severity: major

### 3. Priority boost for fan translations
expected: Content from bts-trans (Tumblr fan translation account) should appear noticeably higher in the feed than general content with similar age and engagement. It won't always be #1, but it should consistently rank above average.
result: pass

### 4. API mode feed loading
expected: With VITE_API_URL set and the server running, the feed loads from the server API. You can verify in browser DevTools Network tab — requests should go to the API URL, not directly to Reddit/YouTube/etc.
result: pass

### 5. Client-side fallback mode
expected: Without VITE_API_URL set (or with it unset), the feed loads via client-side fetching directly from sources. Feed still works and displays cards identically. Client-side mode applies basic diversity interleaving (max 2 consecutive from same source).
result: skipped
reason: need to rebuild without VITE_API_URL to test

### 6. Silent API fallback
expected: With VITE_API_URL set but the server stopped/unreachable, the feed should still load — silently falling back to client-side fetching. No error message shown to user. A console.warn may appear in DevTools but nothing visible in the UI.
result: skipped
reason: need to rebuild without VITE_API_URL to test fallback

### 7. Page-based pagination
expected: Scrolling through the feed loads additional pages of ranked content. Items should not repeat between pages. Each page maintains the ranked order and diversity constraints.
result: pass

## Summary

total: 7
passed: 3
issues: 1
pending: 0
skipped: 3
skipped: 1

## Gaps

- truth: "No more than 2 consecutive items from the same source appear in the feed, with sources interleaved throughout"
  status: failed
  reason: "User reported: there are no posts from reddit, youtube, bluesky etc — only tumblr and rss content in database. Scrapers for reddit, youtube, bluesky not populating data."
  severity: major
  test: 2
  artifacts: []
  missing: []
