---
status: testing
phase: 01-foundation
source: [01-01-SUMMARY.md, 01-02-SUMMARY.md, 01-03-SUMMARY.md, 01-04-SUMMARY.md]
started: 2026-02-25T07:00:00Z
updated: 2026-02-25T07:00:00Z
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

number: 1
name: Feed loads content from multiple sources
expected: |
  Open the app. The feed page shows posts from multiple source types — you should see Reddit posts, YouTube videos, and news articles. Items have source badges indicating where they came from.
awaiting: user response

## Tests

### 1. Feed loads content from multiple sources
expected: Open the app. The feed page shows posts from multiple source types — Reddit posts, YouTube videos, and news articles with source badges.
result: [pending]

### 2. Home page shows BTS branding from config
expected: Home page displays "BTS", "방탄소년단", the tagline "Beyond The Scene · ARMY Forever", and the group photo. All text is present and correctly rendered.
result: [pending]

### 3. Purple theme colors applied throughout
expected: The app uses the BTS purple color scheme — purple header/nav, purple accents on buttons and links. No broken or missing colors anywhere.
result: [pending]

### 4. BiasFilter shows 7 member chips
expected: The bias/member filter shows 7 chips (RM, Jin, SUGA, j-hope, Jimin, V, Jungkook) each with their emoji and color. Selecting a member filters the feed to show only content mentioning that member.
result: [pending]

### 5. Members page lists all 7 members
expected: The Members page shows all 7 BTS members with their photos, stage names, and basic info. Each member card is clickable.
result: [pending]

### 6. Member detail page shows full info
expected: Clicking a member card opens their detail page with photo, name, emoji, bio, fun facts, solo projects, and social media links.
result: [pending]

### 7. Skeleton loading cards appear during load
expected: When the feed is loading (refresh the page), you briefly see gray placeholder skeleton cards with a shimmer/pulse animation before real content appears.
result: [pending]

### 8. FeedCard shows "View original" link
expected: Each feed card has a small "View original" link that opens the source URL (Reddit post, YouTube video, news article) in a new tab.
result: [pending]

### 9. Feed items appear progressively
expected: On page load/refresh, feed items appear incrementally as each source resolves — not all at once after a long wait. You should see some items appear, then more fill in.
result: [pending]

## Summary

total: 9
passed: 0
issues: 0
pending: 9
skipped: 0

## Gaps

[none yet]
