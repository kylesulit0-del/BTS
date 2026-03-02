/**
 * BTS Server Entry Point
 *
 * Boots Fastify, initializes the SQLite database, registers API routes,
 * starts the hourly scraper scheduler, and listens on port 3001.
 */

import fastify from 'fastify';
import cors from '@fastify/cors';
import { initDb } from './db/index.js';
import { registerFeedRoutes } from './routes/feed.js';
import { registerScrapeRoutes } from './routes/scrape.js';
import { registerHealthRoutes } from './routes/health.js';
import { startScheduler } from './scheduler.js';
import { RedditScraper } from './scrapers/reddit.js';
import { YouTubeScraper } from './scrapers/youtube.js';
import { RssNewsScraper } from './scrapers/rss-news.js';
import { TumblrScraper } from './scrapers/tumblr.js';
import { BlueskyScraper } from './scrapers/bluesky.js';
import { getBtsScrapingConfig } from '@bts/shared/config/sources.js';

const server = fastify({ logger: true });
await server.register(cors, { origin: true });

// Initialize database
const db = initDb();

// Create scrapers
const config = getBtsScrapingConfig();
const scrapers = [
  new RedditScraper(config),
  new YouTubeScraper(config),
  new RssNewsScraper(config),
  new TumblrScraper(config),
  new BlueskyScraper(config),
];

// Register API routes under /api prefix
await server.register(async (api) => {
  registerFeedRoutes(api, db);
  registerScrapeRoutes(api, db, scrapers);
  registerHealthRoutes(api, db);
}, { prefix: '/api' });

// Start hourly scheduler + initial scrape
const cronTask = startScheduler(db, scrapers);

// Start server
const port = parseInt(process.env.PORT || '3001', 10);
await server.listen({ port, host: '0.0.0.0' });
server.log.info(`Server running on port ${port}`);

// Graceful shutdown
function shutdown() {
  server.log.info('Shutting down...');
  cronTask.stop();
  server.close().then(() => {
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
