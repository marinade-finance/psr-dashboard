# Specs Index

## Legacy specs (pre-TODO migration)

| Spec | Status | Summary |
| ---- | ------ | ------- |
| [3/1-merge-plan.md](3/1-merge-plan.md) | shipped | Overall plan: origin/master UI + Tailwind + feature/my-feature UX |
| [3/3-calculations-service.md](3/3-calculations-service.md) | shipped | Pure math extraction into calculations.ts with unit tests |
| [3/4-v2-view.md](3/4-v2-view.md) | shipped | v2 UI port onto Tailwind scaffolding |
| [3/5-audit.md](3/5-audit.md) | shipped | Post-port audit: simplify v2 code, remove unnecessary complexity |
| [3/TESTS.md](3/TESTS.md) | partial | Playwright E2E tests: screen specs + component tests |
| [../SCREENS.md](../SCREENS.md) | live | Live UI inventory (repo root). Kept in sync with code. |
| [5/1-bond-calculator.md](5/1-bond-calculator.md) | planned | Bond calculator: bid and bond required for target stake |
| [5/2-followups.md](5/2-followups.md) | planned | Deferred: SAM stats-bar combined-metric tile redesign (4d6aac6a roll-back) |

---

## Active specs (from TODO migration, 2026-05-20)

| Spec | Status | Summary |
| ---- | ------ | ------- |
| [1/1-fixes.md](1/1-fixes.md) | planned | Queued fixes: avoid-fee CTA text, tooltip singleton, /test- sim, test-page parity |
| [1/2-cta-engine.md](1/2-cta-engine.md) | planned | CTA unified shape (action + consequence) + sim pre-fill from breakdowns |
| [1/3-test-fixtures.md](1/3-test-fixtures.md) | planned | Test fixtures: full auction-state + CTA coverage for /test- routes |
| [1/4-sdk-features.md](1/4-sdk-features.md) | planned | SDK migration, rank tracking, precise APY, PSR query dedup — all blocked on SDK |
| [1/5-new-ui-features.md](1/5-new-ui-features.md) | planned | PSR pending badge, epoch status, My Validator pin, forward bond ideal row |
| [1/6-content.md](1/6-content.md) | partial | GUIDE gaps, docs line-length hygiene (CPMPE + turnover shipped) |

---

## TODO items confirmed SHIPPED (2026-05-20 audit)

These were in `TODO.md` and are confirmed in the codebase — no open work.

| Item | Where it landed |
| ---- | --------------- |
| ~~Static bid canonical / rename "Stake Bid"~~ | `bidding.tsx` — "Static bid" throughout |
| ~~Activated Marinade stake naming~~ | `bond-coverage.tsx`, `payments.tsx`, `bid-penalty.tsx` |
| ~~Bond tier label unification (healthy/soft/watch/critical)~~ | `src/services/bond-health.ts` |
| ~~Priority frontier rename (`winningTotalPmpe`)~~ | `sam.ts` |
| ~~Marinade backstop badge~~ | `protected-events-table.tsx` |
| ~~ASO/MEV expansion in tooltips~~ | `bidding.tsx` MEV help; `sam-table.tsx` ASO cap help |
| ~~"Next change" section in GUIDE~~ | `public/docs/GUIDE.md` |
| ~~`maxStakeWanted` backticking in GUIDE~~ | `GUIDE.md` and `GUIDE-EXPERT.md` |
| ~~"Your cost-PMPE today" → "Your bid today" rename~~ | `bidding.tsx:130` |
| ~~Total/SectionHeader margins fix~~ | `row.tsx:13` `TOTAL_CELL_PAD = 'pt-3 pb-2'` |
| ~~Rounding / decimal-places (`bondSol`, `topUp`)~~ | `src/format.ts:53+` |
| ~~Gauge 20% debate resolved~~ | `calculations.ts` `BOND_CRITICAL_FRAC=0.2`; `bondGaugeScaleMax` |
| ~~Bond pill gauge critical band fixed 20%~~ | `sam-table.tsx:866-868` marker=criticalBand=BOND_CRITICAL_FRAC |
| ~~Sim ring wraps broadcast banner~~ | `stake-auction-marketplace.tsx:233-260` |
| ~~Cap CTA reworded (no vote account, no "is full")~~ | `tip-engine.ts:455` `capCauseLine()` |
| ~~3-col CalcRow uniform model (`RevRow` removed)~~ | All four breakdowns use `CalcRow` only |
| ~~Test fixtures o01–o12 (blocked/no-bond/cap states)~~ | `src/fixtures/test-validators.ts` |
| ~~Visual tokens (`text-2xs`, radius scale, `primary teal`)~~ | `src/index.css` |
| ~~HelpTip singleton + Radix Tooltip for hover~~ | `help-tip.tsx` module-level singleton |

---

## TODO items needing runtime verification (AMBIGUOUS)

Code evidence is present but correctness needs a manual check at `/test-` or in the browser.

| Item | Uncertainty |
| ---- | ----------- |
| avoid-fee CRITICAL text when `bondRiskFeeSol === 0` | `bondAdvice()` line 215 may still emit "avoid the fee" even with no fee charged — see `1/1-fixes.md` |
| `/test-` simulation (hasOverrides branch) | `runSdkRerun` wired; verify rows update correctly when sim panel is edited |
