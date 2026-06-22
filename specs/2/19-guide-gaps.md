---
status: planned
---

# GUIDE gaps from validator support transcript (2026-04 to 05)

**Why:** real support threads showed validators confused by five specific gaps.
Each maps to a concrete doc addition or UI label.

| #   | Gap                                                                | Fix                                                                                              |
| --- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| 1   | Negative `Cover. [ep]` (e.g. "-9")                                 | GUIDE: negative = below fee threshold, undelegation in flight                                    |
| 2   | BRRM (Bond Risk Reduction Mechanism)                               | Add BRRM section to GUIDE with link to Marinade docs; clarify fee + stake drop are one mechanism |
| 3   | Snapshot timing — when does auction run, when does a top-up count? | "Epoch lifecycle" subsection in GUIDE (overlaps with Epoch Status Badge)                         |
| 4   | Top-up sized to projected stake, not current                       | Dashboard: label recommendation with stake basis; GUIDE: explain the sizing                      |
| 5   | Bid reduction safe-zone                                            | GUIDE: one sentence — "reducing your bid is safe as long as you remain above the clearing price" |

Items 1–3 and 5 are pure GUIDE prose additions. Item 4 needs a UI label in the
bond breakdown AND a GUIDE explanation.

| #   | Gap                                              | Fix                                                                                      |
| --- | ------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| 6   | Protected event reason labels — visual ambiguity | GUIDE: reason taxonomy; only the four entries below need copy                            |
| 7   | APY uses network averages, not validator output  | GUIDE: replace "weighted by actual reward mix" with accurate network-average description |

**Item 6 — Protected event reason explainers**

Only documenting reasons that currently display in a confusing or ambiguous way.
`PriorityFee` is skipped — no documented formula yet (needs validator-bonds API team).

- **Bidding** — renders identically to penalty rows in the Protected Events table, but
  is NOT a fault. It is the normal per-epoch bid cost every winning validator pays.
  A novice reading "Bidding ◎2.2 SOL" alongside blacklist penalties thinks they did
  something wrong. GUIDE copy needed: one sentence clarifying Bidding = normal cost.

- **CommissionIncrease vs CommissionSamIncrease** — display differently today:
  `CommissionIncrease` → "Commission X% → Y%";
  `CommissionSamIncrease` → "Inflation Commission A% → B%; MEV Commission C% → D%".
  The distinction (legacy single-rate vs SAM-aware per-stream split) is unlabeled —
  a reader can't tell which variant fired or why one has two numbers and the other one.
  GUIDE copy needed: explain that CommissionSamIncrease is the current split-stream
  variant; CommissionIncrease is the legacy single-rate variant.

- **LowCredits vs DowntimeRevenueImpact** — both render as "Uptime X%" today. The
  display is identical; the table gives no indication which triggered. The distinction
  matters: LowCredits = raw vote credits below threshold; DowntimeRevenueImpact = the
  revenue-impact calculation (proportional stake × lost rewards). Neither is labeled.
  Fix: update `selectProtectedStakeReason` in `src/services/protected-events.ts` to
  prefix the label ("Downtime: Uptime X%" vs "Low credits: Uptime X%"), then add a
  GUIDE entry for each.

- **BondRiskFee** — the table shows the fee payment, but BondRiskFee also triggers a
  forced undelegation in the same epoch. The table has no column or badge for the
  concurrent undelegation — a validator who sees "Bond risk fee ◎N SOL" has no
  indication that stake was also pulled. GUIDE copy needed: one sentence linking
  BondRiskFee to the forced undelegation mechanism.

**Item 7 — APY uses network-average rates (GUIDE fix — DONE)**

The GUIDE at lines 199–217 previously said the auction is "weighted by the
validator's actual reward mix." The SDK source (`calculations.js`) shows:

```
inflationPmpe = rewards.inflationPmpe × (1 − validator.inflationCommissionDec)
mevPmpe       = rewards.mevPmpe       × (1 − validator.mevCommissionDec)
blockPmpe     = rewards.blockPmpe     × (1 − validator.blockRewardsCommissionDec)
```

where `rewards.*` are stake-weighted **network-average** rates aggregated from
`rewards_inflation_est` / `rewards_mev` across all validators — not per-validator
realized performance.

Additionally: `rewards_mev` has a multi-epoch Jito delivery lag; `rewards_inflation_est`
is an estimate (name contains "est").

**Fixed in GUIDE** (2026-05-29): replaced the inaccurate paragraph with:

- network-average formula description
- Jito delivery lag explanation

**Where:** `public/docs/GUIDE.md` (lines ~199–222), `src/services/protected-events.ts`
(`selectProtectedStakeReason` — item 6 label fix).
