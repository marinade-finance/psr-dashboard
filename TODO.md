# TODO

## Target Protected Stake metric

Current "Protected Stake %" uses `marinadeActivatedStakeSol` (actual deployed). Should show
"Target Protected Stake" using `marinadeSamTargetSol` instead.

Current formula (validator-with-bond.ts):
```
protectedStake = bondBalance / ((inflationPmpe + mevPmpe + effBidPmpe) / 1000)
```

Proposed: same formula but against target stake, not deployed stake. This shows how much of
the INTENDED allocation is bond-covered, not how much of what's currently deployed is covered.

Actual unprotected per validator:
```
actualUnprotected = max(0, targetStake - bondOnlyCap)
```
where `bondOnlyCap = bondStakeCapSol - unprotectedStakeCapSol`.

Add to expert view in main dashboard.
