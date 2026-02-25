# Codebase Concerns

**Analysis Date:** 2026-02-25

## Tech Debt

**Hardcoded Static Data:**
- Issue: Large static data files (`events.ts` with 535 lines, `members.ts` with 178 lines, `news.ts` with 75 lines) are embedded in source. No API or database backend for maintenance or scaling.
- Files: `src/data/events.ts`, `src/data/members.ts`, `src/data/news.ts`
- Impact: Adding new members, events, or news requires code changes and redeployment. Difficult to maintain as data grows. No real-time updates capability.
- Fix approach: Migrate to CMS or backend API. Consider Strapi, Contentful, or REST/GraphQL API for dynamic data management.

**External Proxy Dependency for CORS:**
- Issue: Feed fetching relies on three external CORS proxy services (`allorigins.win`, `codetabs.com`, `corsproxy.io`) as fallbacks. These are third-party services with no SLA.
- Files: `src/utils/corsProxy.ts`
- Impact: Proxy services can go down, be rate-limited, or discontinued. Application feed functionality becomes unavailable without warning. No fallback if all proxies fail.
- Fix approach: Implement own backend proxy server or use CORS-enabled feeds directly. Consider caching more aggressively.

**HTML String Parsing for Unsafe Content:**
- Issue: `stripHtml()` in `src/services/feeds.ts` uses `innerHTML` to parse HTML, which could be vulnerable if any user input reaches this function.
- Files: `src/services/feeds.ts` (line 9)
- Impact: Potential XSS vulnerability if data sources are compromised or if user-controlled content flows through this parser.
- Fix approach: Use a dedicated HTML sanitization library (DOMPurify) instead of relying on browser innerHTML parsing. Validate source data.

**Unvalidated JSON Parsing:**
- Issue: Multiple `JSON.parse()` calls without schema validation: Reddit API response in `feeds.ts` (line 16), localStorage caching in `useFeed.ts` and `useBias.ts`.
- Files: `src/services/feeds.ts` (line 16), `src/hooks/useFeed.ts` (lines 18, 78), `src/hooks/useBias.ts` (line 10)
- Impact: Malformed or corrupted data in localStorage or unexpected API responses could cause runtime errors or silent failures. No clear error messages to users.
- Fix approach: Implement Zod or TypeScript runtime validation for all parsed JSON. Add explicit error logging.

**Array Access Without Bounds Checking:**
- Issue: String manipulation chains like `.split("watch?v=")[1]?.split("&")[0]` in `feeds.ts` (line 73) rely on optional chaining but still lack defensive fallbacks.
- Files: `src/services/feeds.ts` (lines 73-74)
- Impact: Edge cases with malformed URLs could result in empty strings or incorrect parsing. Limited defensive programming.
- Fix approach: Add explicit length checks and use URL parsing libraries instead of string manipulation.

**Swallowed Errors in Promise Handlers:**
- Issue: `fetchAllFeedsIncremental()` and `fetchAllFeeds()` silently catch errors and return empty arrays. Users don't know if feeds failed or are empty.
- Files: `src/services/feeds.ts` (lines 127-129, 151-153, 190-192, 214)
- Impact: Silent failures make debugging difficult. Users see "No items found" but don't know if this is due to network failure, API changes, or actual empty feeds.
- Fix approach: Differentiate between "no data" and "fetch failed" errors. Provide user-facing error messages with retry options.

## Security Considerations

**Untrusted External Data Rendering:**
- Risk: Feed data from Reddit, YouTube, Twitter, and news sites is rendered directly into the DOM without sanitization. Malicious actors could inject scripts through these sources.
- Files: `src/services/feeds.ts`, `src/components/SwipeFeed.tsx`
- Current mitigation: React's JSX provides some XSS protection by default. Only plain text is rendered, not HTML markup.
- Recommendations: Maintain whitelist of approved HTML tags if preview HTML rendering is needed in future. Use content security policy (CSP) headers. Monitor external feed sources.

**localStorage Persistence of Preferences:**
- Risk: Bias selection and feed cache stored in localStorage. In shared devices or via XSS, could expose user preferences.
- Files: `src/hooks/useBias.ts`, `src/hooks/useFeed.ts`
- Current mitigation: Only stores member names and feed timestamps, not sensitive data. localStorage is domain-specific.
- Recommendations: Consider private browsing mode documentation. Add optional session-only mode. Implement user notifications if localStorage is accessed by dev tools.

