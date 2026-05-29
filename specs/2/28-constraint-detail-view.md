---
status: planned
---

# Constraint detail view — surface every binding constraint, not just one

**Why:** this is the single highest-value support deliverable (technical
plan item [P1], Johnny's support feedback). The most common validator
tickets are:

- "Why am I ranked below another validator with a higher bond and higher max APY?"
- "Why is my target stake lower than theirs?"
- "Why did I lose stake while another validator retained it?"
- "When / why am I not receiving the expected stake?"

The dashboard already computes every answer, but the UI throws most of it
away: `selectTip` (`src/services/tip-engine.ts:275`) collapses the CTA
cascade — `bondCta`, `bidCta`/`outOfSetCta`, `capCta`, `deltaCta` — to the
**single highest-severity** tip via `LEVER_ORDER` (bond 0 < bid/rank 1 <
cap 2 < none 3). A validator hitting both a bond fee **and** a concentration
cap sees only the bond pill; the cap — the actual reason they can't grow —
is invisible (bugs.md #8).

## Design

A new section in the **validator detail panel** (not the table row — the
row keeps its single `selectTip` pill) that answers "why this stake?" by
listing **all** active constraints together, plus the ranking inputs.

Two parts:

### 1. All binding constraints

Run every CTA producer and render each non-null result as its own row,
ordered by severity. Each row carries:
- the **lever glyph** (`getTipIcon`) and **severity colour** (`getTipStyle`) —
  the two orthogonal axes are already defined, reuse them
- the constraint's specific binding figure: cap name + which cap (country /
  ASO / validator / want), bond shortfall SOL, bid gap PMPE, blacklist, etc.

This means refactoring the cascade so the per-lever CTAs are available
individually to the detail panel, while `selectTip` still produces the
one-line summary for the table. The CTA strings themselves are canonical —
do NOT reword them (CLAUDE.md writing rules).

### 2. Ranking inputs ("why ranked below X")

Show the inputs that decide queue order so the comparison questions answer
themselves:
- **Priority rank** — position when the redelegation budget is handed out
  (total PMPE highest first); already computed via
  `selectRedelegationPriorityRank`
- **Total PMPE** vs the **priority frontier PMPE**
  (`selectRedelegationPriorityFrontierPmpe`) — the level the bid must clear
  to receive inflow
- **Bid gap** — static bid minus clearing price

A validator with a higher bond but lower total PMPE can then SEE that bond
isn't the ranking axis — total PMPE is. This is exactly the "higher bond,
why ranked lower?" ticket.

## Acceptance

- When ≥2 constraints bind, the detail panel lists every one with its own
  severity + lever glyph (the cap no longer vanishes behind the bond fee).
- Each constraint names its specific binding value, not a generic phrase.
- The single-line "Next Step" pill on the SAM table row is unchanged
  (still the `selectTip` winner).
- The three support questions above are answerable from this view without
  asking support.

## Relationship to other work

- Subsumes **bugs.md #8** (cap CTA hidden when bond fires) — that bug is the
  narrow symptom; this view is the fix.
- Pairs with the **simulation** path: once constraints are listed, the
  simulate tab lets the validator test which constraint a bond/bid change
  clears (technical plan item [P2], already shipped — see `sdk-rerun.ts`).

**Where:** `src/services/tip-engine.ts` — expose the per-lever CTAs
(`bondCta`/`bidCta`/`capCta`/`deltaCta`/`outOfSetCta`) individually for the
panel while keeping `selectTip` for the row;
`src/components/validator-detail/validator-detail.tsx` — new constraint
section; ranking inputs from `selectRedelegationPriorityRank` /
`selectRedelegationPriorityFrontierPmpe` in `src/services/sam.ts`.
