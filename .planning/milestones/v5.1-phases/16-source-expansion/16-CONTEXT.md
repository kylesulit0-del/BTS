# Phase 16: Source Expansion - Context

**Gathered:** 2026-03-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Add new content sources to the feed: solo member subreddits, r/BTSARMY, r/Korean_Hip_Hop, r/heungtan, Google News articles, AO3 fan fiction entries, and K-pop news RSS feeds. The FilterSheet source filter must show correct labels and badge colors for all new source types. No new UI capabilities beyond displaying these sources in the existing feed.

</domain>

<decisions>
## Implementation Decisions

### Source presentation
- Unique badge color per source type (Reddit=orange, Google News=blue, AO3=red, RSS=green)
- Individual subreddit names shown as source labels (e.g., "r/Namjoon", "r/jinbts"), not grouped under "Reddit"
- FilterSheet uses grouped-with-expand pattern: "Reddit" group expands to show individual subs, plus separate entries for Google News, AO3, RSS
- All new source types use the same card layout as existing sources — only badge/label differs

### AO3 fan fiction handling
- Card shows: title, author, summary, link to AO3 — minimal, no word count/rating/tags
- Fetch via multiple AO3 RSS tag feeds (BTS fandom + individual member/pairing tags)
- Filter to English-language fics only
- Show all ratings including explicit (no E-rated filtering)

### Subreddit selection
- Include all roadmap-listed subs: r/BTSARMY, r/Korean_Hip_Hop, r/Namjoon, r/jinbts, r/Suga, r/jhope, r/jimin, r/taehyung, r/jungkook
- Also add r/heungtan (BTS memes/casual)
- Include low-activity subs regardless of post frequency
- No content filtering (no minimum upvotes, no flair filtering)
- Use the same Reddit fetch mechanism as existing r/bangtan — add new subs to config

### Google News scoping
- Multiple search queries: "BTS" + individual member names (Kim Namjoon, Jin BTS, Suga BTS, etc.)
- No filtering of results — show everything Google News returns
- Cards show headline + snippet (first 1-2 sentences) from the article
- English-language articles only

### Claude's Discretion
- Exact badge color hex values that work with existing design
- Specific AO3 tag feed URLs to subscribe to
- Google News RSS query format and member name query strings
- K-pop news RSS source selection (Billboard, Rolling Stone availability)

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

*Phase: 16-source-expansion*
*Context gathered: 2026-03-06*