**Third-Party Proxy Trust:**
- Risk: Routing requests through external CORS proxies means those services can view all URLs and see user activity patterns.
- Files: `src/utils/corsProxy.ts`
- Current mitigation: Only fetches public feed URLs. No authentication credentials transmitted.
- Recommendations: Self-host proxy service. Use privacy-respecting alternatives. Consider documenting privacy implications.

## Performance Bottlenecks

**Inefficient Image Loading Strategy:**
- Problem: `PhotoGallery.tsx` loads all gallery images on component mount with lazy loading, but lightbox pre-loads full image URLs into state tracking set.
- Files: `src/components/PhotoGallery.tsx` (lines 10, 37-46)
- Cause: Every image load/error updates component state, causing re-renders. No progressive image loading or low-resolution placeholders.
- Improvement path: Implement progressive image loading with placeholder blur-up. Use intersection observer for lazy loading within gallery itself. Consider virtual scrolling for large galleries.

**Parallel Feed Fetching Without Timeout Optimization:**
- Problem: `fetchAllFeedsIncremental()` fires 5 simultaneous requests but waits for slowest to complete. 7-second timeout per proxy attempt may be too aggressive or too lenient.
- Files: `src/services/feeds.ts` (lines 197-220)
- Cause: No request prioritization. All feeds treated equally despite varying reliability/speed.
- Improvement path: Implement sequential/prioritized fetching. Fast, reliable sources first. Configurable timeouts per source. Consider service worker caching with stale-while-revalidate.

**Cache TTL Too Short for Stable Data:**
- Problem: 5-minute cache TTL for feeds may require frequent re-fetches despite content changing slowly.
- Files: `src/hooks/useFeed.ts` (line 7)
- Cause: Trade-off between freshness and network usage not documented. Proxy services may rate-limit aggressive refresh.
- Improvement path: Implement adaptive TTL based on source. Member and event data: 1 hour. News feeds: 15 minutes. Use ETag/Last-Modified headers for conditional requests.

## Fragile Areas

**XML Parsing Robustness:**
- Files: `src/utils/xmlParser.ts`, `src/services/feeds.ts`
- Why fragile: RSS/Atom parsing assumes well-formed XML. If feed structure varies, selectors fail silently. No error handling for namespace mismatches or missing elements.
- Safe modification: Always catch parsing errors. Add schema validation before parsing. Test against real feed samples (Soompi, AllKPop).
- Test coverage: No unit tests for XML parser. Regex-based Twitter parsing in `feeds.ts` (lines 162-187) is particularly fragile—highly dependent on Nitter HTML structure remaining stable.

**URL Extraction from External HTML:**
- Files: `src/services/feeds.ts` (lines 23-26, 72-74, 162-187)
- Why fragile: Regex patterns and string splitting depend on specific URL formats. Changes in platform URL schemes break extraction.
- Safe modification: Use URL constructor for validation. Add comprehensive tests for various URL formats. Consider URL shortener resolution.
- Test coverage: No tests. YouTube ID extraction may fail with new URL formats (youtu.be vs. youtube.com). Twitter regex fragile to HTML structure changes.

**Event Data Integrity:**
- Files: `src/data/events.ts` (535 lines, manually maintained)
- Why fragile: Events manually entered without validation. Duplicate entries visible (Munich shows twice at lines 496, 507). No date validation, duplicate detection, or venue normalization.
- Safe modification: Add TypeScript strict validation for dates. Implement pre-commit hooks to check for duplicates. Consider moving to separate data file with validation schema.
- Test coverage: No validation tests. Risk of stale event dates being displayed after events pass.

**Social Media URL Generation:**
- Files: `src/pages/MemberDetail.tsx` (lines 16-31)
- Why fragile: `getSocialUrl()` manually maps platform names to URL patterns. Returning empty string for Spotify (line 22) silently fails. New platforms require code changes.
- Safe modification: Use configuration object or constants for URL patterns. Add error state for unsupported platforms. Test with actual member social media links.
- Test coverage: No unit tests. Risk of breaking links if platform URLs change or handle format changes.

## Scaling Limits

**Member Data Embedded in Source:**
- Current capacity: 7 members hardcoded in `src/data/members.ts` (178 lines). Average 25 lines per member.
- Limit: Codebase readability suffers significantly beyond 20-30 members. Updates require code review/deployment.
- Scaling path: Migrate to CMS or database by end of Q2. Implement member profile API. Lazy-load member details.

