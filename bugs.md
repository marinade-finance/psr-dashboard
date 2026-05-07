# bugs.md

Audit date: 2026-05-07. Five agents (logic, data/types, UI/components, routes, visual/typecheck)
cross-verified against source. Only real deficiencies recorded.

---

## Critical — data corruption / runtime crashes

### B1 · `marinadeStake` lamports vs SOL unit mismatch
**File:** `src/services/protected-events-estimator.ts` lines 135–136, 198–199

```ts
const marinadeStake =
  Number(epochStat.marinade_native_stake) + Number(epochStat.marinade_stake)
```

All other stake values in this file go through `lamportsToSol()` (lines 77, 96, 104). `marinadeStake`
does not — it is raw lamports. `expectedRewards = marinadeStake * expectedEpr` is therefore off by 1e9
(i.e. 10^9× too large). Protected-event claim amounts are computed from this value.

Fix: `Number(lamportsToSol(epochStat.marinade_native_stake)) + Number(lamportsToSol(epochStat.marinade_stake))`

---

### B2 · `selectMaxProtectedStake` returns `Infinity` on zero-bid validators
**File:** `src/services/validator-with-bond.ts` lines 23–28

```ts
const participatingTotalBidPmpe =
  auction.revShare.inflationPmpe + auction.revShare.mevPmpe + auction.revShare.effParticipatingBidPmpe
return Math.max(0, effBondBalance / (participatingTotalBidPmpe / 1000))
```

A validator with no MEV client and a zero bid has `participatingTotalBidPmpe = 0` → division by zero →
`Infinity`. `validator-bonds-table.tsx` line 34 accumulates these with `sum + Infinity = Infinity`,
corrupting the total protected-stake display.

Fix: guard `if (participatingTotalBidPmpe === 0) return 0` (or `Infinity` if that's the intended semantic
— but the accumulator must handle it).

---

### B3 · `selectProjectedAPY` division by zero when TVL is 0
**File:** `src/services/sam.ts` line 110

```ts
return Math.pow(1 + profit / tvl, epochsPerYear) - 1
```

No guard for `tvl === 0`. When `marinadeSamTvlSol` is zero (e.g. initial load, empty auction, data
error), this returns `NaN` / `Infinity`, which then propagates to the APY metric card.

Fix: `if (tvl <= 0) return 0`

---

### B4 · `data.epochsPerYear` accessed without null guard in `sheetValidatorData`
**File:** `src/pages/sam.tsx` lines 240–241, 250

```ts
const sheetValidatorData = useMemo(() => {
  if (!selectedValidator || !displayAuctionResult) return null
  ...
  .sort((a, b) =>
    selectMaxAPY(b, data.epochsPerYear) -   // data can be undefined
    selectMaxAPY(a, data.epochsPerYear),
  )
}, [selectedValidator, displayAuctionResult])   // data missing from deps
```

`data` is `SamResult | undefined`. During a simulation re-fetch `displayAuctionResult` is set from
`originalAuctionResult` while `data` is briefly undefined → crash on `.epochsPerYear`.

`data` is also absent from the dependency array, so the sort key uses a stale `epochsPerYear` value when
the query returns fresh data.

Fix: add `data` to guard and dep array; replace `data.epochsPerYear` with `data?.epochsPerYear ?? 365`.

---

## Logic errors

### B5 · `grace_commission_increase` compared in bps when value is in percentage points
**File:** `src/services/protected-events-estimator.ts` line 208

```ts
if (eprLossBps < config.grace_commission_increase)
```

`eprLossBps` is in basis points (0–10 000). `grace_commission_increase = 1` means one percentage point.
This comparison means "skip if loss < 1 bps (0.01%)" instead of "skip if loss < 1% (= 100 bps)".
The analogous field `grace_low_credits_bps` is correctly in bps (100).

Fix: `eprLossBps < config.grace_commission_increase * 100`

---

### B6 · `targetCredits` can be `undefined` — not guarded before use
**File:** `src/services/protected-events-estimator.ts` lines 252–259

