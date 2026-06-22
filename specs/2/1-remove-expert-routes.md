---
status: planned
---

# Remove `/expert-*` routes

**Why:** Expert mode is deprecated. `/expert-`, `/expert-bonds`,
`/expert-protected-events`, `/expert-docs` still resolve in
`src/index.tsx` but are undocumented (no row in `README.md`,
`ARCHITECTURE.md`, or `SCREENS.md` route tables) and no Playwright test
hits them. The `level: UserLevel` prop drives a Basic-vs-Expert column
gating inside each page; once routes are dropped, that prop and the
expert-only columns/metrics go too.

**End state:** `createBrowserRouter` only registers `/`, `/bonds`,
`/protected-events`, `/docs`, and the `/test-*` sandbox. `UserLevel` is
removed; pages drop the `level` prop. `public/docs/GUIDE-EXPERT.md`
already deleted.

**Where:** `src/index.tsx`, `src/pages/*`, `src/components/navigation/`,
every page that imports `UserLevel`.
