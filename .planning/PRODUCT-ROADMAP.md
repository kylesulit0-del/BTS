# BTS Army Feed — Product Roadmap & Requirements

**Created:** 2026-03-06
**Based on:** Full codebase audit of 11,697 LOC across 3 packages
**Current state:** v4.0 shipped — 15 phases, 41 plans, 4 milestones complete

---

## 1. Current Source Audit

Active sources in `packages/shared/src/config/sources.ts` (28 configured, 22 active):

| # | Source Name | Integration Method | Content Type | Status | Config ID | Notes |
|---|-------------|-------------------|--------------|--------|-----------|-------|
| 1 | r/bangtan | Reddit JSON API | Posts, links, images | **Working** | `reddit-bangtan` | BTS-dedicated, no keyword filter, 50 items |
| 2 | r/heungtan | Reddit JSON API | Memes, fan content | **Working** | `reddit-heungtan` | BTS-dedicated, no keyword filter, 50 items |
| 3 | r/bts7 | Reddit JSON API | Discussion, fan content | **Working** | `reddit-bts7` | BTS-dedicated, no keyword filter, 50 items |
| 4 | r/BTSWorld | Reddit JSON API | Game-related posts | **Working** | `reddit-btsworld` | BTS-dedicated, no keyword filter, 50 items |
| 5 | r/kpop | Reddit JSON API | Mixed K-pop | **Working** | `reddit-kpop` | Broad, keyword-filtered, 50 items |
| 6 | r/kpopthoughts | Reddit JSON API | Discussion | **Working** | `reddit-kpopthoughts` | Broad, keyword-filtered, 50 items |
| 7 | r/kpoopheads | Reddit JSON API | Memes, humor | **Working** | `reddit-kpoopheads` | Broad, keyword-filtered, 50 items |
| 8 | BANGTANTV | YouTube RSS/Atom | Video | **Working** | `yt-bangtantv` | Official BTS channel, no filter, 15 items |
| 9 | HYBE LABELS | YouTube RSS/Atom | Video | **Working** | `yt-hybe` | Broad, keyword-filtered, 15 items |
| 10 | Soompi | RSS 2.0 | News articles | **Working** | `rss-soompi` | Keyword-filtered, 20 items |
| 11 | AllKPop | RSS 2.0 | News articles | **Working** | `rss-allkpop` | Keyword-filtered, 20 items |
| 12 | Koreaboo | RSS 2.0 | News articles | **Working** | `rss-koreaboo` | Keyword-filtered, 20 items |
| 13 | HELLOKPOP | RSS 2.0 | News articles | **Working** | `rss-hellokpop` | Keyword-filtered, 20 items |
| 14 | KpopStarz | RSS 2.0 | News articles | **Working** | `rss-kpopstarz` | Keyword-filtered, 20 items |
| 15 | Seoulbeats | RSS 2.0 | News articles | **Working** | `rss-seoulbeats` | Keyword-filtered, 20 items |
| 16 | Asian Junkie | RSS 2.0 | News articles | **Working** | `rss-asianjunkie` | Keyword-filtered, 20 items |
| 17 | Seoul Space | RSS 2.0 | News articles | **Disabled** | `rss-seoulspace` | `PENDING_URL` — URL not verified |
| 18 | bts-trans | Tumblr RSS | Fan translations | **Working** | `tumblr-bts-trans` | 1.5x ranking boost, no filter, 10 items |
| 19 | kimtaegis | Tumblr RSS | Fan content | **Working** | `tumblr-kimtaegis` | Keyword-filtered, 10 items |
| 20 | userparkjimin | Tumblr RSS | Fan content | **Working** | `tumblr-userparkjimin` | Keyword-filtered, 10 items |
| 21 | namjin | Tumblr RSS | Fan content | **Working** | `tumblr-namjin` | Keyword-filtered, 10 items |
| 22 | jikook | Tumblr RSS | Fan content | **Working** | `tumblr-jikook` | Keyword-filtered, 10 items |
| 23 | Bluesky BTS | AT Protocol API | Social posts, images | **Working** | `bluesky-bts` | Searches "BTS" + top 5 config keywords, 25 items |

**Summary:** 5 scraper implementations (Reddit, YouTube, RSS, Tumblr, Bluesky). 22 working sources, 1 disabled. All use config-driven `ScrapingSource` interface with `needsFilter`, `priority`, `boost`, `enabled` fields.

**Technical notes:**
- Reddit uses free public JSON API (`reddit.com/r/{sub}/hot.json`), not the paid API. No API key configured.
- YouTube uses RSS feeds — no engagement stats (views/likes) available without YouTube Data API.
- Tumblr scraper fetches blog-specific RSS only — no tag-based search capability.
- Bluesky requires `BLUESKY_HANDLE` and `BLUESKY_APP_PASSWORD` env vars; degrades gracefully if missing.
- All scrapers use URL-normalized deduplication and 14-day soft-delete retention.
- LLM pipeline classifies content into: `news`, `fan_art`, `meme`, `video`, `discussion`, `translation`, `official`.

---

## 2. Phased Release Plan

> **Version note:** Shipped milestones use v1.0–v4.0. To avoid collision, this roadmap uses **v5.1, v5.2, v5.3, v6.0** as milestone identifiers while preserving the user's tier/priority grouping.

### v5.1 — Quick Wins
*Config expansions + RSS additions + content type filter enhancement*