```ts
const targetCredits = targetCreditsByEpoch.get(epochStat.epoch)   // number | undefined
const eprCalculator = eprCalculators.get(epochStat.epoch)
if (eprCalculator) {                           // targetCredits NOT checked
  const event = buildLowCreditsProtectedEvent(
    config, eprCalculator, targetCredits, ...  // undefined passed as number
  )
```

`buildLowCreditsProtectedEvent` takes `targetCredits: number`. If the epoch is missing from the map,
`targetCredits` is `undefined`, causing `epochStat.credits / targetCredits = NaN` and the produced
claim amount to be `NaN`.

Fix: `if (eprCalculator && targetCredits !== undefined)`

---

### B7 · `getBondHealthStyle` type signature excludes `'soft'` state
**File:** `src/services/tip-engine.ts` line 39

```ts
export const getBondHealthStyle = (
  health: 'healthy' | 'watch' | 'critical',
```

`BondHealthState = 'healthy' | 'soft' | 'watch' | 'critical'` (breakdowns.ts line 244). If `'soft'`
is ever passed, no branch matches and the function returns `{ label: 'Healthy', color: VAR_PRIMARY }` —
the wrong label and colour for a soft-health validator.

Fix: change parameter type to `BondHealthState` and add a `'soft'` case (info/indigo style).

---

### B8 · `getValidatorTip` skips bond top-up CTA for `'soft'` health
**File:** `src/services/tip-engine.ts` line 137

```ts
if (health === 'critical' || health === 'watch') {
```

Validators with `topUpToIdealKeep > 0` (soft health) never reach the bond CTA block. They receive a
stake-delta tip instead of the "Top up for ideal coverage" call-to-action.

Fix: add `|| health === 'soft'` to the condition.

---

### B9 · `'Bidding'` settlement reason displays as "Unsupported"
**File:** `src/services/protected-events.ts` line 116

`SettlementReason` includes `'Bidding'` (line 75). `selectProtectedStakeReason` handles
`BidTooLowPenalty`, `BlacklistPenalty`, and `BondRiskFee` but falls through `'Bidding'` to
`console.log('unsupported event:', ...)` → returns `'Unsupported'`. Any real bidding settlement
event shows "Unsupported" in the protected-events table reason column.

---

### B10 · Division by zero on `expected_credits` in reason formatter
**File:** `src/services/protected-events.ts` lines 107, 110

```ts
return `Uptime ${formatPercentage(reason.LowCredits.actual_credits / reason.LowCredits.expected_credits)}`
```

`expected_credits` is typed as `number` with no nullability. A validator with 0 expected credits (new
joiner, data anomaly) produces `Infinity` passed to `formatPercentage`.

Fix: `expected_credits > 0 ? actual / expected : 0`

---

## Reliability / error handling

### B11 · Rejected promise permanently cached in `loadValidators`
**File:** `src/services/validators.ts` line 62

```ts
cache.set(epochs, promise)   // set before promise resolves
```

If the fetch or JSON parse throws, the rejected promise stays in `cache`. All subsequent calls for the
same `epochs` return the permanently-rejected promise — data is unrecoverable until page reload.

Fix: delete from cache on rejection.
```ts
promise.catch(() => cache.delete(epochs))
cache.set(epochs, promise)
```

---

### B12 · No `res.ok` check before JSON parse in API fetches
**Files:** `src/services/validators.ts` line 54, `src/services/bonds.ts` line 30

Both services do `(await res.json()) as FooResponse` with no `res.ok` guard. A 4xx/5xx response returns
valid JSON (e.g. `{ error: "..." }`), the blind cast succeeds, and then `.validators` / `.bonds` access
on that object throws at runtime.

Fix: `if (!res.ok) throw new Error(res.statusText)` before `.json()`.

---

### B13 · `handleClearValidator` called with `string | null`
**File:** `src/pages/sam.tsx` line 305

```ts
? () => handleClearValidator(selectedValidator)
```

