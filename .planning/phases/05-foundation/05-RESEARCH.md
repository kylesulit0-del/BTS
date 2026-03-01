# Phase 5: Foundation - Research

**Researched:** 2026-03-01
**Domain:** Monorepo infrastructure, SQLite database, server-side scraping, REST API
**Confidence:** HIGH

## Summary

Phase 5 transforms the existing Vite+React SPA into a monorepo with three npm workspace packages: `shared` (TypeScript types/config), `frontend` (existing v1.0 Vite app), and `server` (Fastify API + Reddit scraper + SQLite database). The core challenge is restructuring without breaking the v1.0 frontend while adding a backend that scrapes Reddit on a schedule, stores deduplicated content in SQLite via Drizzle ORM, and serves it through a paginated REST API.

The technology choices are well-established and battle-tested: npm workspaces for monorepo management, Fastify v5 for the API server, Drizzle ORM with better-sqlite3 for the database layer, and node-cron for scheduling. The "live types" approach (pointing package.json exports directly at TypeScript source) eliminates build steps for the shared package during development, keeping iteration fast.

**Primary recommendation:** Use npm workspaces with three packages (`packages/shared`, `packages/frontend`, `packages/server`), Drizzle ORM + better-sqlite3 for SQLite, Fastify v5 for the API, node-cron for scheduling, and tsx as the TypeScript runner for the server. Keep the shared package build-free by exporting raw `.ts` files.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- Reddit scraper scrapes all BTS-related subreddits AND broader K-pop subs (same sources as v1.0 config plus broader coverage)
- Run every hour via built-in node-cron scheduler (single process handles API + scraping)
- Pull top 50 hot posts per subreddit
- Use Reddit's public JSON API (no OAuth, no credentials needed)
- Posts only -- no comments
- Sort by 'hot' (Reddit's default trending ranking)
- Retry with backoff (2-3 retries) on rate limits or Reddit downtime, then skip to next cycle
- Filter out NSFW-flagged posts during scraping -- never store them
- 30-day content retention, auto-cleanup of older items
- Cursor-based pagination
- 50 items per page default
- Response includes: items + next cursor + hasMore boolean + total count
- Source filter supported from the start (?source=reddit) -- contract ready for Phase 6 expansion
- SQLite database file lives at project root in ./data/ directory (gitignored)
- Built-in scheduler via node-cron -- one process handles both API and scheduled scraping
- Manual scrape trigger available via both CLI command (npm run scrape) and API endpoint (POST /api/scrape)
- Store: title, link/URL, score, comment count per content item
- Title + link only -- no full text body
- Track subreddit (r/bangtan, r/kpop, etc.), not just 'reddit' as source
- Include nullable content_type field from the start -- Phase 7 LLM classification populates it
- No moderation status field yet -- wait for Phase 7
- Store Reddit post flair (e.g., 'Official', 'Fan Art', 'News') -- useful signal for classification
- No author username stored
- Deduplicate by URL -- first seen wins for crossposts
- Engagement metrics (score, comment count) updated on each scrape to keep scores current
- No thumbnails -- wait for Phase 6

### Claude's Discretion
- Server architecture: separate processes vs single process for frontend + API
- Exact monorepo package structure and naming
- Database schema details beyond the specified fields
- Error state handling in API responses
- Dev workflow tooling

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INFRA-01 | Monorepo with shared types between frontend and backend (npm workspaces) | npm workspaces with live TypeScript types pattern; three packages: shared, frontend, server |
| INFRA-02 | SQLite database with Drizzle ORM schema for content items, engagement snapshots, moderation results, and scrape runs | Drizzle ORM 0.45.1 + better-sqlite3 12.6.2; schema examples and migration patterns documented |
| INFRA-03 | Scraping engine framework with abstract scraper interface, error handling, rate limiting, and retry logic | Abstract scraper interface pattern with retry/backoff; Reddit rate limit details (10 QPM unauthenticated) |
| INFRA-04 | Scheduled scraping via node-cron at configurable intervals | node-cron 4.2.1 with hourly schedule (user decision); single-process architecture |
| INFRA-05 | URL-based deduplication with normalized canonical URLs as unique constraint | Drizzle unique constraint on normalized URL column; URL normalization stripping tracking params |
| INFRA-07 | Config-driven group targeting -- all scrape targets, keywords, and member names in swappable config | Existing v1.0 config structure in src/config/groups/bts/sources.ts can be extended for server-side use |
| SCRAPE-01 | Reddit scraper via JSON endpoints (6+ subreddits from config, engagement stats) | Reddit public JSON API (.json suffix), custom User-Agent required, response structure documented |
| API-01 | REST API server (Fastify) with paginated feed endpoint, single-item endpoint, and source health endpoint | Fastify v5.7.4 with TypeScript generics for typed routes; cursor-based pagination pattern with Drizzle |

</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| fastify | 5.7.4 | HTTP server + REST API | Fastest Node.js framework, first-class TypeScript support, schema validation built-in |
| drizzle-orm | 0.45.1 | SQLite ORM + query builder | Type-safe SQL, lightweight, excellent SQLite support, schema-as-code |
| better-sqlite3 | 12.6.2 | SQLite driver (synchronous) | Fastest SQLite driver for Node.js, synchronous API (no async overhead for local DB) |
| node-cron | 4.2.1 | Job scheduling | Lightweight crontab scheduler, zero dependencies, ESM support |
| tsx | 4.21.0 | TypeScript runner for server | Zero-config, fast (esbuild-backed), ESM+CJS support, replaces ts-node |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| drizzle-kit | 0.31.9 | Schema migrations CLI | Generate and apply database migrations from schema changes |
| @fastify/cors | 11.2.0 | CORS middleware | Allow frontend dev server to call API on different port |
| @fastify/static | 9.0.0 | Static file serving | Serve frontend build in production (single-process mode) |
| @types/better-sqlite3 | ^7.6.12 | Type definitions | TypeScript support for better-sqlite3 |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| better-sqlite3 | libsql | libsql adds async API and Turso cloud support; unnecessary for local-only SQLite |
| Fastify | Express | Express is more familiar but slower, less TypeScript-native, no built-in schema validation |
| tsx | Node.js --experimental-strip-types | Node 20 doesn't have strip-types stable; tsx is proven and zero-config |
| Drizzle ORM | Kysely | Kysely is query-builder-only; Drizzle adds schema-as-code + migrations |

**Installation (server package):**
```bash
npm install fastify @fastify/cors @fastify/static drizzle-orm better-sqlite3 node-cron
npm install -D drizzle-kit @types/better-sqlite3 @types/node tsx typescript
```

## Architecture Patterns

### Recommended Project Structure
```
bts/
├── package.json              # Root: workspaces config, shared scripts
├── tsconfig.json             # Root: project references
├── packages/
│   ├── shared/
│   │   ├── package.json      # name: @bts/shared
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── types/
│   │       │   └── feed.ts   # FeedItem, FeedStats, ContentType (shared between FE/BE)
│   │       └── config/
│   │           └── sources.ts # Source definitions used by both scraper and frontend
│   ├── frontend/
│   │   ├── package.json      # name: @bts/frontend, depends on @bts/shared
│   │   ├── tsconfig.json
│   │   ├── vite.config.ts
│   │   ├── index.html
│   │   └── src/              # Existing v1.0 code (moved here)
│   └── server/
│       ├── package.json      # name: @bts/server, depends on @bts/shared
│       ├── tsconfig.json
│       ├── drizzle.config.ts
│       └── src/
│           ├── index.ts      # Entry point: starts Fastify + cron scheduler
│           ├── db/
│           │   ├── schema.ts # Drizzle table definitions
│           │   ├── index.ts  # DB instance + migration runner
│           │   └── migrate.ts
│           ├── scrapers/
│           │   ├── base.ts   # Abstract scraper interface
│           │   └── reddit.ts # Reddit JSON API scraper
│           ├── routes/
│           │   └── feed.ts   # GET /api/feed, POST /api/scrape
│           └── scheduler.ts  # node-cron setup
├── data/                     # SQLite DB file (gitignored)
└── drizzle/                  # Generated migration SQL files
```

### Pattern 1: Live TypeScript Types (No Build Step for Shared)
**What:** Point shared package exports directly at `.ts` source files so consuming packages get live types without a build step.
**When to use:** Internal-only packages that are never published to npm.
**Example:**

```json
// packages/shared/package.json
{
  "name": "@bts/shared",
  "type": "module",
  "exports": {
    "./types/*": "./src/types/*.ts",
    "./config/*": "./src/config/*.ts"
  }
}
```

```json
// packages/frontend/tsconfig.json (add reference)
{
  "compilerOptions": {
    "paths": {
      "@bts/shared/*": ["../shared/src/*"]
    }
  },
  "references": [{ "path": "../shared" }]
}
```

Vite natively resolves `.ts` imports from workspace packages. For the server, `tsx` handles this transparently.

### Pattern 2: Abstract Scraper Interface
**What:** Define a common interface for all scrapers so Phase 6 can add new sources without changing infrastructure.
**When to use:** When multiple scrapers will share scheduling, error handling, and storage logic.
**Example:**

```typescript
// packages/server/src/scrapers/base.ts
export interface ScrapedItem {
  externalId: string;
  url: string;
  title: string;
  source: string;         // e.g., 'reddit'
  sourceDetail: string;   // e.g., 'r/bangtan'
  score: number;
  commentCount: number;
  flair: string | null;
  contentType: string | null;
  scrapedAt: Date;
  publishedAt: Date;
}

export interface ScraperResult {
  items: ScrapedItem[];
  source: string;
  subreddit?: string;
  duration: number;
  errors: string[];
}

export interface Scraper {
  name: string;
  scrape(): Promise<ScraperResult[]>;
}
```

### Pattern 3: Single-Process Server Architecture
**What:** One Node.js process runs Fastify (API + optional static frontend serving) and node-cron (scraper scheduling).
**When to use:** Simple deployments where a single server handles everything.
**Example:**

```typescript
// packages/server/src/index.ts
import fastify from 'fastify';
import cron from 'node-cron';
import { initDb } from './db/index.js';
import { registerFeedRoutes } from './routes/feed.js';
import { runScrape } from './scrapers/reddit.js';

const server = fastify({ logger: true });

// Initialize database (run migrations)
await initDb();

// Register API routes
await server.register(registerFeedRoutes, { prefix: '/api' });

// Schedule scraping every hour
cron.schedule('0 * * * *', async () => {
  server.log.info('Starting scheduled scrape');
  await runScrape();
});

// Start server
await server.listen({ port: 3001, host: '0.0.0.0' });
```

### Pattern 4: Cursor-Based Pagination
**What:** Use the last item's ID as cursor for the next page, avoiding offset-based pagination issues.
**When to use:** Feed endpoints where data changes between requests.
**Example:**

```typescript
// packages/server/src/routes/feed.ts
import { gt, desc, eq, sql, and } from 'drizzle-orm';
import { contentItems } from '../db/schema.js';

interface FeedQuery {
  cursor?: string;
  limit?: number;
  source?: string;
}

async function getFeed(db: DB, query: FeedQuery) {
  const limit = query.limit ?? 50;
  const conditions = [];

  if (query.cursor) {
    conditions.push(gt(contentItems.id, parseInt(query.cursor)));
  }
  if (query.source) {
    conditions.push(eq(contentItems.source, query.source));
  }

  const items = await db
    .select()
    .from(contentItems)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(contentItems.scrapedAt))
    .limit(limit + 1); // Fetch one extra to check hasMore

  const hasMore = items.length > limit;
  const pageItems = hasMore ? items.slice(0, limit) : items;
  const nextCursor = hasMore ? String(pageItems[pageItems.length - 1].id) : null;

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(contentItems)
    .where(query.source ? eq(contentItems.source, query.source) : undefined);

  return {
    items: pageItems,
    nextCursor,
    hasMore,
    total: count,
  };
}
```

### Anti-Patterns to Avoid
- **Importing frontend-only code in shared:** The shared package must contain zero React or DOM dependencies. Only pure TypeScript types, interfaces, and config data.
- **Synchronous HTTP in scraper:** Even though better-sqlite3 is synchronous, HTTP fetches to Reddit must be async with proper error handling.
- **Storing raw Reddit API responses:** Extract and normalize only the fields defined in the schema. Don't persist the full Reddit JSON blob.
- **Using `npm install` inside individual packages:** Always install from the workspace root. npm workspaces hoists dependencies to root `node_modules/`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Database migrations | Custom SQL file runner | drizzle-kit generate + drizzle-orm/better-sqlite3/migrator | Migration ordering, journal tracking, rollback awareness |
| URL normalization | RegExp-based URL cleaner | `new URL()` API + strip tracking params | URL parsing edge cases (encoding, ports, trailing slashes) |
| Cron scheduling | setInterval-based timer | node-cron | Proper crontab syntax, timezone support, handles drift |
| Request retry logic | Manual retry loop | Simple utility with exponential backoff | Jitter, max retries, timeout handling |
| JSON schema validation | Manual if/typeof checks | Fastify's built-in JSON schema validation | Coercion, error messages, response serialization |

**Key insight:** The infrastructure in this phase is all plumbing. Every piece has a well-tested library. Hand-rolling any of it creates maintenance burden without adding value.

## Common Pitfalls

### Pitfall 1: npm Workspaces Hoisting Breaks Builds
**What goes wrong:** Dependencies installed in one package aren't found because npm hoists them to root, but the package's build process doesn't look at root node_modules.
**Why it happens:** npm workspaces hoists by default, creating symlinks. Some tools don't follow symlinks correctly.
**How to avoid:** Install all dependencies from workspace root (`npm install` at root). Use `--workspace=packages/server` flag for package-specific installs. Never run `npm install` inside a package subdirectory.
**Warning signs:** "Module not found" errors that work locally but fail in CI.

### Pitfall 2: ESM/CJS Interop in Monorepo
**What goes wrong:** Mixing `"type": "module"` and CJS packages causes import resolution failures. The existing project uses `"type": "module"`.
**Why it happens:** Node.js treats `.js` files differently based on the nearest `package.json` `type` field. When packages have different settings, cross-package imports break.
**How to avoid:** Set `"type": "module"` in ALL workspace package.json files. Use `.js` extensions in server-side imports (tsx handles this). Keep the existing frontend ESM config unchanged.
**Warning signs:** `ERR_REQUIRE_ESM`, `ERR_MODULE_NOT_FOUND`, or `SyntaxError: Cannot use import statement` errors.

### Pitfall 3: better-sqlite3 Native Module Rebuild
**What goes wrong:** better-sqlite3 is a native C++ addon. Installing on one platform then deploying to another (or switching Node versions) causes `NODE_MODULE_VERSION` mismatch errors.
**Why it happens:** Native addons compile against a specific Node.js ABI version during install.
**How to avoid:** Run `npm rebuild better-sqlite3` after Node.js version changes. Include `node_modules` in `.gitignore` (already standard). Always install fresh in CI/deployment.
**Warning signs:** `Error: The module was compiled against a different Node.js version`.

### Pitfall 4: Reddit Rate Limiting Without User-Agent
**What goes wrong:** Reddit returns 429 (Too Many Requests) on every request.
**Why it happens:** Reddit aggressively rate-limits requests with default/missing User-Agent headers. Unauthenticated limit is ~10 requests per minute.
**How to avoid:** Set a custom, descriptive User-Agent header like `bts-army-feed/2.0 (content aggregator)`. Space out requests per subreddit with small delays (1-2 seconds between). With 6+ subreddits at 10 QPM limit, a scrape cycle takes ~1 minute minimum.
**Warning signs:** HTTP 429 responses, empty results, or `{"message": "Too Many Requests"}`.

### Pitfall 5: SQLite Write Contention
**What goes wrong:** Concurrent writes (API request + scraper running simultaneously) cause `SQLITE_BUSY` errors.
**Why it happens:** SQLite uses file-level locking. Only one writer at a time.
**How to avoid:** Enable WAL mode (`PRAGMA journal_mode=WAL`) at database init. This allows concurrent reads during writes. Use a single DB instance (no multiple connections). Since it's a single process, contention is minimal but WAL mode prevents it entirely.
**Warning signs:** `SQLITE_BUSY` errors, "database is locked" messages.

### Pitfall 6: Moving Existing Code Breaks Git History
**What goes wrong:** Moving `src/` to `packages/frontend/src/` shows as delete+add in git, losing file history.
**Why it happens:** Git tracks content, not files. Large moves with simultaneous changes confuse git's rename detection.
**How to avoid:** Move files in a dedicated commit with NO other changes. Git will detect renames when the content is unchanged. Use `git mv` for explicit tracking.
**Warning signs:** `git log --follow` doesn't show history before the move.

## Code Examples

Verified patterns from official sources:

### Drizzle Schema for Content Items
```typescript
// Source: https://orm.drizzle.team/docs/sql-schema-declaration (SQLite section)
import { sqliteTable, text, integer, real, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const contentItems = sqliteTable('content_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  url: text('url').notNull(),
  normalizedUrl: text('normalized_url').notNull().unique(),
  title: text('title').notNull(),
  source: text('source').notNull(),           // 'reddit'
  sourceDetail: text('source_detail').notNull(), // 'r/bangtan'
  score: integer('score').notNull().default(0),
  commentCount: integer('comment_count').notNull().default(0),
  flair: text('flair'),                        // Reddit post flair
  contentType: text('content_type'),           // Nullable, populated by Phase 7 LLM
  publishedAt: integer('published_at', { mode: 'timestamp' }).notNull(),
  scrapedAt: integer('scraped_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  externalId: text('external_id').notNull(),   // Reddit post ID
}, (table) => [
  index('idx_source').on(table.source),
  index('idx_scraped_at').on(table.scrapedAt),
  index('idx_published_at').on(table.publishedAt),
  index('idx_source_detail').on(table.sourceDetail),
]);

export const scrapeRuns = sqliteTable('scrape_runs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  source: text('source').notNull(),
  sourceDetail: text('source_detail'),
  startedAt: integer('started_at', { mode: 'timestamp' }).notNull(),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  itemsFound: integer('items_found').default(0),
  itemsNew: integer('items_new').default(0),
  itemsUpdated: integer('items_updated').default(0),
  status: text('status').notNull().default('running'), // 'running' | 'success' | 'error'
  error: text('error'),
});
```

### Database Init with WAL Mode and Migrations
```typescript
// Source: https://orm.drizzle.team/docs/get-started-sqlite + better-sqlite3 docs
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from './schema.js';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const DB_PATH = './data/bts.db';

export function initDb() {
  // Ensure data directory exists
  mkdirSync(dirname(DB_PATH), { recursive: true });

  const sqlite = new Database(DB_PATH);

  // Enable WAL mode for concurrent read/write
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');

  const db = drizzle(sqlite, { schema });

  // Run migrations on startup
  migrate(db, { migrationsFolder: './drizzle' });

  return db;
}
```

### Fastify Route with Typed Request/Reply
```typescript
// Source: https://fastify.dev/docs/latest/Reference/TypeScript/
import type { FastifyInstance } from 'fastify';

interface FeedQuerystring {
  cursor?: string;
  limit?: string;
  source?: string;
}

interface FeedResponse {
  items: Array<{
    id: number;
    title: string;
    url: string;
    source: string;
    sourceDetail: string;
    score: number;
    commentCount: number;
    flair: string | null;
    contentType: string | null;
    publishedAt: string;
  }>;
  nextCursor: string | null;
  hasMore: boolean;
  total: number;
}

export async function registerFeedRoutes(server: FastifyInstance) {
  server.get<{
    Querystring: FeedQuerystring;
    Reply: FeedResponse;
  }>('/feed', async (request, reply) => {
    const { cursor, limit, source } = request.query;
    const result = await getFeed(db, {
      cursor,
      limit: limit ? parseInt(limit) : undefined,
      source,
    });
    return result;
  });

  server.post('/scrape', async (request, reply) => {
    // Manual scrape trigger
    await runScrape();
    return { status: 'ok' };
  });
}
```

### Reddit JSON API Fetch with Retry
```typescript
// Source: https://til.simonwillison.net/reddit/scraping-reddit-json
const USER_AGENT = 'bts-army-feed/2.0 (content aggregator)';
const MAX_RETRIES = 3;
const RETRY_DELAYS = [2000, 5000, 10000]; // Exponential-ish backoff

async function fetchRedditJson(subreddit: string, limit: number = 50): Promise<RedditListing> {
  const url = `https://www.reddit.com/r/${subreddit}/hot.json?limit=${limit}`;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT },
      });

      if (response.status === 429) {
        if (attempt < MAX_RETRIES) {
          await new Promise(r => setTimeout(r, RETRY_DELAYS[attempt]));
          continue;
        }
        throw new Error(`Rate limited after ${MAX_RETRIES} retries`);
      }

      if (!response.ok) {
        throw new Error(`Reddit API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      if (attempt < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, RETRY_DELAYS[attempt]));
        continue;
      }
      throw error;
    }
  }

  throw new Error('Unreachable');
}
```

### npm Workspaces Root package.json
```json
{
  "name": "bts",
  "private": true,
  "type": "module",
  "workspaces": [
    "packages/shared",
    "packages/frontend",
    "packages/server"
  ],
  "scripts": {
    "dev": "npm run dev --workspace=packages/frontend",
    "dev:server": "npm run dev --workspace=packages/server",
    "dev:all": "npm run dev --workspace=packages/frontend & npm run dev --workspace=packages/server",
    "build": "npm run build --workspace=packages/frontend",
    "scrape": "npm run scrape --workspace=packages/server",
    "lint": "eslint ."
  }
}
```

### node-cron Scheduling
```typescript
// Source: https://github.com/node-cron/node-cron
import cron from 'node-cron';

// Every hour at minute 0
const task = cron.schedule('0 * * * *', async () => {
  console.log('Starting hourly scrape...');
  try {
    await runScrape();
  } catch (error) {
    console.error('Scheduled scrape failed:', error);
  }
});

// task.stop() to pause, task.start() to resume
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| ts-node for server TypeScript | tsx (esbuild-backed) | 2023-2024 | Zero-config, faster startup, native ESM support |
| Knex/Sequelize for SQL | Drizzle ORM | 2023-present | Schema-as-code, type inference from schema, lighter weight |
| Express.js | Fastify v5 | Fastify v5: Oct 2024 | 2-3x faster, built-in schema validation, native TypeScript |
| Manual SQL migrations | drizzle-kit generate + migrate | 2023-present | Auto-detect schema changes, generate SQL, apply at runtime |
| npm link for local packages | npm workspaces | npm v7+ (2021) | Automatic symlinking, hoisted dependencies, workspace scripts |

**Deprecated/outdated:**
- ts-node with ESM: Complex setup with `--loader` flags. Use tsx instead.
- Sequelize: Heavy, class-based, TypeScript support is an afterthought. Drizzle is the modern choice.
- SQLite3 (node-sqlite3): Async callback-based API. better-sqlite3 is synchronous and significantly faster.

## Open Questions

1. **Frontend serving strategy in production**
   - What we know: @fastify/static can serve the Vite build. Alternatively, run frontend and server as separate processes.
   - What's unclear: Whether single-process serving is worth the complexity vs. keeping `vite preview` for frontend.
   - Recommendation: Start with separate processes (server on :3001, frontend on :3000 via vite preview). Add @fastify/static serving later if deployment simplicity demands it. This is Claude's discretion per CONTEXT.md.

2. **Shared package build vs live types**
   - What we know: Vite and tsx both resolve `.ts` imports from workspace packages. Live types (no build) works for internal packages.
   - What's unclear: Whether `verbatimModuleSyntax: true` (currently set) conflicts with cross-package type-only imports.
   - Recommendation: Use live types approach (export raw `.ts` from shared). If issues arise, fall back to `tsc --build` with project references.

3. **Reddit API throttling across subreddits**
   - What we know: Unauthenticated limit is ~10 QPM. With 6+ subreddits, serial fetching takes ~1 minute.
   - What's unclear: Exact behavior when fetching rapidly -- some sources say limit is IP-based, others say User-Agent-based.
   - Recommendation: Add 2-second delay between subreddit fetches. Total scrape cycle ~15 seconds minimum. Log rate limit headers if present.

## Sources

### Primary (HIGH confidence)
- [Drizzle ORM - SQLite Getting Started](https://orm.drizzle.team/docs/get-started-sqlite) - Schema definition, driver setup, migration workflow
- [Drizzle ORM - Cursor-Based Pagination](https://orm.drizzle.team/docs/guides/cursor-based-pagination) - Pagination pattern with code examples
- [Drizzle ORM - Schema Declaration](https://orm.drizzle.team/docs/sql-schema-declaration) - Column types, indexes, constraints for SQLite
- [Drizzle ORM - Migrations](https://orm.drizzle.team/docs/migrations) - generate/migrate/push workflow
- [Fastify TypeScript Reference](https://fastify.dev/docs/latest/Reference/TypeScript/) - Route typing, generics, plugin development
- [Fastify GitHub Releases](https://github.com/fastify/fastify/releases) - Confirmed v5.7.4 as latest
- npm registry (direct `npm view`) - Verified all package versions locally

### Secondary (MEDIUM confidence)
- [Simon Willison - Scraping Reddit JSON](https://til.simonwillison.net/reddit/scraping-reddit-json) - Reddit JSON API endpoint format, User-Agent requirements
- [Live Types in TypeScript Monorepo](https://colinhacks.com/essays/live-types-typescript-monorepo) - Custom export conditions for live types
- [node-cron GitHub](https://github.com/node-cron/node-cron) - Scheduling API, ESM support
- [Reddit Data API Wiki](https://support.reddithelp.com/hc/en-us/articles/16160319875092-Reddit-Data-API-Wiki) - Official rate limit documentation

### Tertiary (LOW confidence)
- Various Medium/dev.to articles on npm workspaces patterns - cross-verified with npm docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All versions verified via npm registry, official docs checked, mature libraries
- Architecture: HIGH - npm workspaces + Fastify + Drizzle is a well-documented pattern; existing codebase structure understood
- Pitfalls: HIGH - ESM/CJS interop, SQLite WAL mode, Reddit rate limits are well-documented issues
- Reddit API: MEDIUM - Rate limit specifics vary by source; unauthenticated access may become more restricted

**Research date:** 2026-03-01
**Valid until:** 2026-03-31 (stable technologies, 30-day window)
