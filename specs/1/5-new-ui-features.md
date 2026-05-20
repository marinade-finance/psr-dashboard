---
status: planned
---

# New UI features

## PSR Settlement Pending Status

**Why:** everything auction-emitted shows as ESTIMATE today; the table cannot
distinguish "settlement final, on-chain claim not yet visible" from
"current-epoch projection."

Three states total:
- **ESTIMATE** — current-epoch projection (existing).
- **PENDING** — auction-emitted / settled, on-chain claim not yet visible (new).
- **FINALIZED** — on-chain settlement done, muted badge (existing label, needs
  explicit rendering even when muted so every row has a status).

**Where:**
- `src/services/validator-with-protected_event.ts` — gate between ESTIMATE and
  PENDING based on auction emit flag.
- `src/components/protected-events-table/` — third badge colour for PENDING.

## Epoch Status Badge

**Why:** users cannot tell how fresh the displayed auction snapshot is, or where
the network is in the current epoch's lifecycle.

**What to show:**
- Progress bar for the current epoch (current slot / 432000).
- Pending vs finalized state of the prior epoch.
- Which epoch the next auction will run for.

**Where:** SAM page header / stats bar (overlaps with GUIDE gaps — "snapshot
timing" section).

## "My Validator" address pin + personal notification ribbon

**Why:** validators want their own notifications surfaced without having to find
their row in the table.

**UX:**
- Input in the navigation where the validator pastes their vote account.
  Validation: account must exist in current auction data or still show
  notifications if not in auction (chip marked muted).
- `localStorage` key `mnde:myValidator`. No server state.
- A slim ribbon above the broadcast `<Banner>` on every page showing
  notifications matching the saved vote account. Each row: priority chip +
  title + message + optional dismiss.
- "Clear" button on the chip.

**Data:** `fetchAllNotifications()` already returns
`Record<user_id, NotificationSummary>` — look up by saved vote account. No new
endpoint. Reuses the 5-min refresh.

**Where:**
- `src/components/navigation/navigation.tsx` — input/chip.
- New `src/components/my-validator-ribbon/` — renders the notification list.
- Pages mount ribbon between `<Navigation>` and `<Banner>`.

## Bond breakdown: forward-looking ideal bond for SOFT + growing validators

**Why:** "Ideal bond to grow stake" sizes `requiredIdealKeep` against
`currentExposedStakeSol`. A SOFT validator gaining stake next epoch needs to
pre-fund for the stake that's arriving, not for what they hold today.

**Design call needed:** choose between three options before implementing:
- (a) NEW row alongside existing ideal — current vs projected side-by-side.
- (b) REPLACE current "Ideal" row with projected version when delta > 0,
  revert to current-stake basis at steady state.
- (c) Single row picks `max(current, projected)` — always defensive.

**Where:**
- `src/services/bond-coverage.ts` — add `requiredIdealAtTarget` /
  `topUpToIdealAtTarget` sized against `auctionStake.marinadeSamTargetSol`.
- `src/components/breakdowns/bond-coverage.tsx` — "Ideal bond to grow stake"
  section, only surfaced when positive delta expected.