`selectedValidator` is `string | null`. TypeScript accepts the deferred lambda, but if `selectedValidator`
is `null` at call-time (possible during teardown), `null` is passed into `removeFromOverrides` and Set
operations.

Fix: `() => selectedValidator && handleClearValidator(selectedValidator)`

---

## State bugs

### B14 · Epoch filter bounds stale after data refetch
**File:** `src/components/protected-events-table/protected-events-table.tsx` lines 103–104

```ts
const [minEpochFilter, setMinEpochFilter] = useState(minEpoch)
const [maxEpochFilter, setMaxEpochFilter] = useState(maxEpoch)
```

`useState` initializers run once on mount. When a live refetch introduces epochs outside the original
range, the filter bounds stay at the mount-time values — new epochs are silently excluded from the
filtered view.

Fix: use a `useEffect` that resets the filters when `minEpoch` / `maxEpoch` change by more than a
small delta (to avoid resetting user-adjusted filters on every poll).

---

## Visual / dark-mode

### B15 · Raw Tailwind palette classes in bond-coverage bar (dark mode broken)
**File:** `src/components/validator-bonds-table/validator-bonds-table.tsx` lines 262–264

```ts
if (ratio >= 0.9) return 'bg-green-500'
if (ratio >= 0.5) return 'bg-yellow-500'
return 'bg-red-500'
```

Raw palette classes do not respond to dark-mode CSS variable overrides. Semantic equivalents:
`bg-status-green`, `bg-warning`, `bg-destructive`.

---

### B16 · Raw palette classes on funder badges (dark mode broken)
**File:** `src/components/protected-events-table/protected-events-table.tsx` lines 62, 74

```tsx
className="cursor-help bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30"
className="cursor-help bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30"
```

Inline `dark:` overrides instead of semantic CSS vars. Correct classes:
`bg-status-green-light text-status-green` and `bg-warning-light text-warning`.

---

## Project rule violations

### B17 · Forbidden `border-l` decorative accent in docs
**File:** `src/pages/docs.tsx` line 111

```tsx
<blockquote className="border-l-[3px] border-primary ...">
```

Project rule (memory/no-left-border.md): **NEVER use border-l decorative accents on any element.**

---

## Broken tests

### B18 · Default sort test asserts wrong column
**File:** `tests/sam.spec.ts` line 77

```ts
test('default sort: Stake Δ header shows ↓', ...
  await expect(h).toContainText('↓')
```

Actual default sort column is `maxApy` (`sam-table.tsx` line 252). The Stake Δ header has no sort
indicator on initial load — this test fails.

---

### B19 · Test expects "Expert Guide" nav link that does not exist
**File:** `tests/sam.spec.ts` line 162

```ts
await expect(page.getByRole('link', { name: 'Expert Guide' })).toBeVisible()
```

The navigation link is always labelled **"Docs"** (navigation.tsx line 117). "Expert Guide" is a tab
label inside the /docs page, not a nav link. This test fails.

---

## Routing / navigation

### B20 · Logo link causes full page reload and drops expert mode
**File:** `src/components/navigation/navigation.tsx` line 70

```tsx
<a href="/">
```

A bare `<a>` triggers a full browser navigation (not a SPA route change). On any expert page
(`/expert-`, `/expert-bonds`, etc.) clicking the logo navigates to `/` (basic SAM) instead of
`/expert-`. Should use React Router `<Link to={`/${prefix}`}>`.

---

### B21 · No SPA fallback config for production static hosting
**File:** `vite.config.ts` — `spaFallback()` plugin

The custom `spaFallback` plugin uses `configureServer` / `configurePreviewServer` — it only runs
under `vite dev` and `vite preview`. Production builds have no `public/_redirects`, `public/404.html`,
or server-side rewrite rule. Any static host (nginx, S3+CloudFront, Netlify without config) returns
404 when a user directly navigates to or refreshes on any non-root route (e.g. `/bonds`, `/protected-events`).
