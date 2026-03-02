---
phase: 05-foundation
plan: 01
subsystem: infra
tags: [npm-workspaces, monorepo, drizzle-orm, sqlite, better-sqlite3, typescript, fastify]

# Dependency graph
requires:
  - phase: 04-config-driven-ui
    provides: Working v1.0 frontend with config-driven architecture
provides:
  - npm workspaces monorepo with @bts/shared, @bts/frontend, @bts/server packages
  - Shared FeedItem, FeedResponse, FeedQuery types for API contract
  - Server-side BTS scraping config with 7 Reddit sources and 25 keywords
  - SQLite database with content_items and scrape_runs tables via Drizzle ORM
  - Database initialization with WAL mode and migration runner
affects: [05-02, 05-03, 06-expansion, 07-moderation]

# Tech tracking
tech-stack:
  added: [fastify, drizzle-orm, better-sqlite3, node-cron, tsx, drizzle-kit, @fastify/cors]
  patterns: [npm-workspaces, live-typescript-exports, drizzle-schema-as-code, wal-mode-sqlite]

key-files:
  created:
    - packages/shared/src/types/feed.ts
    - packages/shared/src/config/sources.ts
    - packages/server/src/db/schema.ts
    - packages/server/src/db/index.ts
    - packages/server/drizzle.config.ts
    - packages/server/drizzle/0000_workable_ben_grimm.sql
    - packages/frontend/package.json
    - packages/shared/package.json
    - packages/server/package.json
  modified:
    - package.json
    - tsconfig.json
    - .gitignore
    - packages/frontend/tsconfig.app.json

key-decisions:
  - "Live TypeScript exports from @bts/shared (no build step) via package.json exports pointing at .ts files"
  - "import.meta.url-based path resolution for DB and migrations to avoid CWD sensitivity"
  - "fetchCount set to 50 per subreddit in scraping config (matching user decision for hot posts)"

patterns-established:
  - "Monorepo: npm workspaces with packages/shared, packages/frontend, packages/server"
  - "Shared types: export raw .ts from @bts/shared, consumed by both Vite and tsx without build"
  - "Database: Drizzle ORM with better-sqlite3, WAL mode, migration-based schema management"
  - "Server tsconfig: paths + references for @bts/shared cross-package imports"

requirements-completed: [INFRA-01, INFRA-02, INFRA-07]

# Metrics
duration: 6min
completed: 2026-03-01
---

# Phase 5 Plan 1: Monorepo + Shared Types + Database Summary

**npm workspaces monorepo with 3 packages, shared FeedItem/FeedResponse types, and SQLite database via Drizzle ORM with WAL mode and content_items/scrape_runs tables**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-01T12:38:57Z
- **Completed:** 2026-03-01T12:45:20Z
- **Tasks:** 3
- **Files modified:** 16

## Accomplishments
- Restructured v1.0 into npm workspaces monorepo with git history preserved for all moved files
- Created shared TypeScript types (FeedItem, FeedResponse, FeedQuery, ContentType) importable cross-package without build step
- Set up SQLite database with Drizzle ORM: content_items (14 columns, 5 indexes, unique normalized_url) and scrape_runs tables
- Server-side BTS scraping config with 7 Reddit subreddits and 25 keywords ready for Phase 5 Plan 2

## Task Commits

Each task was committed atomically:

1. **Task 1: Restructure into npm workspaces monorepo** - `ea47730` (feat)
2. **Task 2: Create shared types and server-side source config** - `2d2b877` (feat)
3. **Task 3: Set up Drizzle ORM database schema and initialization** - `7f28f28` (feat)

## Files Created/Modified
- `package.json` - Root workspaces config pointing to shared, frontend, server
- `tsconfig.json` - Root project references for all 3 packages
- `.gitignore` - Added data/ for SQLite files
- `packages/frontend/package.json` - @bts/frontend with @bts/shared dependency
- `packages/frontend/tsconfig.json` - Frontend root tsconfig with app/node references
- `packages/frontend/tsconfig.app.json` - Added @bts/shared paths and reference to shared
- `packages/shared/package.json` - @bts/shared with live .ts exports
- `packages/shared/tsconfig.json` - Composite config for project references
- `packages/shared/src/types/feed.ts` - FeedItem, FeedResponse, FeedQuery, ContentType types
- `packages/shared/src/config/sources.ts` - ScrapingSource, GroupScrapingConfig, getBtsScrapingConfig()
- `packages/server/package.json` - @bts/server with Fastify, Drizzle, better-sqlite3, node-cron
- `packages/server/tsconfig.json` - Server config with @bts/shared paths
- `packages/server/src/db/schema.ts` - Drizzle content_items and scrape_runs table definitions
- `packages/server/src/db/index.ts` - initDb() with WAL mode, migrations, lazy singleton
- `packages/server/drizzle.config.ts` - Drizzle Kit configuration for migrations
- `packages/server/drizzle/0000_workable_ben_grimm.sql` - Initial migration SQL

## Decisions Made
- Used live TypeScript exports from @bts/shared (package.json exports point at raw .ts files) -- no build step needed since Vite and tsx both resolve .ts imports natively
- Used import.meta.url for path resolution in db/index.ts to avoid CWD sensitivity when running from different directories
- Set fetchCount to 50 per subreddit in scraping config, matching user decision for hot posts per scrape
- Added placeholder feed.ts in shared package during Task 1 to unblock frontend tsc -b (which traverses project references)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added placeholder file for shared package during Task 1**
- **Found during:** Task 1 (Monorepo restructure)
- **Issue:** Frontend `tsc -b` traverses project references and failed with TS18003 because packages/shared/src/ had no .ts files yet (Task 2 creates them)
- **Fix:** Created minimal placeholder `packages/shared/src/types/feed.ts` with `export {}`; replaced with real types in Task 2
- **Files modified:** packages/shared/src/types/feed.ts
- **Verification:** Frontend build succeeds after placeholder added
- **Committed in:** ea47730 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary to unblock frontend build verification. Placeholder replaced with real implementation in Task 2. No scope creep.

## Issues Encountered
None -- all tasks executed cleanly after the placeholder fix.

## User Setup Required
None -- no external service configuration required.

## Next Phase Readiness
- Monorepo infrastructure ready for Plan 2 (Reddit scraper) and Plan 3 (API server)
- Database schema accepts content items; scrape_runs table ready for scraper observability
- Shared types define the API contract between server and frontend
- BTS scraping config provides 7 Reddit sources for the scraper to target

## Self-Check: PASSED

All 10 key files verified present. All 3 task commits verified in git log.

---
*Phase: 05-foundation*
*Completed: 2026-03-01*