**Static Event List:**
- Current capacity: ~40 events in `src/data/events.ts`. File is already 535 lines.
- Limit: Beyond ~100 events, filtering/search becomes inefficient. File becomes unmaintainable.
- Scaling path: Implement backend event service with filtering/pagination. Add event calendar view with month/year filtering.

**Feed Caching in localStorage:**
- Current capacity: 5-minute cache of ~50-100 feed items. localStorage limit ~5-10MB on most browsers.
- Limit: Large previews or many cached results could exceed quota. Silent failures when full.
- Scaling path: Implement IndexedDB for larger storage. Add cache size monitoring. Implement cache eviction policy.

**Proxy Service Reliability:**
- Current capacity: 3 fallback proxies, but all are public free services with no guaranteed uptime.
- Limit: If all proxies go down or are rate-limited, feed functionality halts completely.
- Scaling path: Deploy dedicated backend proxy. Implement circuit breaker pattern. Cache more aggressively.

## Dependencies at Risk

**CORS Proxy Services (Fundamental Risk):**
- Risk: `allorigins.win`, `codetabs.com`, and `corsproxy.io` are public services with no SLA. Any can be discontinued or blocked by content owners.
- Impact: Core feature (feed fetching) breaks if all proxies fail. No graceful degradation.
- Migration plan: Build simple Node/Express backend proxy. Deploy to same infrastructure as frontend. Implement request signing for security.

**Vite PWA Plugin:**
- Risk: `vite-plugin-pwa` v1.2.0 is stable but check for deprecation. Service worker behavior can be fragile across browser versions.
- Impact: PWA features (offline caching, push notifications) may break with browser updates.
- Migration plan: Monitor plugin updates. Have fallback for browsers that don't support PWA. Test on multiple devices.

**React 19.2.0:**
- Risk: React 19 is recent. May have undiscovered bugs or breaking changes in minor versions.
- Impact: Updates could introduce regressions. Hooks behavior may change.
- Migration plan: Pin exact version. Monitor release notes. Test beta versions before upgrading. Consider staying on React 18 LTS until 19 is more stable.

## Test Coverage Gaps

**No Unit Tests for XML Parser:**
- What's not tested: `parseRSS()` and `parseAtom()` functions have no test coverage. Edge cases like missing elements, namespace variations, malformed XML.
- Files: `src/utils/xmlParser.ts`
- Risk: Parser failures go unnoticed until production. Feeds silently fail to load.
- Priority: High - Parser is core infrastructure.

**No Tests for Feed Services:**
- What's not tested: `fetchReddit()`, `fetchYouTube()`, `fetchNews()`, `fetchAllKPop()`, `fetchTwitter()` have no mocks or unit tests. HTML parsing, regex extraction untested.
- Files: `src/services/feeds.ts`
- Risk: Regex and string parsing failures silent. Source API changes break extraction without warning.
- Priority: High - Core feature.

**No Tests for useFeed Hook:**
- What's not tested: Cache logic, error handling, incremental loading, filter combinations not tested.
- Files: `src/hooks/useFeed.ts`
- Risk: Cache invalidation bugs, race conditions in incremental loading undetected.
- Priority: Medium - Hook logic complex but still fairly contained.

**No Tests for Component Interactions:**
- What's not tested: `PhotoGallery.tsx` lightbox navigation, keyboard controls, image error handling. `SwipeFeed.tsx` scroll intersection observer, ref management.
- Files: `src/components/PhotoGallery.tsx`, `src/components/SwipeFeed.tsx`
- Risk: Component behavior regressions on refactor. Accessibility issues (keyboard nav) go unnoticed.
- Priority: Medium - Component logic.

**No Integration Tests:**
- What's not tested: End-to-end user flows (load feed → filter by bias → view member details → view photo gallery).
- Risk: Breaking changes in data flow go unnoticed. Regressions in page transitions.
- Priority: Low for MVP. Medium for production.

**No E2E Tests:**
- What's not tested: Real browser behavior, PWA functionality, offline mode, social media link navigation.
- Files: All pages and components
- Risk: Browser-specific bugs, PWA caching issues, external link reliability.
- Priority: Low for MVP. High before public launch.

---

*Concerns audit: 2026-02-25*
