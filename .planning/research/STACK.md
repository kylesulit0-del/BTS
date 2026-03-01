# Stack Research

**Domain:** Backend scraping engine, database storage, LLM moderation, REST API, scheduled jobs
**Researched:** 2026-03-01
**Confidence:** HIGH (core stack, ORM, API framework) / MEDIUM (LLM SDK, monorepo) / LOW (scraping edge cases)

## Existing Stack (DO NOT CHANGE)

Already validated and deployed. Listed for reference only.

| Technology | Version | Purpose |
|------------|---------|---------|
| React | ^19.2.0 | UI framework |
| TypeScript | ~5.9.3 | Type safety |
| Vite | ^7.3.1 | Build tool |
| react-router-dom | ^7.13.1 | Routing |
| vite-plugin-pwa | ^1.2.0 | PWA support |
| dompurify | ^3.3.1 | HTML sanitization |
| Node.js | 20.20.0 | Runtime |

## Recommended Stack Additions

### API Framework

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Fastify | ^5.7.4 | REST API server | 3x faster than Express (70-80K vs 20-30K req/sec). Written in TypeScript with first-class type support. Built-in JSON schema validation eliminates need for separate validation middleware. Plugin architecture keeps the server modular. Targets Node.js v20+, matching the project's runtime. For a content API serving feed data, Fastify's JSON serialization speed matters -- it fast-serializes JSON responses by compiling schema-aware serializers. |
| @fastify/cors | ^11.2.0 | CORS for frontend access | Official Fastify plugin. TypeScript types bundled. The frontend SPA will call the API from a different origin during development. |

### Database & ORM

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| better-sqlite3 | ^12.6.2 | SQLite database driver | Synchronous API (faster than async for single-process workloads). No external database server to manage -- the database is a file. Fully supports Node.js 20. Prebuilt binaries available. The scraping engine is a single-process Node app, not a distributed system -- SQLite is the right fit. |
| drizzle-orm | ^0.45.1 | TypeScript ORM | SQL-first design (write queries that look like SQL, not a query builder abstraction). Zero runtime dependencies (7.4KB gzipped). Full type inference from schema definitions -- no code generation step like Prisma. Supports both SQLite and PostgreSQL, so migration to Postgres later is a schema-level change, not a rewrite. Drizzle Kit handles migrations with `push` for dev and `generate`/`migrate` for production. |
| drizzle-kit | ^0.45.1 | Schema migrations | Companion tool for drizzle-orm. Generates SQL migration files from schema changes. `drizzle-kit push` for rapid local dev, `drizzle-kit generate` + `drizzle-kit migrate` for production. |

**Why SQLite over PostgreSQL for v2.0:**
- No external service to install, configure, or keep running
- Single-file database, trivial to backup (copy the file)
- better-sqlite3's synchronous API is faster than any async Postgres driver for single-process workloads
- The scraping engine runs on one server (SSH-accessed from phone) -- no horizontal scaling needed
- Drizzle's SQLite and PostgreSQL schemas are nearly identical, so migrating later if needed is low-effort

**Why Drizzle over Prisma:**
- No code generation step (Prisma requires `prisma generate` after every schema change)
- No separate query engine binary (Prisma bundles a Rust-based engine)
- SQL-first: the queries read like SQL, which matters when debugging scraping pipeline queries
- Smaller footprint: 7.4KB vs Prisma's multi-MB engine
- Same SQLite + PostgreSQL dual-support

### Web Scraping

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| cheerio | ^1.2.0 | HTML parsing and data extraction | jQuery-like API for server-side HTML parsing. Fast (no browser instance), lightweight. Most scraping targets (Reddit pages, Tumblr, news sites, Nitter) serve static HTML that Cheerio handles. The project constraint is "scraping-first: public pages/RSS preferred" -- Cheerio excels at this. |
| playwright | ^1.52.0 | Headless browser for JS-rendered pages | Required for sources that need JavaScript execution (TikTok, Instagram, some Twitter alternatives). Use ONLY as fallback when Cheerio fails -- Playwright consumes ~800MB RAM per browser instance. Install with `--with-deps` flag on Linux for system dependencies. |

**Scraping architecture -- tiered approach:**

