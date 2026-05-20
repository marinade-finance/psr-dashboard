---
status: planned
---

# Queued fixes — open items

Three queued fixes not yet landed. Shipped items from the Queued section are
noted below so the record is complete; they have no open work.

## Shipped (no open work)

- **Rounding / decimal-places** — `bondSol()` (1-dp, round down) and `topUp()`
  (ceil) in `src/format.ts`. All breakdown call sites migrated.
- **"Your bid today" rename** — `src/components/breakdowns/bidding.tsx:130`.
- **Total/SectionHeader margins** — `TOTAL_CELL_PAD = 'pt-3 pb-2'` in
  `src/components/breakdowns/row.tsx:13`.
- **Gauge 20% debate resolved** — `BOND_CRITICAL_FRAC = 0.2` fixed constant;
  `bondGaugeScaleMax = minBondEpochs / 0.20` in `src/services/calculations.ts`.
- **Sim ring wraps broadcast banner** — `stake-auction-marketplace.tsx:233-260`.
- **Cap CTA reworded** — `capCauseLine()` in `src/services/tip-engine.ts:455`;
  no vote account in text.
- **3-col CalcRow model uniform** — all four breakdowns use `CalcRow` only;
  `RevRow` is gone.
- **Bond gauge critical band** — `marker = criticalBand = BOND_CRITICAL_FRAC`
  derived from one constant at `sam-table.tsx:866-868`.

## Open: test-page parity — /test- data path may diverge silently

**Why:** `/test-` routes wrap the same page components, so UI logic can't
silently diverge. What CAN diverge is the `loadAuction` / `loadNotifications`
implementation inside each test page — those are local reimplementations of the
real data loaders, not imports of them.

Specific risk: `src/pages/test-stake-auction-marketplace.tsx` has a
`hasOverrides` branch (skip SDK rerun when no overrides active) that exists only
in the test page — the main page never exercises it. A bug in that branch won't
be caught.

**Three options (pick one):**
1. Make `SamDataSources.loadAuction` in the test page a thin wrapper around the
   same `loadSam()` factory the main page uses, with fixture data injected.
   No bespoke branching.
2. Add a Playwright test hitting `/` against a locally-seeded server — proves
   the main page data path is alive.
3. Extract "skip rerun when no overrides" into a shared helper
   (`maybeRerun(overrides, base, rerunFn)`) imported by both pages — then the
   branch is covered wherever the test page is tested.

**Where:** `src/pages/test-stake-auction-marketplace.tsx`,
`src/pages/stake-auction-marketplace.tsx`.

## Open: tooltip — single sticky, click-outside dismiss

**Why:** current `HelpTip` uses bespoke pin/hover state with an `onPointerDown`
blink-fix workaround. The result: multiple tooltips can be pinned at once, there
is no click-outside dismiss, and the workaround couples the component to browser
event quirks.

**Design:** replace with a Radix `Popover` for click-to-pin (built-in
click-outside + Esc dismiss) and a Radix `Tooltip` for hover preview, composed
as one `HelpTip`. Pin-singleton: a module-level "currently pinned id" that each
`HelpTip` subscribes to — opening one closes the previous.

**Where:** `src/components/help-tip/help-tip.tsx`.

## Open: avoid-fee CTA text in CRITICAL state when fee = 0

**Why:** `bondAdvice()` in `src/services/tip-engine.ts:213-219` emits "Top up
N SOL to avoid the bond risk fee." whenever `coverage.topUpToAvoidFee > 0`
inside the CRITICAL branch. `topUpToAvoidFee` = `max(0, floorBaseProjected −
claimableBond)` — it can be positive when the bond is below the projected floor
but no fee is actually being charged this epoch (`bondRiskFeeSol === 0`).

The octagon escalation is already gated on `bondRiskFeeSol > 0`
(`tip-engine.ts:393`) — that part is fixed. The text is the remaining gap.

**Fix:** in the CRITICAL branch, gate the "avoid the fee" wording on
`bondRiskFeeSol > 0`. When `topUpToAvoidFee > 0` but `bondRiskFeeSol === 0`,
fall back to "Bond below penalty threshold — top up N SOL." (already the third
arm at line 218, extend to cover this gap).

**Where:** `src/services/tip-engine.ts:213-219` (`bondAdvice()` CRITICAL branch).

## Open: /test- page has no working simulation

**Why:** `test-stake-auction-marketplace.tsx`'s `loadAuction` returns the frozen
`SAM_RESULT` fixture without a `runFinalOnly` path, so sim-panel edits have no
effect. Every override-driven CTA state is untestable visually.

**Design:** accept a `SourceDataOverrides` and apply a pure deterministic
transform to the frozen fixture — patch `cpmpe`, commissions, and `revShare` on
the matching validator object directly (no SDK rerun). The rest of the page
reads the modified copy unchanged.

**Why this approach:** keeps `/test-` sealed (no live network), captures every
override-driven visual state in Playwright, and avoids SDK coupling in fixtures.

**Where:** `src/pages/test-stake-auction-marketplace.tsx`.
