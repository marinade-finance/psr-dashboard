# TODO

## Auction Unprotected Stake Metric

Add a metric showing actual unprotected stake in the auction results.

### What is unprotected stake?

Bonds cover the PMPE obligation (rev share payments), not the principal.
The bond reserve covers ~17 epochs of obligations at current bid levels.
"Unprotected" stake is delegation beyond what the bond's ideal reserve
period would justify - the bond reserve covers fewer epochs for that
portion.

### How to calculate actual unprotected stake

The `unprotectedStakeSol` field in results.json is a **theoretical cap
component**, not actual unprotected delegation. Many validators have
target stake below their bond-only cap, so none of their stake is truly
unprotected.

Correct calculation per validator:

```
bond_only_cap = bondSamStakeCapSol - unprotectedStakeSol
actually_unprotected = max(0, marinadeSamTargetSol - bond_only_cap)
```

Sum across all staked validators for the total.

### Current numbers (epoch 923, 4% validator cap)

- Theoretical (field sum): 1,193,743 SOL (19.1% of TVL)
- Actually unprotected:      949,997 SOL (15.2% of TVL)
- 59 out of 70 staked validators truly use unprotected headroom

### Dashboard display

Add "Target Protected Stake" metric to expert view, alongside the
existing "Protected Stake" (93.22%).

Existing metric (current state):
- "Protected Stake" = min(bondBal / (totalPmpe/1000), marinadeStake)
  summed across validators / total marinade stake
- Uses actual current marinade activated stake
- Shows: what % of current delegation is bond-covered

New metric (auction target):
- "Target Protected Stake" = same formula but using
  marinadeSamTargetSol instead of marinadeActivatedStakeSol
- Shows: what % of target delegation will be bond-covered

Consider a dedicated dashboard page for auction analysis:
- Row 1: current metrics (Protected Stake, Max Protectable Stake)
- Row 2: target metrics (Target Protected Stake, Unallocated Stake %)
- Epochs of bond coverage (total bonds / per-epoch obligation)
- Per-epoch obligation = sum(target * expectedMaxEffBidPmpe / 1000)
- Total bond balance, total actually unprotected stake

## Backstop Metric (Phase III — Stake Cap Increase)

Add a "backstop" measure to the PSR expert dashboard showing how much
APY would suffer if top validators left or suffered a catastrophe.

Also add the same metric to the **SAM analytics-dashboard** for longer
timeframe observation.

### What to measure

- APY impact if 1–4 top validators leave (estimate count from
  historical max over SAM lifetime, use 2x as ceiling)
- APY impact if validators representing 10–40% of stake leave
- Display as APY diff from current winning APY

### Context

Phase III raises the max stake TVL cap: 4% → 7% → 15% (toward 20%).
The backstop metric is the safety indicator — if it worsens after
raising to 7%, pause before going to 15%.

Observation cadence: assess every 7 days, min 14 days between steps.

### Dashboard display

PSR expert dashboard: add backstop row below auction analysis.
SAM analytics-dashboard: add backstop panel for long-term tracking.