| Feature | Type | Effort | New Scraper? |
|---------|------|--------|-------------|
| Reddit subreddit expansion (r/BTSARMY, r/Korean_Hip_Hop, solo member subs) | Config | S | No |
| Tumblr blog expansion (additional BTS fan blogs) | Config | S | No |
| Google News RSS (4 query feeds) | Config | S | No |
| K-pop News RSS expansion (Billboard, Rolling Stone) | Config | S | No |
| AO3 fan fiction RSS feed | Config | S | No |
| Content Type filter expansion (fan fiction, social, music categories) | Code | M | No |

### v5.2 — Growth
*New API integrations + member filter + affiliate hub*

| Feature | Type | Effort | New Scraper? |
|---------|------|--------|-------------|
| Bluesky search expansion (member handles, Korean hashtags) | Config | S | No |
| Tumblr tag-based search via API v2 | Code | M | Modify existing |
| Last.fm integration (artist stats, top tracks) | Code | M | Yes |
| DeviantArt fan art integration | Code | M | Yes |
| Per-member server-side tagging + filter | Code | M | No |
| Affiliate Link Hub (Ticketmaster, merch, streaming) | Code | M | No |

### v5.3 — Reach
*Paid API sources + federated social + trending*

| Feature | Type | Effort | New Scraper? |
|---------|------|--------|-------------|
| X/Twitter via official API v2 ($100/mo, feature-flagged) | Code | L | Yes |
| Mastodon/Fediverse hashtag search | Code | M | Yes |
| Pinterest (pending API approval) | Code | M | Yes |
| Trending / Hot Right Now widget | Code | M | No |

### v6.0 — Full Expansion
*Restricted-access sources + compliance*

| Feature | Type | Effort | New Scraper? |
|---------|------|--------|-------------|
| TikTok Discovery via Research API (pending application) | Code | L | Yes |
| Spotify artist data + embed player | Code | M | Yes |
| SoundCloud search + oEmbed widget | Code | M | Yes |
| Legal Compliance page (static) | Code | S | No |

---

## 3. Per-Feature Requirements

### SOURCES — Tier 1 (High Priority, Free)

---

#### SRC-01: Reddit Subreddit Expansion

**Description:** Add subreddits to the existing Reddit scraper config to maximize BTS content volume. No scraper code changes needed — config-only.

**Subreddits to add:**

| Subreddit | BTS-dedicated? | `needsFilter` | Priority | Notes |
|-----------|----------------|---------------|----------|-------|
| r/BTSARMY | Yes | false | 4 | Fan community |
| r/Korean_Hip_Hop | No | true | 7 | Broad, keyword filter needed |
| r/Namjoon | Yes (solo) | false | 8 | RM solo content |
| r/jinbts | Yes (solo) | false | 8 | Jin solo content |
| r/Suga | Yes (solo) | false | 8 | SUGA/Agust D solo content |
| r/jhope | Yes (solo) | false | 8 | j-hope solo content |
| r/jimin | Yes (solo) | false | 8 | Jimin solo content |
| r/taehyung | Yes (solo) | false | 8 | V solo content |
| r/jungkook | Yes (solo) | false | 8 | Jungkook solo content |

**Acceptance criteria:**
- [ ] All 9 subreddits added to `getBtsScrapingConfig()` in `packages/shared/src/config/sources.ts`
- [ ] Solo subreddits tagged with member context for per-member filter (SRC-01 feeds FEAT-01)
- [ ] `fetchCount` set appropriately (smaller subs: 25; r/BTSARMY: 50)
- [ ] Scraper successfully returns items from each new subreddit
- [ ] Frontend `sourceLabels` updated if new source types appear in filter

**Legal notes:** Reddit public JSON API, no ToS issues. Note: this is the *free* public endpoint, not the paid API — see Open Questions.

**Effort:** S (config changes only)

**Dependencies:** None

---

#### SRC-02: Tumblr Blog Expansion

**Description:** Add BTS fan blogs to the existing Tumblr RSS scraper config. Config-only change.

**Blogs to add (examples — verify activity before adding):**
- Popular BTS gifset/fanart blogs (research top-traffic BTS Tumblr blogs)
- Member-specific blogs (RM, Jin, SUGA, j-hope, Jimin, V, Jungkook focused)

**Acceptance criteria:**
- [ ] New blog RSS feeds added to source config
- [ ] Each blog verified as active (published within last 30 days)
- [ ] Keyword filtering applied to non-BTS-dedicated blogs
- [ ] Tumblr scraper successfully parses new blog feeds

**Legal notes:** Tumblr RSS feeds are public. No ToS restrictions for aggregation.

**Effort:** S (config changes only)

**Dependencies:** None. Note: Tumblr GIF/video display bug (from v4.0 pending todos) should be fixed before expanding Tumblr sources.

---

#### SRC-03: Tumblr Tag Search via API

**Description:** Extend Tumblr scraper to search by tag using Tumblr API v2, supplementing the existing blog-RSS approach. This surfaces content from across all of Tumblr, not just configured blogs.

**Tags to search:** `#bts`, `#bangtan`, `#army`, `#bts fanart`, `#bts gif`, plus per-member tags (`#rm bts`, `#jin bts`, `#suga bts`, `#jhope`, `#jimin`, `#taehyung`, `#jungkook`)

**Implementation pattern:**
- Tumblr API v2 endpoint: `GET api.tumblr.com/v2/tagged?tag={tag}&api_key={KEY}`
- Free tier: 1,000 requests/day (sufficient for 15 tags at 20-min cron = 1,080/day — tight; may need 30-min cron for Tumblr)
- Add `TUMBLR_API_KEY` env var with graceful degradation (fall back to blog-RSS-only if missing)
- Modify `TumblrScraper` to run in two modes: blog RSS (existing) + tag API search (new)
- Extract engagement stats: `note_count` available from API (not available from RSS)

