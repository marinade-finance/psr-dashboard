---
status: planned
---

# Content and documentation

## GUIDE gaps from validator support transcript (2026-04 to 05)

**Why:** real support threads showed validators confused by five specific gaps.
Each maps to a concrete doc addition or UI label.

| # | Gap | Fix |
|---|-----|-----|
| 1 | Negative `Cover. [ep]` (e.g. "-9") | GUIDE: negative = below fee threshold, undelegation in flight |
| 2 | BRRM (Bond Risk Reduction Mechanism) | Add BRRM section to GUIDE with link to Marinade docs; clarify fee + stake drop are one mechanism |
| 3 | Snapshot timing — when does auction run, when does a top-up count? | "Epoch lifecycle" subsection in GUIDE (overlaps with Epoch Status Badge) |
| 4 | Top-up sized to projected stake, not current | Dashboard: label recommendation with stake basis; GUIDE: explain the sizing |
| 5 | Bid reduction safe-zone | GUIDE: one sentence — "reducing your bid is safe as long as you remain above the clearing price" |

Items 1–3 and 5 are pure GUIDE prose additions. Item 4 needs a UI label in the
bond breakdown AND a GUIDE explanation.

**Where:** `public/docs/GUIDE.md`, `src/components/breakdowns/bond-coverage.tsx`
(item 4 label).

## CPMPE → Cost PMPE rename (shipped)

Oracle verdict: the C-prefix is a UI smell — directional distinction is
load-bearing but should be natural language, not a single-letter prefix.

Renamed user-facing label from `CPMPE` to `Cost PMPE` everywhere:
`public/docs/GUIDE.md`, `public/docs/GUIDE-EXPERT.md`,
`src/services/sam.ts` (column header string),
`src/components/breakdowns/bidding.tsx` (tooltip).
Internal identifier `cpmpe` in code is unchanged.

## Natural turnover rate (shipped)

`WITHDRAWAL_FRACTION_PER_EPOCH = 0.01` (`src/services/sam.ts`) — 1%
redelegation-turnover cap per epoch. Not SDK-exported; comment notes this
until the SDK exposes it. `GUIDE.md` updated to match.

## Docs hygiene: ≤120-char line length

**Why:** CLAUDE.md wisdom rule says prose lines ≤120 chars; several root docs
and `public/docs/GUIDE.md` have lines 200+ chars (the "Data Sources" table,
participation-requirements bullet, long-URL rows).

**Scope:** `public/docs/GUIDE.md`, `public/docs/GUIDE-EXPERT.md`, `SCREENS.md`,
`VISUALS.md`, `ARCHITECTURE.md`, `README.md`, `TODO.md`, `CLAUDE.md`, `bugs.md`.

**Rules:** wrap prose at ≤120 chars; don't break mid-link or mid-codespan.
Markdown tables with long URLs: use footnote references or accept the table as
the documented exception. Don't reformat code blocks.