1. **RSS/Atom feeds** (cheapest): YouTube channels, Tumblr blogs, news sites. Use native `fetch` + existing XML parser logic, moved server-side.
2. **JSON endpoints** (cheap): Reddit `.json` API. Use native `fetch` + `JSON.parse()`.
3. **Static HTML scraping** (moderate): Nitter (Twitter proxy), fan blogs, news sites without RSS. Use `fetch` + Cheerio.
4. **Headless browser** (expensive): TikTok trending, Instagram public pages. Use Playwright sparingly. Pool a single browser instance, reuse across scraping runs.

**Why not Puppeteer:** Playwright supports Chromium, Firefox, and WebKit from one API. Better auto-wait mechanisms. Microsoft-backed with active development. Playwright's browser context isolation is more memory-efficient than Puppeteer's page-per-tab model.

### LLM Integration

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| ai (Vercel AI SDK) | ^6.0.105 | Provider-agnostic LLM calls | Unified API across OpenAI, Anthropic, Google, Mistral, and others. The project requires "configurable LLM provider" -- this is exactly what AI SDK solves. `generateText()` and `generateObject()` work identically regardless of provider. Swap providers by changing one import. TypeScript-first with full type inference on structured outputs. Works in Node.js (not Next.js-only despite the Vercel branding). |
| @ai-sdk/anthropic | ^3.0.48 | Claude provider for AI SDK | First-class Claude support (Claude 4 Sonnet for cost-effective moderation, Claude 4 Opus for nuanced decisions). Structured output via `generateObject()` with Zod schemas for consistent moderation verdicts. |
| @ai-sdk/openai | ^1.3.22 | OpenAI provider for AI SDK | GPT-4o-mini for cheap high-volume moderation. Fallback provider if Anthropic is down. |

**Why AI SDK over direct SDKs (@anthropic-ai/sdk, openai):**
- Direct SDKs lock you to one provider. AI SDK's `generateText()` works with any provider.
- Swapping providers is a config change: `import { anthropic } from '@ai-sdk/anthropic'` vs `import { openai } from '@ai-sdk/openai'`.
- Structured output via `generateObject()` with Zod schemas returns typed moderation results, not raw text to parse.
- The project explicitly requires "configurable LLM provider" -- AI SDK is built for this.

**Why NOT a custom abstraction layer:**
- AI SDK already IS the abstraction layer. Building another one on top wastes effort.
- It handles retries, streaming, token counting, and structured output across providers.

### Job Scheduling

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| node-cron | ^4.2.1 | Scheduled scraping every 15-30 min | In-process cron scheduler. Zero external dependencies (no Redis). Cron expressions for scheduling (`*/15 * * * *` for every 15 min). For a single-server scraping engine, this is all you need. The scraping jobs are idempotent (re-scraping the same content deduplicates on insert), so missed executions during restarts are harmless -- the next run catches up. |

**Why node-cron over BullMQ:**
- BullMQ requires Redis. This project runs on a single server accessed via SSH. Adding Redis doubles the infrastructure.
- BullMQ's value is distributed job processing, retry queues, and worker scaling. None of these are needed for "scrape 9 sources every 15 minutes on one server."
- If a scraping run fails, the next scheduled run retries naturally. Content sources don't change fast enough for missed runs to matter.
- node-cron is 50 lines of scheduling logic. BullMQ + Redis is an architectural commitment.

**When to migrate to BullMQ:** If the app needs to run scrapers across multiple servers, or if individual scraping jobs need retry logic with backoff, or if job history/monitoring becomes important. Not for v2.0.

