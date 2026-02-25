# Technology Stack

**Analysis Date:** 2026-02-25

## Languages

**Primary:**
- TypeScript ~5.9.3 - All application code and configuration files
- JSX/TSX - React component markup, used in `src/components/` and `src/pages/`

**Secondary:**
- JavaScript - Build configuration and ESLint setup (`eslint.config.js`, `vite.config.ts`)

## Runtime

**Environment:**
- Browser (ES2022 target) - Client-side React application

**Package Manager:**
- npm - Uses package-lock.json for dependency locking

## Frameworks

**Core:**
- React 19.2.0 - UI library, entry point at `src/main.tsx`
- react-router-dom 7.13.1 - Client-side routing for pages (`src/pages/Home.tsx`, `MemberDetail.tsx`, `Members.tsx`, `News.tsx`, `Tours.tsx`)

**Build/Dev:**
- Vite 7.3.1 - Frontend build tool and dev server
- vite-plugin-pwa 1.2.0 - Progressive Web App support with auto-update mode (configured in `vite.config.ts`)
- @vitejs/plugin-react 5.1.1 - React fast refresh for development

**Linting/Formatting:**
- ESLint 9.39.1 - Code linting with flat config in `eslint.config.js`
- typescript-eslint 8.48.0 - TypeScript support for ESLint
- eslint-plugin-react-hooks 7.0.1 - Enforces React Hooks rules
- eslint-plugin-react-refresh 0.4.24 - Validates React fast refresh constraints

## Key Dependencies

**Critical:**
- react 19.2.0 - Core UI rendering engine
- react-dom 19.2.0 - DOM rendering for React
- react-router-dom 7.13.1 - Page navigation and URL routing

**Infrastructure:**
- vite-plugin-pwa 1.2.0 - Offline-first PWA capabilities via service worker

**Development Utilities:**
- @types/react 19.2.7 - TypeScript type definitions for React
- @types/react-dom 19.2.3 - TypeScript type definitions for react-dom
- @types/node 24.10.1 - TypeScript type definitions for Node utilities (for build tools)
- globals 16.5.0 - ESLint globals for browser environment

## Configuration

**Environment:**
- No environment variables required (local static data and browser APIs only)
- Configuration file `.env` not used

**Build:**
- TypeScript compilation: `tsc -b && vite build` (production build)
- Development: `vite` starts dev server with hot module replacement
- Linting: `eslint .` validates all TypeScript/TSX files
- Preview: `vite preview` serves built production bundle locally

**TypeScript Configuration:**
- `tsconfig.json` - Root config with project references
- `tsconfig.app.json` - Application config targeting ES2022, DOM + DOM.Iterable
- `tsconfig.node.json` - Build tool config (not shown but referenced)
- Strict mode enabled with `noUnusedLocals`, `noUnusedParameters`, and `noUncheckedSideEffectImports`
- JSX preset: `react-jsx` (no React import needed in files)

## Platform Requirements

**Development:**
- Node.js (version compatible with npm 10.x based on package-lock.json)
- npm 10.x or compatible

**Production:**
- Modern browser with ES2022 support (Chrome, Firefox, Safari, Edge - recent versions)
- Service Worker support for PWA functionality
- LocalStorage API for feed caching

---

*Stack analysis: 2026-02-25*
