# Specs Index

## Phase 2 — open

| File                                                                                     | Status     | Summary                                                                     |
| ---------------------------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------- |
| [2/1-remove-expert-routes.md](2/1-remove-expert-routes.md)                               | planned    | Remove deprecated /expert-\* routes and UserLevel prop                      |
| [2/2-test-page-parity.md](2/2-test-page-parity.md)                                       | shipped    | /test- data-path divergence resolved (hasOverrides removed)                 |
| [2/3-assert-never-ts-common.md](2/3-assert-never-ts-common.md)                           | planned    | Move assertNever into shared ts-common package                              |
| [2/4-cta-quantified-consequence.md](2/4-cta-quantified-consequence.md)                   | planned    | CTA family: action + quantified consequence amounts                         |
| [2/5-simulation-prefill.md](2/5-simulation-prefill.md)                                   | planned    | Pre-fill sim panel from breakdown CTA target values                         |
| [2/6-test-fixtures-coverage.md](2/6-test-fixtures-coverage.md)                           | planned    | Full /test- CTA and auction-state fixture coverage                          |
| [2/7-calculations-to-sdk.md](2/7-calculations-to-sdk.md)                                 | planned    | Move local compute services into ds-sam-sdk                                 |
| [2/8-rank-tracking.md](2/8-rank-tracking.md)                                             | planned    | Rank position history and delta display per epoch                           |
| [2/9-precise-apy-timestamps.md](2/9-precise-apy-timestamps.md)                           | planned    | Derive epochsPerYear from real epoch timestamps                             |
| [2/10-bond-override-sdk.md](2/10-bond-override-sdk.md)                                   | planned    | Add bondBalanceSol to SourceDataOverrides in SDK                            |
| [2/11-redelegation-allocation.md](2/11-redelegation-allocation.md)                       | planned    | Extract RedelegationAllocation to own module, then SDK                      |
| [2/12-blacklist-metadata.md](2/12-blacklist-metadata.md)                                 | planned    | Blacklist epoch + reason metadata in CTA                                    |
| [2/13-upstream-package-fixes.md](2/13-upstream-package-fixes.md)                         | planned    | Upstream eslint-config fixes (import-x, zodios)                             |
| [2/14-psr-settlement-pending.md](2/14-psr-settlement-pending.md)                         | planned    | PENDING badge state between ESTIMATE and FINALIZED                          |
| [2/15-my-validator-pin.md](2/15-my-validator-pin.md)                                     | planned    | "My Validator" address pin + notification ribbon                            |
| [2/16-bond-breakdown-forward-looking.md](2/16-bond-breakdown-forward-looking.md)         | planned    | Forward-looking ideal bond for SOFT + growing validators                    |
| [2/17-notifications-by-epoch.md](2/17-notifications-by-epoch.md)                         | planned    | Notifications tab grouped by epoch number                                   |
| [2/18-responsive-layout.md](2/18-responsive-layout.md)                                   | planned    | Responsive layout for narrow viewports (< 900px)                            |
| [2/19-guide-gaps.md](2/19-guide-gaps.md)                                                 | planned    | GUIDE gaps: support threads + reason labels + APY inaccuracy (item 7 fixed) |
| [2/20-docs-line-length.md](2/20-docs-line-length.md)                                     | planned    | Docs hygiene: wrap prose at ≤120-char line length                           |
| [2/21-bond-calculator.md](2/21-bond-calculator.md)                                       | planned    | Bond Calculator: bid/bond sizing tool for new validators                    |
| [2/22-sam-stats-bar.md](2/22-sam-stats-bar.md)                                           | partial    | SAM stats bar: importance hierarchy + further tile collapse                 |
| [2/23-sam-bill.md](2/23-sam-bill.md)                                                     | draft      | Marinade SAM Bill: per-validator monthly CSV payment report                 |
| [2/24-commissions-summary.md](2/24-commissions-summary.md)                               | draft      | Bid + commissions always visible on row (no hover/click)                    |
| [2/25-epoch-browser.md](2/25-epoch-browser.md)                                           | draft      | Epoch browser: full dashboard replay at any past epoch                      |
| [2/26-time-series-charts.md](2/26-time-series-charts.md)                                 | draft      | Time-series charts: per-validator bond/bid/stake/payments history           |
| [2/27-pmpe-instead-of-apy.md](2/27-pmpe-instead-of-apy.md)                               | experiment | Show Total PMPE instead of Max APY as primary table column                  |
| [2/28-constraint-detail-view.md](2/28-constraint-detail-view.md)                         | planned    | Surface every binding constraint + ranking inputs in detail panel           |
| [2/29-bond-gauge-redesign.md](2/29-bond-gauge-redesign.md)                               | planned    | Bond coverage gauge: legible single-fill + threshold redesign               |
| [2/30-ideal-reward-reserve-scaling.md](2/30-ideal-reward-reserve-scaling.md)             | draft      | Ideal reward reserve: scale with window or fix tooltip (protocol)           |
| [2/31-redelegation-excludes-sub-min-bond.md](2/31-redelegation-excludes-sub-min-bond.md) | draft      | Redelegation budget should skip sub-min-bond validators                     |
| [2/32-abort-signal-threading.md](2/32-abort-signal-threading.md)                         | draft      | Thread abort signal through SAM load path (blocked on SDK)                  |

## Phase 1 — shipped

| File                                                       | Status  | Summary                                         |
| ---------------------------------------------------------- | ------- | ----------------------------------------------- |
| [1/1-v3-merge-plan.md](1/1-v3-merge-plan.md)               | shipped | v3 merge: Tailwind/Vite + v2 UX                 |
| [1/2-calculations-service.md](1/2-calculations-service.md) | shipped | Pure math extracted into `calculations.ts`      |
| [1/3-v2-view.md](1/3-v2-view.md)                           | shipped | v2 UI ported onto Tailwind scaffolding          |
| [1/4-v2-audit.md](1/4-v2-audit.md)                         | shipped | Post-port audit: simplify v2, remove complexity |
| [1/5-queued-fixes.md](1/5-queued-fixes.md)                 | shipped | Queued fixes (rounding, gauge, tooltip, etc.)   |
| [1/6-sdk-features.md](1/6-sdk-features.md)                 | shipped | PSR estimate query dedup                        |
| [1/7-new-ui-features.md](1/7-new-ui-features.md)           | shipped | Epoch Status Badge (`EpochMeter`)               |
| [1/8-content.md](1/8-content.md)                           | shipped | CPMPE → Cost PMPE rename; natural turnover rate |
