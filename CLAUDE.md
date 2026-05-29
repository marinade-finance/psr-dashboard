# CLAUDE.md

Guidance for Claude Code (claude.ai/code) when working in this repository.

## What This Is

Marinade Finance PSR (Protected Staking Rewards) Dashboard — a React SPA
showing Solana validator stake auction results, protected events, and
validator bonds. Auction computation via `@marinade.finance/ds-sam-sdk`.

## Commands

See `README.md` for the full command surface. Pre-commit hooks run
lint-staged (eslint --fix + prettier) via husky — first run may reformat,
retry the commit once if it fails.

## Live root docs

Four repo-root files are live documentation. **Each must be updated in
the same commit as the change that affects it.**

- **`SCREENS.md`** — every page, panel, table column, badge, status
  tier, tab. Update when: adding / removing / renaming a column, adding
  a tab on the validator detail panel, changing a default sort / tier
  threshold / status label / token, moving a route, replacing a badge
  style, adding a card.
- **`VISUALS.md`** — the visual-language alphabet: surfaces, status
  families, bond tiers, charts, simulation tokens, typography,
  component primitives, inline-style escape hatch. Update when: adding
  / removing / renaming a token, status family, or shared primitive;
  changing a tier threshold; changing a typography or shadow scale.
- **`ARCHITECTURE.md`** — top-level layout, routes, components,
  services, state and data flow, build/test, conventions. Update when:
  adding / removing a top-level dir, adding a service module or page
  route, adding / removing a react-query key, bumping a major
  dependency, changing the state shape that flows through `SamPage` or
  the URL.
- **`README.md`** — anything a new contributor needs on day one:
  commands, route list, doc index, deployment notes. Update when the
  command surface or the route table changes, or when a top-level doc
  is added / renamed.

If a section's diff would be larger than rewording, rewrite the whole
section — patches sentence-by-sentence age badly.

## Scratch files (untracked)

`bugs.md`, `ISSUES.md`, `differences.md`, `docs/` are local-only review
queues / audit notes — untracked, not part of the doc contract above.
Append findings here during audits; the user prioritises and prunes.

## Planned and queued work

All planned work lives in `specs/` — see `specs/index.md` for the
master list.

**New item:** create `specs/2/N-topic.md` (next available N), add a row
to `specs/index.md`. Default status: `draft`.

**Promoting:** change `draft` → `planned` only when the work is approved
to start. A `draft` spec must never be implemented — it is an idea under
consideration, not a commitment.

**Shipped item:** set `status: shipped` in the spec frontmatter, trim
the section to WHY + code pointers (drop HOW), update `specs/index.md`
status.

Lifecycle: `draft` → `planned` → `partial` → `shipped`.
- `draft` — idea captured; implementation blocked until promoted
- `planned` — approved; ready to implement
- `partial` — in progress
- `shipped` — done

During audits, record bugs in `bugs.md`; record design intent and
queued features in the relevant spec file.

## Architecture

For stack, routes, key files, services layer, SDK integration,
simulation mode, state/data flow, and build/test layout: **read
`ARCHITECTURE.md`**. That file is the live structural reference.

For tokens, primitives, status families, glyph set, gauge geometry,
breakdown grammar, attention dot, typography, surfaces: **read
`VISUALS.md`**.

For UI inventory (every page, panel, column, badge): **read
`SCREENS.md`**.

This file holds only agent-facing rules below.

## Writing rules

- **Never use "bar" as a UI metaphor** ("winning bar", "priority bar",
  "the bar your bond has to clear"). The word is unknown jargon to
  novice readers. The underlying field is `winningTotalPmpe` /
  `priorityFrontierPmpe` — use "Winning total" / "Priority frontier" /
  "the level …" / "the threshold …" instead. Applies to labels,
  tooltips, banner copy, breakdown rows, and the GUIDE.md prose.
- **Preserve perfected copy.** Polish / refine passes never rewrite
  status banners, section titles, row labels, or tip text unless the
  user explicitly asks. The CTA helpers in
  `src/services/tip-engine.ts` are canonical — never reword at a call
  site.

## Testing rules

- **Use `/test-*` routes for every e2e test that doesn't specifically
  need network data.** Don't invent a parallel mock-API infrastructure;
  `/test-`, `/test-bonds`, `/test-protected-events` already wrap each
  page with a `QueryClient` pre-seeded from `src/fixtures/*`.
- **No expert test routes.** Don't add `/expert-test-*`. Don't write
  Playwright tests that hit any `/expert-*` route. Expert routes still
  exist in code but are deprecated (see `specs/1/0-next.md`).
- **Mobile is not supported.** The app shows a "Mobile view is not
  supported" banner (`src/components/navigation/navigation.tsx`) below
  640px. Don't add mobile viewport variants in tests; don't ship CSS
  that tries to make pages usable on a phone.

### E2E conventions (Playwright, `tests/`)

- Always `waitForSelector('tbody tr', { timeout: 30000 })` before
  interacting — fixture data loads async even on `/test-*` routes.
- Use **loose assertions**: `toContain` / regex over exact strings.
  Cosmetic copy changes must not break the suite.
- Define `const SHEET = '[role="dialog"]'` and shared helpers
  (`gotoSam`, `openSheet`) at the top of each spec file — don't
  inline navigation or locator magic inline in every test.
- Deep-link the sheet via `page.goto('/test-?v=VOTE_ACCOUNT')` rather
  than clicking through the table — faster and deterministic.
- Selector hooks: bare class tokens (`navigation`, `metric`,
  `docsButton`, `badge`, `metricValue`) are Playwright selectors.
  **Grep `tests/` before deleting any CSS class** — it may be the
  only handle a spec has on that element.

### Unit conventions (Vitest, `src/**/*.test.ts`)

- Define a **factory function** (`makeValidator`, `makeConfig`) that
  returns a minimal valid object for the type under test. Use
  `as unknown as SdkType` to satisfy opaque SDK types — don't try to
  construct them fully.
- Test config objects: include only properties the function under test
  reads; omit everything else so the test fails loudly if the function
  starts reading a new field unexpectedly.
- One `describe` per logical concern, one `it` per case. Don't merge
  unrelated assertions into a single `it` to keep failure messages
  precise.
- **Test features, not fixes.** A regression caught at runtime →
  fix the code; only add a test if the feature lacked coverage.

## Visual language rules (operational)

For the full alphabet of tokens, primitives, and rules see `VISUALS.md`.
The three rules below are operational — code-touching agents must
internalise them at the call site:

### Two orthogonal axes: severity vs lever

Colour encodes severity (`getTipStyle`); glyph encodes which knob to
turn (`getTipIcon`). Never collapse them. The CTA helpers in
`src/services/tip-engine.ts` (one per lever) are the single source —
`selectTip` picks the highest-severity candidate with `LEVER_ORDER`
breaking ties.

### CTA message rules

Every CTA string is **imperative verb phrase, sentence-case, period-
terminated, ≤ 60 chars, no parentheses, no em-dash in the middle**. It
carries the decisive SOL figure OR a clear consequence — never vague.
Pattern: `"Verb [object] to [outcome]."` or `"Verb [object]."`.

Good: `"Top up 12 SOL to avoid undelegation and fee."`
Good: `"Raise bid to get more stake."`
Bad: `"Bond too thin — a bond risk fee can be charged."`
Bad: `"Stake won't change next epoch."`

### Decorative borders

NEVER `border-l` / left-border accent bands on any element. Status is
carried by colour token + dot + glyph, never by a coloured edge.
