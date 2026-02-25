# Phase 1: Foundation - Context

**Gathered:** 2026-02-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Security hardening (XSS sanitization via DOMPurify), CORS proxy resilience with parallel failover, extraction of all group-specific data into a single typed GroupConfig object, and a modular source registry that maps source types to fetcher functions. No new content sources or UI features — this is infrastructure that makes the app secure, reliable, and clone-ready.

</domain>

<decisions>
## Implementation Decisions

### Sanitization policy
- Allow text, links, basic formatting (bold/italic), and images only — strip all other HTML
- Sanitize at fetch time (store clean data, not raw HTML)
- When content is stripped, show a "View original" link to the source so users can see full content if curious

### Proxy failure UX
- Skip silently when a source's CORS proxies all fail — that source just doesn't appear in the feed, no error shown
- Render feed progressively as each source resolves — don't wait for all sources before showing results
- Show skeleton cards as loading placeholders while content is being fetched
- On total outage (all sources fail), auto-retry quietly in the background with a subtle loading indicator — no error message unless it persists

### Config shape & granularity
- GroupConfig includes full visual theming: primary color, accent, logo URL, etc. — true one-file swap for a new fandom
- Member data includes full aliases: official name, stage name, nicknames, common misspellings for keyword matching
- Config split into separate files: members.ts, sources.ts, theme.ts — composed into GroupConfig at index
- Files organized in group-specific directory: config/groups/bts/members.ts, sources.ts, theme.ts — easy to copy whole folder for new fandom
- Each source entry in config can specify per-source settings: fetch count, refresh interval, priority
- BTS config is just the first config, no special template role — TypeScript types serve as documentation
- Config selection via code-level import swap in config/index.ts (not env variable)

### Config validation
- Claude's Discretion — pick appropriate level of validation (TypeScript types vs runtime checks)

### Source registry design
- One fetcher file per source type: reddit.ts, youtube.ts, tumblr.ts, weverse.ts
- Auto-discovery: write a fetcher file following the interface, add source to config — registry discovers from config
- Registry handles error handling/retries uniformly for all sources — fetchers just fetch
- All fetchers return a shared FeedItem type normalizing data across sources (title, content, author, date, source, url, etc.)

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

*Phase: 01-foundation*
*Context gathered: 2026-02-25*
