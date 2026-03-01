# Phase 5: Foundation - Context

**Gathered:** 2026-03-01
**Status:** Ready for planning

<domain>
## Phase Boundary

End-to-end pipeline proving the architecture: monorepo structure with npm workspaces, SQLite database, Reddit scraper writing deduplicated content on an hourly schedule, and a minimal API endpoint serving paginated feed content. The existing v1.0 frontend continues working unchanged when `VITE_API_URL` is not set.

</domain>

<decisions>
## Implementation Decisions

### Reddit scraper scope
- Scrape all BTS-related subreddits AND broader K-pop subs (r/kpop, r/kpopthoughts, etc.) — same sources as v1.0 config plus broader coverage
- Run every hour via built-in node-cron scheduler (single process handles API + scraping)
- Pull top 50 hot posts per subreddit
- Use Reddit's public JSON API (no OAuth, no credentials needed)
- Posts only — no comments
- Sort by 'hot' (Reddit's default trending ranking)
- Retry with backoff (2-3 retries) on rate limits or Reddit downtime, then skip to next cycle
- Filter out NSFW-flagged posts during scraping — never store them
- 30-day content retention, auto-cleanup of older items

### API response shape
- Cursor-based pagination
- 50 items per page default
- Response includes: items + next cursor + hasMore boolean + total count
- Source filter supported from the start (?source=reddit) — contract ready for Phase 6 expansion

### Monorepo & deployment
- Claude's discretion on whether frontend and server run as separate processes or single process
- SQLite database file lives at project root in ./data/ directory (gitignored)
- Built-in scheduler via node-cron — one process handles both API and scheduled scraping
- Manual scrape trigger available via both CLI command (npm run scrape) and API endpoint (POST /api/scrape)

### Content model
- Store: title, link/URL, score, comment count per content item
- Title + link only — no full text body
- Track subreddit (r/bangtan, r/kpop, etc.), not just 'reddit' as source
- Include nullable content_type field from the start — Phase 7 LLM classification populates it
- No moderation status field yet — wait for Phase 7
- Store Reddit post flair (e.g., 'Official', 'Fan Art', 'News') — useful signal for classification
- No author username stored
- Deduplicate by URL — first seen wins for crossposts
- Engagement metrics (score, comment count) updated on each scrape to keep scores current
- No thumbnails — wait for Phase 6

### Claude's Discretion
- Server architecture: separate processes vs single process for frontend + API
- Exact monorepo package structure and naming
- Database schema details beyond the specified fields
- Error state handling in API responses
- Dev workflow tooling

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-foundation*
*Context gathered: 2026-03-01*
