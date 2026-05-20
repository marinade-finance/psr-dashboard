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

## Investigate: CPMPE term

**Status:** partially resolved. Working hypothesis (2026-05-13 notes): keep the
term; expand the definition so it foregrounds the unit relationship — "same unit
as PMPE, representing what you pay rather than what you earn." The C-prefix is
load-bearing because validators see revenue PMPE and cost PMPE side-by-side.

**Open question:** confirm with oracle (attempt hit usage limit 2026-05-13,
retry). If the term stays, update the GUIDE gloss only; no rename.

**References:** `public/docs/GUIDE.md:128-142`, `src/services/sam.ts:132`.

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