**Acceptance criteria:**
- [ ] `TumblrScraper` supports both blog RSS and tag API search
- [ ] `TUMBLR_API_KEY` env var documented; scraper degrades to RSS-only if missing
- [ ] Tag search results deduplicated against blog RSS results (by URL)
- [ ] `engagementStats: { notes: note_count }` populated for API-sourced items
- [ ] Rate limiting respects Tumblr's 1,000 req/day free tier
- [ ] New source entries added to config with `type: 'tumblr'` and appropriate priority

**Legal notes:** Tumblr API v2 is free, ToS permits fan aggregation. API key required (register at tumblr.com/oauth/apps).

**Effort:** M (modify existing scraper + API key setup)

**Dependencies:** None

---

#### SRC-04: Google News RSS

**Description:** Add Google News RSS feeds as new sources using the existing RSS scraper. No code changes needed.

**Feeds to add:**

| Feed | URL | `needsFilter` |
|------|-----|---------------|
| BTS K-pop News | `https://news.google.com/rss/search?q=BTS+kpop` | false |
| BTS HYBE News | `https://news.google.com/rss/search?q=BTS+HYBE` | false |
| BTS Comeback News | `https://news.google.com/rss/search?q=BTS+comeback` | false |
| BTS Concert News | `https://news.google.com/rss/search?q=BTS+concert` | false |

**Acceptance criteria:**
- [ ] 4 Google News RSS feeds added to source config with `type: 'rss'`
- [ ] `needsFilter: false` (Google News query already scopes to BTS)
- [ ] RSS scraper successfully parses Google News feed format
- [ ] Thumbnails extracted via existing progressive strategy (RSS enclosure > og:image)
- [ ] Deduplication handles Google News redirect URLs (may need URL normalization update)

**Legal notes:** Standard RSS, no restrictions. Google News RSS is publicly available.

**Effort:** S (config + possible URL normalization tweak for Google redirect URLs)

**Dependencies:** None

---

#### SRC-05: Bluesky Search Expansion

**Description:** Expand Bluesky scraper search terms to include member-specific handles, Korean hashtags, and ARMY community terms. Config-only change.

**Additional search terms:**
- Korean: `방탄소년단`, `아미`, `#BTSArmy`
- Member handles: official Bluesky handles for each member (if they exist)
- Solo project names: `Agust D`, `Hope World`, `Layover`, `GOLDEN`, `FACE`, `Indigo`

**Implementation:** The Bluesky scraper already searches `source.url` plus top 5 config keywords. Options:
1. Add more Bluesky source entries in config (one per search term group)
2. Increase the keyword slice from 5 to cover all terms

**Acceptance criteria:**
- [ ] Korean hashtag searches added
- [ ] Member-specific search terms added
- [ ] Deduplication handles increased result volume across keyword searches
- [ ] Rate limiting adjusted if needed (currently 500ms between keyword searches)

**Legal notes:** Bluesky AT Protocol is fully open. No ToS restrictions.

**Effort:** S (config changes)

**Dependencies:** None

---

#### SRC-06: K-pop News RSS Expansion

**Description:** Add more K-pop news RSS feeds to the existing RSS scraper config.

**Feeds to add:**

| Source | URL | Status | Notes |
|--------|-----|--------|-------|
| AllKPop | `https://www.allkpop.com/feed` | **Already configured** | No action needed |
| Billboard K-Town | `https://www.billboard.com/t/k-pop/feed/` | **Needs verification** | May not have RSS |
| Rolling Stone K-pop | Rolling Stone tag RSS | **Needs verification** | May not have RSS |
| Naver News (English) | `https://news.naver.com` | **Unlikely** | No English RSS; Korean-only |

**Acceptance criteria:**
- [ ] Each candidate URL verified for valid RSS feed before adding
- [ ] Working feeds added to source config with `type: 'rss'`, `needsFilter: true`
- [ ] Non-working feeds documented in Open Questions for alternative approach

**Legal notes:** Standard RSS, no restrictions.

**Effort:** S (config changes after URL verification)

**Dependencies:** None