### Schema Validation

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| zod | ^4.3.6 | Runtime validation for API responses, LLM outputs, config | Already a transitive dependency (Vite's config validation uses it). TypeScript-first schema validation with static type inference. Three critical uses: (1) Validate LLM moderation output structure via AI SDK's `generateObject()`. (2) Validate API request parameters. (3) Validate scraped data before database insertion. In v1.0 the config was validated at compile time only -- with a backend processing external data, runtime validation is essential. |

### Development & Runtime Tools

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| tsx | ^4.21.0 | Run TypeScript directly in Node.js | Powered by esbuild for fast TypeScript compilation. Replaces ts-node (which has ESM compatibility issues on Node 20). Use for running the backend server in development (`tsx watch src/server/index.ts`). Supports ESM natively, matching the project's `"type": "module"` configuration. |

### Monorepo Structure

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| npm workspaces | (built-in) | Monorepo package management | Already available in the project's npm installation. Zero new tooling. Symlinks workspace packages to node_modules for cross-package imports. Shared `node_modules` at root reduces duplication. |

**Why npm workspaces over Turborepo/Nx:**
- The project has TWO packages (frontend + backend) plus a shared types package. Turborepo/Nx add value at 5+ packages with complex dependency graphs.
- npm workspaces handle the core need: shared `node_modules`, cross-package imports, workspace-scoped scripts.
- Zero configuration beyond `workspaces` field in root `package.json`.
- No new CLI tools, no build orchestration config files.

**Proposed workspace structure:**

```
bts/
  package.json              # workspaces: ["packages/*"]
  packages/
    shared/                 # Shared TypeScript types, GroupConfig, content schemas
      package.json          # name: "@bts/shared"
      src/
        types/              # ContentItem, ModerationResult, GroupConfig
        schemas/            # Zod schemas for validation
    server/                 # Backend: scraping, DB, LLM, API
      package.json          # name: "@bts/server", depends on @bts/shared
      src/
        scrapers/           # Per-source scraper modules
        db/                 # Drizzle schema, migrations, queries
        moderation/         # LLM moderation pipeline
        api/                # Fastify routes
        scheduler/          # node-cron job definitions
        index.ts            # Server entry point
    web/                    # Existing frontend (moved from root src/)
      package.json          # name: "@bts/web", depends on @bts/shared
      src/                  # Existing React app
      vite.config.ts
```

## Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @types/better-sqlite3 | ^7.6.14 | TypeScript types for better-sqlite3 | Always (better-sqlite3 doesn't bundle its own types) |
| dotenv | ^16.5.0 | Load environment variables from .env files | Store LLM API keys, database path, scraping config. Never commit .env files. |
| pino | ^9.6.0 | Structured JSON logging | Fastify uses Pino by default. Structured logs are searchable. Use for scraping run logs, moderation decisions, API request logs. |
| rss-parser | ^3.13.0 | Parse RSS/Atom feeds server-side | Replace the client-side XML parsing for RSS sources. Handles RSS 2.0, Atom, and edge cases (CDATA, namespaces) that manual DOMParser parsing misses. |

## Installation

```bash
# Initialize workspaces (run from project root)
# After restructuring into packages/web, packages/server, packages/shared

# Core server dependencies (from packages/server/)
npm install fastify @fastify/cors better-sqlite3 drizzle-orm cheerio node-cron ai @ai-sdk/anthropic @ai-sdk/openai zod dotenv rss-parser

# Server dev dependencies
npm install -D drizzle-kit @types/better-sqlite3 tsx

# Optional: Playwright (install only when needed for JS-rendered sources)
npm install playwright
npx playwright install chromium --with-deps

# Shared package (from packages/shared/)
npm install zod

# No changes to packages/web/ dependencies
```

## Alternatives Considered

| Recommended | Alternative | Why Not Alternative |
|-------------|-------------|---------------------|
| Fastify | Express | Express lacks built-in TypeScript support, JSON schema validation, and structured logging. 3x slower JSON serialization. Express 5 has been in beta for years. For a new project in 2026, Fastify is the modern choice. |
| Fastify | Hono | Hono is optimized for edge/serverless runtimes (Cloudflare Workers, Bun). This project runs on a traditional Node.js server. Fastify has a deeper plugin ecosystem for Node.js-specific needs (CORS, rate limiting, auth). |
| Drizzle ORM | Prisma | Prisma requires a code generation step, bundles a Rust query engine binary (~15MB), and has slower cold starts. Drizzle is SQL-first with zero dependencies. For a scraping engine writing thousands of rows, Drizzle's lightweight approach wins. |
| Drizzle ORM | Knex.js | Knex is a query builder, not an ORM -- no schema definition, no type inference from tables. Drizzle gives you Knex-level SQL control PLUS full TypeScript type inference from schema definitions. |
| SQLite (better-sqlite3) | PostgreSQL | PostgreSQL requires running a separate database server. SQLite is a file. The scraping engine is single-process, single-server. Postgres advantages (concurrent writes, full-text search, JSONB) aren't needed at this scale. Drizzle makes migrating to Postgres later straightforward if needed. |
| AI SDK (Vercel) | Direct @anthropic-ai/sdk | Direct SDK locks you to one provider. The project requires provider-agnostic moderation. AI SDK's unified API makes swapping providers a one-line change. |
| AI SDK (Vercel) | LangChain | LangChain is massive (100+ dependencies), designed for RAG pipelines and agent chains. This project needs one thing: send content to LLM, get moderation verdict back. AI SDK's `generateObject()` does this in 5 lines. LangChain is overkill. |
| node-cron | BullMQ | BullMQ requires Redis. Adds infrastructure complexity for a single-server app. The scraping use case (run jobs on a timer) doesn't need distributed queuing, retry policies, or job persistence across restarts. |
| node-cron | Agenda | Agenda requires MongoDB. Same objection as BullMQ -- unnecessary infrastructure for a cron schedule. |
| Cheerio + Playwright | Puppeteer | Playwright supersedes Puppeteer with multi-browser support, better auto-wait, and more efficient browser contexts. Puppeteer is Chrome-only. |
| npm workspaces | Turborepo | Two packages don't justify Turborepo's configuration overhead. npm workspaces solve cross-package imports and shared node_modules with zero config. |
| npm workspaces | pnpm workspaces | Would require switching package managers. npm workspaces work with the existing npm setup. pnpm's strict node_modules isolation is valuable for large monorepos, not for 2-3 packages. |
| tsx | ts-node | ts-node has known ESM compatibility issues with Node.js 20+. tsx uses esbuild for fast compilation and handles ESM/CJS interop transparently. |
| Pino | Winston | Fastify bundles Pino by default. Using Winston would mean running two loggers. Pino's JSON output is faster and more structured. |

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Express | Legacy framework. Fastify is faster, has better TypeScript support, and built-in validation. | Fastify |
| Prisma | Code generation step, Rust engine binary, slower for high-write workloads. | Drizzle ORM |
| Redis | No distributed job processing needed. Adds infrastructure to manage. | node-cron (in-process) |
| LangChain | Massive dependency tree. The moderation use case is a single LLM call, not a chain. | Vercel AI SDK |
| MongoDB / Mongoose | Document databases are wrong for structured content with relational queries (content belongs to sources, has engagement metrics, has moderation status). | SQLite via Drizzle |
| Puppeteer | Chrome-only, less efficient than Playwright. | Playwright (when headless browser needed) |
| axios | Native `fetch` is available in Node.js 20. No reason to add an HTTP client library. | Native `fetch` |
| NestJS | Full framework with decorators, dependency injection, module system. Massive overkill for a REST API serving scraped content. | Fastify (standalone) |
| @tanstack/react-query | Frontend concern, not backend. The frontend will call the REST API with native `fetch`. React Query can be considered later if the frontend needs caching/refetching logic. | Native `fetch` on frontend (for now) |
| nodemon | tsx has built-in watch mode (`tsx watch`). No need for a separate file watcher. | `tsx watch` |

## Stack Patterns by Feature

**Adding a new scraper (e.g., Instagram, new subreddit):**
1. Create `packages/server/src/scrapers/{source}.ts`
2. Implement the `Scraper` interface (fetch, parse, normalize to `ContentItem`)
3. Register in scraper registry with schedule config
4. Add source config to `GroupConfig.sources` in `@bts/shared`

**Running LLM moderation on scraped content:**
1. Query unmoderated content from SQLite: `db.select().from(content).where(eq(content.moderationStatus, 'pending'))`
2. Batch content into LLM calls (send 10-20 items per call for cost efficiency)
3. Use `generateObject()` with Zod schema: `{ relevant: boolean, reason: string, category: string }`
4. Update moderation status in database
5. Provider is read from config/env: `process.env.LLM_PROVIDER` selects `@ai-sdk/anthropic` or `@ai-sdk/openai`

**Serving content via REST API:**
1. Fastify route queries SQLite for moderated content
2. JSON schema validates response shape (Fastify built-in)
3. Frontend calls `/api/feed?group=bts&limit=50&offset=0`
4. Response includes engagement metrics, source attribution, media URLs

**Migrating from SQLite to PostgreSQL (future):**
1. Change Drizzle schema imports: `sqliteTable` to `pgTable`, `integer` to `serial`
2. Change driver: `better-sqlite3` to `postgres` or `pg`
3. Run `drizzle-kit generate` + `drizzle-kit migrate`
4. Update connection string in `.env`
5. Query code stays identical (Drizzle's query API is database-agnostic)

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| fastify@^5.7.4 | Node.js >= 20 | Fastify 5 dropped Node 18 support |
| better-sqlite3@^12.6.2 | Node.js 14-24 | Prebuilt binaries for LTS versions. Native addon -- needs build tools (build-essential on Ubuntu). |
| drizzle-orm@^0.45.1 | better-sqlite3, pg, postgres.js | Same ORM API, different drivers. Schema syntax differs slightly (sqliteTable vs pgTable). |
| ai@^6.0.105 | @ai-sdk/anthropic@^3.x, @ai-sdk/openai@^1.x | Provider packages must match AI SDK major version. |
| cheerio@^1.2.0 | Node.js >= 18 | v1.0 was a major rewrite. ESM-native. |
| playwright@^1.52.0 | Node.js >= 18 | Requires system dependencies on Linux (`npx playwright install --with-deps chromium`). ~400MB disk for Chromium. |
| tsx@^4.21.0 | Node.js >= 18, TypeScript 5.x | Dev-only. Uses esbuild internally. |
| zod@^4.3.6 | TypeScript >= 5.0 | Major version bump from Zod 3. New API for union types (`z.xor()`). |
| node-cron@^4.2.1 | Node.js >= 14 | Pure JS, no native dependencies. |

## Environment Variables

```bash
# .env (DO NOT COMMIT)

# LLM Provider
LLM_PROVIDER=anthropic              # or "openai"
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...

# Database
DATABASE_PATH=./data/bts.db          # SQLite file path

# YouTube (carried over from v1.0)
YOUTUBE_API_KEY=AIza...

# Server
PORT=3001                            # API server port (frontend dev server uses 5173)
NODE_ENV=development

# Scraping
SCRAPE_INTERVAL_MINUTES=15           # Cron interval
```

## Sources

- [Fastify npm](https://www.npmjs.com/package/fastify) -- v5.7.4, Node.js 20+ required (HIGH confidence)
- [Express vs Fastify comparison](https://betterstack.com/community/guides/scaling-nodejs/fastify-express/) -- 3x performance gap, TypeScript-first (HIGH confidence)
- [Drizzle ORM docs](https://orm.drizzle.team/docs/get-started-sqlite) -- SQLite + better-sqlite3 setup, migration workflow (HIGH confidence)
- [Drizzle vs Prisma 2026](https://www.bytebase.com/blog/drizzle-vs-prisma/) -- Zero deps, no codegen, SQL-first (MEDIUM confidence)
- [better-sqlite3 npm](https://www.npmjs.com/package/better-sqlite3) -- v12.6.2, Node 20 support confirmed (HIGH confidence)
- [Cheerio npm](https://www.npmjs.com/package/cheerio) -- v1.2.0, ESM-native (HIGH confidence)
- [Scraping libraries comparison](https://www.scrapingbee.com/blog/best-javascript-web-scraping-libraries/) -- Cheerio for static, Playwright for dynamic (HIGH confidence)
- [AI SDK docs](https://ai-sdk.dev/docs/introduction) -- Multi-provider unified API, generateText/generateObject (HIGH confidence)
- [AI SDK Anthropic provider](https://ai-sdk.dev/providers/ai-sdk-providers/anthropic) -- @ai-sdk/anthropic for Claude integration (HIGH confidence)
- [node-cron npm](https://www.npmjs.com/package/node-cron) -- v4.2.1, in-process scheduling (HIGH confidence)
- [BullMQ vs node-cron](https://betterstack.com/community/guides/scaling-nodejs/best-nodejs-schedulers/) -- BullMQ needs Redis, overkill for single-server (HIGH confidence)
- [tsx npm](https://www.npmjs.com/package/tsx) -- v4.21.0, ESM-native TypeScript runner (HIGH confidence)
- [npm workspaces guide](https://johnh.co/blog/setting-up-npm-workspaces-for-a-monorepo) -- Setup for TypeScript monorepos (MEDIUM confidence)
- [Zod npm](https://www.npmjs.com/package/zod) -- v4.3.6, TypeScript-first validation (HIGH confidence)
- [Playwright memory usage](https://datawookie.dev/blog/2025/06/playwright-browser-footprint/) -- ~800MB per browser instance (MEDIUM confidence)

---
*Stack research for: BTS Army Feed v2.0 -- Backend Scraping Engine*
*Researched: 2026-03-01*
