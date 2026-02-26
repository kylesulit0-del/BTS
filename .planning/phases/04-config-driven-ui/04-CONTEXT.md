# Phase 4: Config-Driven UI - Context

**Gathered:** 2026-02-26
**Status:** Ready for planning

<domain>
## Phase Boundary

All UI elements that display group-specific data are generated from config, completing the clone-and-swap architecture. Changing the config import in `config/index.ts` to a different group's config file swaps the entire app (members, sources, filters, keywords, theme, branding) with zero code changes.

</domain>

<decisions>
## Implementation Decisions

### Filter Tab Generation
- Tabs auto-generated from config — every source type with at least one feed configured gets a tab automatically
- "All" tab is always present and always first (hardcoded behavior, not configurable)
- Tab order after "All" follows the order sources are defined in config
- Tabs always show even if a source returns zero posts (consistent UI)

### Swap Validation
- Claude's discretion on validation approach (dummy group config, TypeScript enforcement, or both)
- If a dummy/example group config is created, keep it in the repo permanently as documentation and template
- App title and page titles come from GroupConfig — swap changes branding
- Theme (colors, accents) fully swaps with group config — theme.ts already exists in config structure

### Config Completeness
- Full codebase audit for hardcoded BTS-specific strings, URLs, and identifiers
- Every hardcoded BTS reference gets extracted to GroupConfig and read dynamically — no "document as limitation" exceptions
- GroupConfig uses strict TypeScript types — all fields required, no optionals with defaults. TypeScript error if a new group config is missing anything
- PWA manifest (app name, theme color, description) generated from GroupConfig at build time

### Label & Display Names
- Source types have configurable display labels in config (e.g., "Videos" instead of "YouTube")
- BiasFilter label ("Select Your Bias") is configurable per group via config (e.g., `memberFilterLabel`)
- All labels are required in config — no fallback defaults. Consistent with strict types decision
- All visible text that references the group should come from config — empty state messages, page headers, navigation labels, everything user-facing

### Claude's Discretion
- Validation approach (dummy config, TypeScript-only, or combination)
- How to structure the labels/strings section of GroupConfig
- PWA manifest generation approach (build plugin, vite config, etc.)
- Exact audit methodology for finding hardcoded references

</decisions>

<specifics>
## Specific Ideas

- BiasFilter already reads members from config — use as reference pattern for FeedFilter
- The existing `theme.ts` in `src/config/groups/bts/` already has the right structure for theme swapping
- Example/dummy group config should be kept permanently as a template for creating new groups

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-config-driven-ui*
*Context gathered: 2026-02-26*
