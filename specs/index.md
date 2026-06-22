# Specs Index

Phases are **ship order**: Phase 2 ships first, then 3, 4, 5. Phase 1
(foundational v3 merge) already shipped and was removed from the repo.

## Phase 2 — Simplifications (ship 1st)

Code removal, dedup, and hygiene — small self-contained wins, no new UI.

| File                                                       | Status  | Summary                                          |
| ---------------------------------------------------------- | ------- | ------------------------------------------------ |
| [2/1-remove-expert-routes.md](2/1-remove-expert-routes.md) | planned | Remove deprecated /expert-\* routes + UserLevel  |
| [2/2-assert-never-ts-common.md](2/2-assert-never-ts-common.md) | planned | Move assertNever into shared ts-common package |
| [2/3-upstream-package-fixes.md](2/3-upstream-package-fixes.md) | planned | Upstream eslint-config fixes (import-x, zodios) |
| [2/4-docs-line-length.md](2/4-docs-line-length.md)         | planned | Docs hygiene: wrap prose at ≤120-char lines      |
| [2/5-precise-apy-timestamps.md](2/5-precise-apy-timestamps.md) | planned | Derive epochsPerYear from real epoch timestamps |

## Phase 3 — Telemetry + SDK foundation (ship 2nd)

Instrumentation, plus moving local compute into the SDK so the SDK-coupled
work in Phase 5 has a foundation to build on.

| File                                                 | Status  | Summary                                             |
| ---------------------------------------------------- | ------- | --------------------------------------------------- |
| [3/1-product-analytics.md](3/1-product-analytics.md) | draft   | Mixpanel: page views, dwell, interactions, per-user |
| [3/2-calculations-to-sdk.md](3/2-calculations-to-sdk.md) | planned | Move local compute services into ds-sam-sdk     |

## Phase 4 — UX (ship 3rd)

User-facing polish + the validator pin.

| File                                                       | Status     | Summary                                              |
| ---------------------------------------------------------- | ---------- | ---------------------------------------------------- |
| [4/1-my-validator-pin.md](4/1-my-validator-pin.md)         | planned    | "My Validator" address pin + notification ribbon     |
| [4/2-simulation-prefill.md](4/2-simulation-prefill.md)     | planned    | Pre-fill sim panel from breakdown CTA target values  |
| [4/3-psr-settlement-pending.md](4/3-psr-settlement-pending.md) | planned | PENDING badge state between ESTIMATE and FINALIZED   |
| [4/4-notifications-by-epoch.md](4/4-notifications-by-epoch.md) | planned | Notifications tab grouped by epoch number            |
| [4/5-sam-stats-bar.md](4/5-sam-stats-bar.md)               | partial    | SAM stats bar: importance hierarchy + tile collapse  |
| [4/6-commissions-summary.md](4/6-commissions-summary.md)   | draft      | Bid + commissions always visible on row              |
| [4/7-bond-gauge-redesign.md](4/7-bond-gauge-redesign.md)   | planned    | Bond gauge: legible single-fill + threshold redesign |
| [4/8-pmpe-instead-of-apy.md](4/8-pmpe-instead-of-apy.md)   | experiment | Show Total PMPE instead of Max APY as primary column |
| [4/9-guide-gaps.md](4/9-guide-gaps.md)                     | planned    | GUIDE gaps: support threads + reason labels + APY    |
| [4/10-responsive-layout.md](4/10-responsive-layout.md)     | planned    | Responsive layout for narrow viewports (< 900px)     |
| [4/11-blacklist-metadata.md](4/11-blacklist-metadata.md)   | planned    | Blacklist epoch + reason metadata in CTA             |

## Phase 5 — Advanced (ship 4th)

SDK-coupled work, big features, and new subsystems.

| File                                                       | Status  | Summary                                              |
| ---------------------------------------------------------- | ------- | ---------------------------------------------------- |
| [5/1-rank-tracking.md](5/1-rank-tracking.md)               | planned | Rank position history and delta display per epoch    |
| [5/2-bond-override-sdk.md](5/2-bond-override-sdk.md)       | planned | Add bondBalanceSol to SourceDataOverrides in SDK     |
| [5/3-redelegation-allocation.md](5/3-redelegation-allocation.md) | planned | Extract RedelegationAllocation to module, then SDK |
| [5/4-bond-breakdown-forward-looking.md](5/4-bond-breakdown-forward-looking.md) | planned | Forward-looking ideal bond for SOFT + growing |
| [5/5-bond-calculator.md](5/5-bond-calculator.md)           | planned | Bond Calculator: bid/bond sizing for new validators  |
| [5/6-sam-bill.md](5/6-sam-bill.md)                         | draft   | Marinade SAM Bill: per-validator monthly CSV report  |
| [5/7-epoch-browser.md](5/7-epoch-browser.md)               | draft   | Epoch browser: full dashboard replay at any past epoch |
| [5/8-time-series-charts.md](5/8-time-series-charts.md)     | draft   | Time-series: per-validator bond/bid/stake/payments   |
| [5/9-ideal-reward-reserve-scaling.md](5/9-ideal-reward-reserve-scaling.md) | draft | Ideal reward reserve: scale with window or tooltip |
| [5/10-redelegation-excludes-sub-min-bond.md](5/10-redelegation-excludes-sub-min-bond.md) | draft | Redelegation budget should skip sub-min-bond |
| [5/11-abort-signal-threading.md](5/11-abort-signal-threading.md) | draft | Thread abort signal through SAM load (blocked on SDK) |
| [5/12-constraint-detail-view.md](5/12-constraint-detail-view.md) | planned | Surface binding constraints + ranking inputs in panel |

## Shipped — removed from repo

Phase 1 (`1/1`–`1/8`), `2/2-test-page-parity`, plus `2/4-cta-quantified-consequence`
and `2/6-test-fixtures-coverage` (both marked `planned` but found shipped during the
2026-06-22 drift review) shipped and were removed to keep `specs/` to live work only.
See git history for the originals: `git log --diff-filter=D --stat -- specs/`.