**Note:** AllKPop is already active (source #11). Soompi additional per-member feeds may not exist as separate RSS endpoints — verify before planning.

---

#### SRC-07: Last.fm Integration

**Description:** New scraper for Last.fm API to surface BTS and solo member music stats, trending tracks, and top albums.

**API details:**
- Base URL: `https://ws.audioscrobbler.com/2.0/`
- Auth: API key (free, register at last.fm/api)
- Endpoints:
  - `artist.getTopTracks` — BTS + each solo artist
  - `artist.getInfo` — Stats and bio
  - `artist.getTopAlbums` — Album catalog
  - `tag.getTopTracks` for `kpop` tag (filtered)

**Implementation pattern:**
- New `LastfmScraper` class implementing `Scraper` interface
- Similar to `BlueskyScraper` — API-key-based, graceful degradation if key missing
- Env var: `LASTFM_API_KEY`
- Content type: `music` (new classification value)
- Engagement stats: `{ listeners, playcount }`
- Thumbnail: album art URL from API response

**Acceptance criteria:**
- [ ] `LastfmScraper` class created in `packages/server/src/scrapers/lastfm.ts`
- [ ] Implements `Scraper` interface (name, scrape() returning ScraperResult[])
- [ ] Fetches top tracks and albums for BTS + 7 solo artists
- [ ] Engagement stats populated with listener/playcount data
- [ ] Album art thumbnails extracted (URL only, no storage)
- [ ] Rate limiting: Last.fm allows 5 req/sec — add 200ms delay between calls
- [ ] Registered in scraper runner in `packages/server/src/index.ts`
- [ ] Source config entries added

**Legal notes:** Last.fm API is free for non-commercial use. Fan app qualifies. ToS permits read access.

**Effort:** M (new scraper class + config)

**Dependencies:** None

---

#### SRC-08: AO3 Fan Fiction RSS

**Description:** Add AO3 tag RSS feed using the existing RSS scraper. No new scraper needed.

**Feed:** `https://archiveofourown.org/tags/방탄소년단 | Bangtan Boys | BTS/feed.atom`

**Acceptance criteria:**
- [ ] AO3 Atom feed URL verified and added to source config with `type: 'rss'`
- [ ] `rss-parser` handles Atom format (it does — already used for YouTube)
- [ ] Content type default: classify as `fan_fiction` (requires LLM category expansion)
- [ ] Display: link-out only — never reproduce story text beyond title/summary
- [ ] `needsFilter: false` (tag-scoped feed)

**Legal notes:** AO3 explicitly supports RSS aggregation in their ToS. Link-out approach is compliant. Never reproduce story content — title, author, summary, and link only.

**Effort:** S (config + possible Atom URL encoding tweak)

**Dependencies:** Content Type filter expansion (FEAT-02) for `fan_fiction` category

---

### SOURCES — Tier 2 (Medium Priority, Costs/Approval Required)

---

#### SRC-09: X/Twitter via Official API v2

**Description:** New scraper using Twitter API v2 Basic tier to replace the dead Nitter integration. Feature-flagged to gate behind budget approval.

**API details:**
- Tier: Basic ($100/month)
- Endpoint: `GET /2/tweets/search/recent?query=BTS`
- Rate limit: 60 requests/15-min (Basic tier)
- Also query: `#BTSArmy`, `#방탄소년단`, official member handles (@BTS_twt, etc.)

**Implementation pattern:**
- New `TwitterScraper` class implementing `Scraper` interface
- Env vars: `TWITTER_BEARER_TOKEN`, `TWITTER_ENABLED=false` (feature flag)
- Display: oEmbed via `https://publish.twitter.com/oembed?url={tweet_url}` only
- Never store tweet text content directly — store URL and use oEmbed for rendering
- Engagement stats: `{ likes, retweets, replies }` from API response
- Thumbnail: from tweet media entities (URL only)

**Acceptance criteria:**
- [ ] `TwitterScraper` class created in `packages/server/src/scrapers/twitter.ts`
- [ ] Feature flag: scraper skips entirely if `TWITTER_ENABLED !== 'true'`
- [ ] oEmbed rendering implemented in frontend for Twitter cards
- [ ] Engagement stats: likes, retweets, replies
- [ ] Rate limiting respects 60 req/15-min Basic tier limit
- [ ] Source badge color added for Twitter (#1DA1F2 — already exists in frontend)
- [ ] Test with mock data possible without active API key

**Legal notes:** ToS-compliant when using official API + oEmbed display. Must not store tweet content. oEmbed iframe is the only permitted display method.

**Effort:** L (new scraper + oEmbed frontend component + feature flag infrastructure)

**Dependencies:** Feature flag system (does not exist — needs implementation)

---

#### SRC-10: Pinterest

**Description:** New scraper using Pinterest API. Requires formal application at developers.pinterest.com.

**Application steps:**
1. Create Pinterest business account
2. Apply at `developers.pinterest.com` for API access
3. Describe use case: fan content aggregator, read-only, link-out display
4. Wait for approval (typically 1-2 weeks)
5. Once approved: OAuth app setup, get access token

**API details (post-approval):**
- Endpoint: `GET /v5/pins` with search, `GET /v5/boards` for curated boards
- Content: Fan art, aesthetic boards, photo collections
- Display: Link out to pins only — do not embed or re-host images

**Implementation pattern:**
- New `PinterestScraper` class
- Env vars: `PINTEREST_ACCESS_TOKEN`
- Content type: `fan_art`
- Engagement stats: `{ saves }` from API
- Thumbnail: pin image URL (link only)

**Acceptance criteria:**
- [ ] API application submitted and documented
- [ ] `PinterestScraper` class created (can be stubbed until approval)
- [ ] Link-out display only — no image embedding
- [ ] Graceful degradation if credentials missing

**Legal notes:** Official API. Link-out approach is safe regardless of ToS details. Do not re-host images.

**Effort:** M (new scraper + API application process)

**Dependencies:** Pinterest API approval (external blocker)

---

#### SRC-11: DeviantArt Fan Art

**Description:** New scraper using DeviantArt's official OAuth API for BTS fan art.

**API details:**
- Base URL: `https://www.deviantart.com/api/v1/oauth2/`
- Auth: OAuth2 client credentials (free)
- Endpoint: `GET /browse/tags?tag=bts` (also: `bangtan`, `bts fanart`, `bts kpop`)
- Rate limit: 50,000 req/day (generous)

**Implementation pattern:**
- New `DeviantArtScraper` class
- Env vars: `DEVIANTART_CLIENT_ID`, `DEVIANTART_CLIENT_SECRET`
- OAuth2 client credentials flow (no user auth needed)
- Content type: `fan_art`
- Engagement stats: `{ favourites, comments }` from API
- Thumbnail: deviation thumbnail URL (link only, never re-host)

**Acceptance criteria:**
- [ ] `DeviantArtScraper` class created implementing `Scraper` interface
- [ ] OAuth2 token refresh handled automatically
- [ ] Tag searches for BTS-related terms
- [ ] Link-out display only — do not re-host images
- [ ] Engagement stats populated from API response
- [ ] Graceful degradation if credentials missing

**Legal notes:** Official API, ToS allows read access for fan aggregators. Never re-host artwork — link to DeviantArt page.

**Effort:** M (new scraper + OAuth2 flow)

**Dependencies:** None

---

#### SRC-12: Mastodon / Fediverse

**Description:** New scraper using Mastodon's public REST API for BTS hashtag timelines.

**API details:**
- Endpoint: `GET /api/v1/timelines/tag/:hashtag` (no auth required for public posts)
- Target instances: `mastodon.social`, `mstdn.social`
- Hashtags: `#BTS`, `#BTSArmy`, `#kpop`, `#방탄소년단`
- Rate limit: 300 req/5-min per instance (generous)

**Implementation pattern:**
- New `MastodonScraper` class
- No auth required for public hashtag timelines
- Multi-instance support: iterate configured instances
- Deduplication: by post URL across instances (federated posts appear on multiple instances)
- Content type: LLM-classified (mixed content)
- Engagement stats: `{ favourites, reblogs, replies }` from API
- Thumbnail: from media attachments (URL only)
- oEmbed available via each instance's oEmbed endpoint

**Acceptance criteria:**
- [ ] `MastodonScraper` class created implementing `Scraper` interface
- [ ] Multi-instance support with configurable instance list
- [ ] Hashtag search across configured instances
- [ ] Cross-instance deduplication
- [ ] Engagement stats from favourites/reblogs/replies
- [ ] Media attachment thumbnails (URL only)
- [ ] Rate limiting per instance

**Legal notes:** Fully open API, no ToS restrictions for aggregation of public posts.

**Effort:** M (new scraper, no auth needed)

**Dependencies:** None

---

### SOURCES — Tier 3 (Lower Priority, Restricted)

---

#### SRC-13: TikTok Discovery via Research API

**Description:** Proactive TikTok content discovery beyond the current oEmbed-only approach (which only works for TikTok URLs found in Reddit posts).

**Current state:** The app can embed known TikTok URLs via oEmbed player. There is no way to *discover* TikTok content proactively.

**Application requirements:**
1. Apply at `developers.tiktok.com` for Research API access
2. Describe use case: fan content aggregation, read-only, oEmbed display
3. Research API requires academic/commercial justification
4. Review cycle: 2-4 weeks
5. If approved: OAuth2 app setup

**Implementation (post-approval):**
- New `TikTokScraper` class
- Research API endpoint for keyword search
- Display: oEmbed player only (already implemented in frontend)
- Never scrape or store TikTok content (LEGAL RULE #2)

**Acceptance criteria:**
- [ ] API application submitted and documented
- [ ] Scraper class stubbed with feature flag
- [ ] oEmbed display only (frontend support exists)
- [ ] Absolute compliance with Legal Rule #2

**Legal notes:** CRITICAL — Legal Rule #2 prohibits TikTok scraping. Only the official Research API is permitted. oEmbed embedding (iframe) is the only allowed display method. Never fetch from tiktok.com or tiktokcdn.com directly.

**Effort:** L (application process + new scraper)

**Dependencies:** TikTok Research API approval (external blocker, uncertain timeline)

---

#### SRC-14: Spotify

**Description:** Spotify API integration for BTS/solo member music data with official embed player.

**API details:**
- Base URL: `https://api.spotify.com/v1/`
- Auth: OAuth2 client credentials (free)
- Endpoints:
  - `GET /artists/{id}` — BTS artist profile
  - `GET /artists/{id}/top-tracks` — Top tracks (BTS + each solo member)
  - `GET /artists/{id}/albums` — Discography
  - `GET /search?q=BTS&type=track` — Search
- Rate limit: ~180 req/min

**Spotify artist IDs (from member config):**
- BTS: `3Nrfpe0tUJi4K4DXYWgMUX`
- RM: `4rghtUEklOGTB3MgHIWnOF`
- Jin: `5vV3bFXnspGKeFokaIXJvY`
- Agust D: `1oSPZhvZMIrWW5I3cAvSCz`
- j-hope: `0b1sIQumIAsNbqAoAClMHY`
- Jimin: (verify — config has same ID as Agust D, likely a bug)
- V: `2cFrymmkijnjDg9SS92EPM`
- Jung Kook: `6HaGTQPmv1OTuIE5MgJiBE`

**Implementation pattern:**
- New `SpotifyScraper` class
- Env vars: `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`
- Content type: `music`
- Display: Spotify iframe embed (`open.spotify.com/embed/track/{id}`)
- Engagement stats: `{ popularity }` (Spotify 0-100 popularity score)
- Pairs with affiliate links to streaming

**Acceptance criteria:**
- [ ] `SpotifyScraper` class created implementing `Scraper` interface
- [ ] Fetches top tracks and new releases for BTS + 7 solo artists
- [ ] Spotify embed iframe rendering in frontend
- [ ] Popularity score as engagement metric
- [ ] Album art as thumbnail (URL only)
- [ ] Graceful degradation if credentials missing

**Legal notes:** Spotify API ToS allows fan apps and aggregators. Embed player is the recommended display method.

**Effort:** M (new scraper + frontend embed component)

**Dependencies:** None

---

#### SRC-15: SoundCloud

**Description:** SoundCloud API integration for rare/unreleased BTS tracks.

**API details:**
- Base URL: `https://api.soundcloud.com/`
- Auth: Client ID (free)
- Endpoint: `GET /tracks?q=BTS&genres=kpop`
- oEmbed: `https://soundcloud.com/oembed?url={track_url}&format=json`

**Implementation pattern:**
- New `SoundCloudScraper` class
- Env var: `SOUNDCLOUD_CLIENT_ID`
- Content type: `music`
- Display: SoundCloud oEmbed widget (iframe)
- Engagement stats: `{ playback_count, likes_count }` from API

**Acceptance criteria:**
- [ ] `SoundCloudScraper` class created implementing `Scraper` interface
- [ ] Searches for BTS/bangtan tagged tracks
- [ ] SoundCloud oEmbed widget rendering in frontend
- [ ] Engagement stats from API
- [ ] Graceful degradation if credentials missing

**Legal notes:** Official API, ToS permits aggregation and embedding.

**Effort:** M (new scraper + frontend oEmbed component)

**Dependencies:** None

---

### FEATURES

---

#### FEAT-01: Per-Member Filter (Server-Side)

**Description:** Upgrade member filtering from client-side keyword matching to server-side member tagging at ingest time. Users filter the feed by BTS member (RM, Jin, SUGA, J-Hope, Jimin, V, Jungkook, or OT7/all).

**Current state:**
- Client-side `matchesBias()` function in `useFeed.ts` does keyword matching against `item.title + item.preview`
- Member aliases defined in `config/groups/bts/members.ts` (comprehensive: stage names, real names, solo project names)
- FilterSheet has a "Member" tab that dispatches `TOGGLE_MEMBER` actions
- Filtering is LOCAL ONLY — server returns all content regardless of member selection

**What needs to change:**

1. **Schema addition:** Add `memberTags` column to `content_items` table (text, JSON array, nullable)
2. **Ingest tagging:** After LLM classification, run member-alias keyword matching on `title + description` to populate `memberTags` (reuse existing alias config from shared package)
3. **API query param:** Add `member` query param to `GET /api/feed` that filters by `memberTags LIKE '%"rm"%'`
4. **Frontend:** Update `useFeed.ts` API call to pass selected members as query params instead of client-side filtering
5. **Solo subreddits:** Posts from r/Namjoon auto-tagged `["rm"]`, r/jinbts auto-tagged `["jin"]`, etc. (source-level default tagging)

**Acceptance criteria:**
- [ ] `memberTags` column added via Drizzle migration
- [ ] Member tagging runs at ingest (during scraping or pipeline)
- [ ] Solo subreddit posts auto-tagged by source config
- [ ] `GET /api/feed?member=rm` returns only RM-tagged items
- [ ] Multi-member filter supported (comma-separated: `?member=rm,jin`)
- [ ] Frontend dispatches server-side filter instead of client-side keyword match
- [ ] OT7/all = no member filter (default)
- [ ] Filtered views work with all sort modes

**Legal notes:** No legal concerns — internal data enrichment.

**Effort:** M (schema migration + ingest logic + API param + frontend update)

**Dependencies:** Reddit solo subreddit expansion (SRC-01) for best results

---

#### FEAT-02: Content Type Filter Expansion

**Description:** Expand content type classification to cover new source categories and update filter UI.

**Current LLM classification:** `news`, `fan_art`, `meme`, `video`, `discussion`, `translation`, `official`

**Current UI filter categories:** Video, Image, News, Discussion (4 categories mapping to 7 LLM types)

**Target categories (user-requested):** Video, News, Fan Art, Fan Fiction, Social Posts, Music, Merchandise & Events

**Proposed mapping:**

| UI Category | LLM contentType values | Source defaults |
|-------------|----------------------|-----------------|
| Video | `video` | YouTube items |
| News | `news`, `official` | RSS news items |
| Fan Art | `fan_art` | DeviantArt, Tumblr art blogs |
| Fan Fiction | `fan_fiction` (NEW) | AO3 |
| Social Posts | `discussion`, `meme` | Reddit, Bluesky, Mastodon, Twitter |
| Music | `music` (NEW) | Last.fm, Spotify, SoundCloud |
| Translation | `translation` | bts-trans Tumblr |
| Merch & Events | `merch_events` (NEW) | Affiliate hub items (if surfaced in feed) |

**What needs to change:**

1. **LLM prompt update:** Add `fan_fiction`, `music`, `merch_events` to classification enum in pipeline prompt
2. **Zod schema update:** Extend `BatchItemDecisionSchema.contentType` enum
3. **Source-level defaults:** Set default contentType for source types where it's unambiguous (AO3 = fan_fiction, Last.fm = music)
4. **Frontend CONTENT_TYPE_CATEGORIES:** Update `FilterSheet.tsx` categories array
5. **Frontend contentType mapping:** Update `contentTypes.ts` badge colors and labels
6. **Shared types:** Update `ContentType` union type in `@bts/shared`

**Acceptance criteria:**
- [ ] LLM classifies into expanded type set
- [ ] Source-level defaults applied before LLM (AO3 → fan_fiction, Spotify → music)
- [ ] FilterSheet displays all new categories
- [ ] Server-side `?contentType=` filter works for all new types
- [ ] Badge colors assigned for new types
- [ ] Existing content re-classifiable via pipeline re-run (optional)

**Legal notes:** No legal concerns.

**Effort:** M (LLM prompt + schema types + frontend UI)

**Dependencies:** New source integrations that introduce content types (SRC-07 Last.fm, SRC-08 AO3, SRC-14 Spotify)

---

#### FEAT-03: Affiliate Link Hub

**Description:** Dedicated section surfacing BTS tour dates (Ticketmaster affiliate), official merch (Weverse Shop affiliate), and new releases (streaming affiliate links). Config-driven, editable without code deploy.

**Requirements:**
1. **Config file:** `packages/shared/src/config/affiliates.ts` (or JSON) with typed schema:
   ```
   { category, label, url, imageUrl?, description, disclosureText, enabled, sortOrder }
   ```
2. **Categories:** Tours & Tickets, Official Merch, Music & Streaming, Photobooks & Albums
3. **FTC disclosure:** Every affiliate link placement must include `"This is an affiliate link"` or equivalent
4. **UI:** Horizontal scrollable card strip at feed top, or dedicated page/section
5. **Admin-editable:** Config file can be updated without code deploy (static JSON loaded at runtime or build-time)

**Acceptance criteria:**
- [ ] Affiliate config schema defined with TypeScript types
- [ ] At least 3 affiliate categories populated with placeholder URLs
- [ ] FTC-compliant disclosure text on every affiliate link placement
- [ ] UI renders affiliate cards in feed or dedicated section
- [ ] Config change does not require code deploy (JSON file or env-based)
- [ ] Affiliate links open in new tab with `rel="noopener sponsored"`
- [ ] No affiliate links disguised as editorial content

**Legal notes:** CRITICAL — FTC requires clear and conspicuous disclosure of affiliate relationships. Must include "Affiliate link" or "We earn a commission" language. Must be proximate to the link, not buried in a footer. See Legal Compliance page (FEAT-05) for site-wide disclosure.

**Effort:** M (config schema + UI component + FTC compliance review)

**Dependencies:** None

---

#### FEAT-04: Trending / Hot Right Now Widget

**Description:** Surface the 3-5 most-engaged posts in the last 24 hours across all sources.

**Implementation:**
1. **Server endpoint:** `GET /api/feed/trending` — returns top 5 items by engagement in last 24h
2. **Scoring:** Sum all engagement stats (upvotes + comments + likes + views + favourites) for items with `publishedAt` within 24 hours
3. **Cache:** 15-minute TTL (avoid recomputing on every request)
4. **UI:** Horizontal card strip above main feed, or sticky section

**Acceptance criteria:**
- [ ] `GET /api/feed/trending` endpoint returns top 5 items
- [ ] Only items from last 24 hours considered
- [ ] Engagement sum across all available stats per item
- [ ] 15-minute server-side cache
- [ ] Frontend renders trending section
- [ ] Trending items still linkable/tappable to source
- [ ] Cross-source: trending can include items from any source type

**Legal notes:** No legal concerns — uses already-ingested content.

**Effort:** M (new endpoint + cache + frontend component)

**Dependencies:** None (works better with more engagement data from expanded sources)

---

#### FEAT-05: Legal Compliance Page

**Description:** Public-facing static page listing data sources used, affiliate disclosure, DMCA contact, and disclaimer of non-affiliation with BTS/HYBE.

**Required sections:**
1. **About This App** — Fan-made content aggregator, not affiliated with BTS, HYBE, or Big Hit Music
2. **Data Sources** — List of all sources with integration method (API/RSS/oEmbed)
3. **How Content Is Displayed** — Explanation that content is linked, not stored; thumbnails are hotlinked; videos use oEmbed
4. **Affiliate Disclosure** — FTC-compliant statement about affiliate link relationships
5. **DMCA / Takedown Contact** — Email address for copyright takedown requests
6. **Privacy** — What data is collected (localStorage only, no user accounts, no tracking)

**Acceptance criteria:**
- [ ] New route `/legal` added to React Router
- [ ] All 6 sections populated with accurate content
- [ ] Footer link to `/legal` on all pages
- [ ] Affiliate disclosure matches FTC guidelines
- [ ] DMCA contact email provided
- [ ] Non-affiliation disclaimer is prominent
- [ ] Page is static (no API calls)

**Legal notes:** This page IS the legal compliance measure. Must be accurate and kept up to date as sources change.

**Effort:** S (static page + footer link)

**Dependencies:** None (should be created early and updated as sources are added)

---

## 4. Standing Legal Constraints

These rules are **non-negotiable** across all phases. Pulled from CLAUDE.md and `legal-rules.md`:

### Rule 1 — No Media Storage
Never download, copy, proxy, or store images/videos/audio from external platforms. Store URL strings only. If a feature would require storing media, use embed or link-out instead.

**Implications for roadmap:**
- All new scrapers store `thumbnailUrl` as external URL, never binary
- DeviantArt, Pinterest: link out to source page, do not re-host artwork
- Spotify, SoundCloud: use official embed players (iframe)
- Tumblr: image URLs are hotlinked from Tumblr CDN

### Rule 2 — No Instagram or TikTok Scraping
Never scrape or make unofficial API calls to instagram.com, cdninstagram.com, tiktok.com, or tiktokcdn.com. Official oEmbed embedding is permitted for display.

**Implications for roadmap:**
- TikTok Discovery (SRC-13) requires formal Research API access — no workarounds
- Instagram is not on the roadmap and must remain excluded
- Existing TikTok oEmbed in frontend is compliant (iframe only)

### Rule 3 — No Weverse Integration
Never connect to weverse.io or subdomains. Out of scope due to legal risk.

**Implications for roadmap:**
- Affiliate hub (FEAT-03) may link to Weverse Shop as an external affiliate — this is a **link-out only**, not an integration. Verify this is acceptable.
- No Weverse content scraping or API calls under any circumstances

### Rule 4 — CORS Proxy Scope Lock
CORS proxy is text-only (RSS, JSON). Never proxy image, video, or audio URLs.

**Implications for roadmap:**
- Google News RSS, AO3 Atom feeds: CORS proxy permitted for feed fetching
- All media thumbnails must be direct URLs, not proxied
- SoundCloud/Spotify oEmbed metadata fetch may use CORS proxy (it's JSON) — the *player iframe* is direct

### Rule 5 — New Integrations Require Legal Check
Before adding any new platform, document: (a) official API exists, (b) ToS allows aggregation, (c) content is embedded or linked, not stored.

**Legal check summary for all planned sources:**

| Source | Official API? | ToS Allows Aggregation? | Display Method |
|--------|---------------|------------------------|----------------|
| Reddit (expansion) | Yes (public JSON) | Yes | Link-out |
| Tumblr (expansion) | Yes (API v2, free) | Yes | Link-out, hotlinked images |
| Google News RSS | N/A (public RSS) | Yes | Link-out |
| Bluesky (expansion) | Yes (AT Protocol, free) | Yes | Link-out, oEmbed |
| K-pop RSS (expansion) | N/A (public RSS) | Yes | Link-out |
| Last.fm | Yes (free API key) | Yes (fan apps) | Stats widget, link-out |
| AO3 | N/A (public Atom RSS) | Yes (explicit in ToS) | Link-out only |
| X/Twitter | Yes (API v2, $100/mo) | Yes (with oEmbed) | oEmbed iframe only |
| Pinterest | Yes (requires approval) | Pending review | Link-out only |
| DeviantArt | Yes (OAuth, free) | Yes | Link-out only |
| Mastodon | Yes (public API, free) | Yes | Link-out, oEmbed |
| TikTok | Yes (Research API, application) | Yes (Research API only) | oEmbed iframe only |
| Spotify | Yes (OAuth, free) | Yes (fan apps) | Embed player iframe |
| SoundCloud | Yes (client ID, free) | Yes | oEmbed widget iframe |

---

## 5. Open Questions

### OQ-1: Version Numbering
Shipped milestones are v1.0 through v4.0. The proposed release names (v1.1, v1.2, v1.3, v2.0) collide with existing milestone identifiers. **Decision needed:** Use v5.1/v5.2/v5.3/v6.0, or start a new versioning track?

### OQ-2: Reddit API — Free vs Paid
The codebase uses Reddit's **free public JSON API** (`reddit.com/r/{sub}/hot.json`), not the paid API. The user's spec mentions "Reddit paid API (~$0.24/1k requests) already in use" — this is inaccurate. The free API has stricter rate limits (10 QPM estimated) and no OAuth. **Decision needed:** Adding 9 more subreddits (16 total) with 2-sec inter-sub delays means ~32 seconds per scrape cycle for Reddit alone. Is this acceptable, or should we migrate to the official OAuth Reddit API?

### OQ-3: Tumblr Tag Search Rate Limits
Tumblr API v2 free tier allows 1,000 requests/day. With 15+ tags at a 20-minute cron interval, that's ~1,080 requests/day — right at the limit. **Decision needed:** Reduce Tumblr tag cron to 30 minutes, or reduce the number of tags, or apply for higher rate limits?

### OQ-4: AllKPop Already Configured
AllKPop RSS (`allkpop.com/feed`) is already active as source #11. The user's spec lists it as a new source to add. No action needed — just confirming.

### OQ-5: Billboard / Rolling Stone RSS Availability
Billboard K-Town (`billboard.com/t/k-pop/feed/`) and Rolling Stone K-pop tag RSS may not exist or may have changed URLs. **Action needed:** Verify these endpoints return valid RSS before planning.

### OQ-6: Naver News English RSS
Naver News does not appear to offer English-language RSS feeds. Korean-language RSS exists but would need translation pipeline. **Decision needed:** Drop Naver from plan, or investigate alternative approaches?

### OQ-7: Feature Flag Infrastructure
X/Twitter integration (SRC-09) requires a feature flag system. No feature flag infrastructure exists in the codebase. **Decision needed:** Simple env-var-based flag (e.g., `TWITTER_ENABLED=true`) or a proper feature flag system?

### OQ-8: Jimin Spotify ID Bug
In `members.ts`, Jimin's Spotify URL uses the same artist ID as Agust D (`1oSPZhvZMIrWW5I3cAvSCz`). This is incorrect — Jimin's correct Spotify artist ID needs to be looked up. This affects SRC-14 (Spotify integration).

### OQ-9: Weverse Shop Affiliate in Affiliate Hub
Legal Rule #3 prohibits Weverse *integration* (API calls, scraping). The affiliate hub (FEAT-03) would include a simple external link to Weverse Shop as an affiliate. **Decision needed:** Is a link-out affiliate URL to Weverse Shop compliant with Rule #3, or does the rule apply to any reference to Weverse?

### OQ-10: Scraper IP Blocks (Existing Debt)
Reddit, Bluesky, and Tumblr scrapers are returning empty results on some server IPs (noted in STATE.md). This affects *all* source expansions. **Decision needed:** Address IP blocking before expanding sources, or proceed and accept partial coverage?

### OQ-11: YouTube Engagement Stats Gap
YouTube scraper uses RSS feeds which have no engagement data (views, likes, comments). YouTube Data API would provide this but requires an API key and has quota limits (10,000 units/day free). **Decision needed:** Migrate YouTube to Data API for engagement stats, or accept the gap?

### OQ-12: Content Retention Window
Current 14-day soft-delete may be too aggressive for some new sources (AO3 fan fiction, Last.fm music stats). **Decision needed:** Source-specific retention windows, or single global window?

### OQ-13: Estimated Ongoing Costs

| Item | Cost | Frequency |
|------|------|-----------|
| X/Twitter API v2 Basic | $100/month | Monthly |
| LLM moderation (current) | ~$10/month | Monthly (budget-capped) |
| Reddit paid API (if migrated) | ~$0.24/1k requests | Per-use |
| All other APIs | Free | — |

**Total incremental:** $100/month (Twitter only). All other new sources are free-tier APIs.

---

*Document generated: 2026-03-06*
*Based on: Full codebase audit of packages/frontend, packages/server, packages/shared*
*Codebase state: v4.0 shipped, 11,697 LOC TypeScript/CSS, 22 active sources*
