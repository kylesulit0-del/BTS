# Requirements: BTS Army Feed

**Defined:** 2026-03-06
**Core Value:** Fans see a rich, diverse stream of content from everywhere with engagement stats that help surface the best content, all without leaving the app.

## v5.1 Requirements

Requirements for v5.1 Quick Wins. Each maps to roadmap phases.

### Source Expansion

- [ ] **SRCX-01**: Reddit scraper config expanded with r/BTSARMY (BTS-dedicated, no keyword filter, fetchCount 50)
- [ ] **SRCX-02**: Reddit scraper config expanded with r/Korean_Hip_Hop (broad, keyword-filtered, fetchCount 50)
- [ ] **SRCX-03**: Reddit scraper config expanded with 7 solo member subreddits (r/Namjoon, r/jinbts, r/Suga, r/jhope, r/jimin, r/taehyung, r/jungkook — all BTS-dedicated, no keyword filter, fetchCount 25)
- [ ] **SRCX-04**: Google News RSS feeds added (4 BTS-scoped query URLs: BTS+kpop, BTS+HYBE, BTS+comeback, BTS+concert) using existing RSS scraper pattern
- [ ] **SRCX-05**: K-pop News RSS expanded with verified Billboard K-Town and Rolling Stone K-pop feeds, or documented as unavailable if RSS endpoints don't exist
- [ ] **SRCX-06**: AO3 BTS fan fiction Atom feed added using existing RSS scraper (needsFilter: false, tag-scoped feed)
- [ ] **SRCX-07**: Tumblr blog list expanded with additional active BTS fan blogs (verify activity within last 30 days before adding)
- [ ] **SRCX-08**: Frontend sourceLabels config updated for any new source type display names and badge colors

### Content Type Filter

- [ ] **CTYP-01**: LLM classification prompt and Zod schema expanded with `fan_fiction` and `music` content types
- [ ] **CTYP-02**: Shared ContentType union type updated in `@bts/shared/types/feed.ts` to include `fan_fiction` and `music`
- [ ] **CTYP-03**: Source-level default contentType applied at ingest time (AO3 items → `fan_fiction`, future music sources → `music`)
- [ ] **CTYP-04**: FilterSheet CONTENT_TYPE_CATEGORIES updated with new categories: Fan Art, Fan Fiction, Social Posts, Music (replacing current 4-category set)
- [ ] **CTYP-05**: Content type badge colors and labels assigned in `contentTypes.ts` for `fan_fiction` and `music`
- [ ] **CTYP-06**: Server-side `?contentType=` query param filter works for all new content type values

## Future Requirements

Tracked for v5.2+, not in current roadmap.

### v5.2 Growth

- **BSKY-01**: Bluesky search expansion (member handles, Korean hashtags)
- **TMBL-01**: Tumblr tag-based search via API v2 (extends beyond RSS)
- **LAST-01**: Last.fm integration (artist stats, top tracks)
- **DART-01**: DeviantArt fan art integration (OAuth API)
- **MEMB-01**: Per-member server-side tagging and filter (schema + API + UI)
- **AFFL-01**: Affiliate Link Hub (config-driven, FTC-compliant)

### v5.3 Reach

- **TWIT-01**: X/Twitter via official API v2 ($100/mo, feature-flagged)
- **MAST-01**: Mastodon/Fediverse hashtag search
- **PINT-01**: Pinterest integration (pending API approval)
- **TRND-01**: Trending / Hot Right Now widget

### v6.0 Full Expansion

- **TTOK-01**: TikTok Discovery via Research API (pending application)
- **SPOT-01**: Spotify artist data + embed player
- **SNDC-01**: SoundCloud search + oEmbed widget
- **LEGL-01**: Legal Compliance page (static)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Instagram scraping | Legal Rule #2 — no Instagram scraping or unofficial API |
| TikTok scraping | Legal Rule #2 — official Research API only (v6.0) |
| Weverse integration | Legal Rule #3 — no weverse.io connections |
| Media storage/proxying | Legal Rule #1 — URL references only |
| CORS proxy for media | Legal Rule #4 — text/RSS only |
| Reddit paid API migration | Free public JSON API sufficient for v5.1 scope |
| YouTube Data API migration | RSS sufficient for video listing; engagement stats deferred |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SRCX-01 | TBD | Pending |
| SRCX-02 | TBD | Pending |
| SRCX-03 | TBD | Pending |
| SRCX-04 | TBD | Pending |
| SRCX-05 | TBD | Pending |
| SRCX-06 | TBD | Pending |
| SRCX-07 | TBD | Pending |
| SRCX-08 | TBD | Pending |
| CTYP-01 | TBD | Pending |
| CTYP-02 | TBD | Pending |
| CTYP-03 | TBD | Pending |
| CTYP-04 | TBD | Pending |
| CTYP-05 | TBD | Pending |
| CTYP-06 | TBD | Pending |

**Coverage:**
- v5.1 requirements: 14 total
- Mapped to phases: 0
- Unmapped: 14

---
*Requirements defined: 2026-03-06*
*Last updated: 2026-03-06 after initial definition*
