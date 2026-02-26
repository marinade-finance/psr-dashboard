# PSR Dashboard — Performance & Architecture Review

## Why It's Slow

### The Critical Path (Load Time)

When the page loads, `loadSam()` runs. Here's the waterfall:

```
1. fetchValidatorsWithEpochs(11)     → GET validators-api.marinade.finance/validators?limit=9999&epochs=11
   ↓ (this fetches ALL validators × 11 epochs of history just to estimate epoch duration)
2. loadSamConfig()                    → fetches SDK config (unknown latency)  
3. DsSamSDK.runFinalOnly()           → fetches 3+ more APIs internally:
   - Bonds API (validator-bonds-api.marinade.finance/bonds)
   - Rewards API (validators-api.marinade.finance/rewards)  
   - Scoring API (scoring.marinade.finance/api/v1/scores/sam)
   - Possibly more internal SDK fetches
   ↓ then runs full auction simulation client-side
```

**Total: 4-6 sequential HTTP requests + heavy client-side computation**

### Problem Breakdown

| Issue | Impact | Severity |
|-------|--------|----------|
| **Sequential API calls** — epoch estimation fetches ALL validators with 11 epochs BEFORE the SDK even starts | Adds 2-5s to cold load | 🔴 High |
| **`cacheInputs: false`** — SDK refetches all source data every time, even for simulations | Each simulation re-downloads everything | 🔴 High |
| **No data caching between page loads** — react-query cache is memory-only, lost on refresh | Every refresh = full reload | 🟡 Medium |
| **`limit=9999`** — fetches entire validator set with 11 epochs of stats just for epoch duration calc | Massive payload for a simple calculation | 🔴 High |
| **Single JS bundle** — everything in one `bundle.[hash].js`, no code splitting | Large initial download | 🟡 Medium |
| **No loading skeleton** — just a spinner, feels slower than it is | Perceived perf | 🟡 Medium |
| **Webpack (not Vite)** — slower dev builds, no ESM optimization | DX + slightly larger bundles | 🟠 Low |

---

## Recommendations

### 🔴 P0 — Quick Wins (< 1 day each)

#### 1. Parallelize API calls in `loadSam()`
Currently `estimateEpochsPerYear()` runs first, THEN the SDK. These are independent.

```typescript
// BEFORE (sequential):
const epochsPerYear = await estimateEpochsPerYear()
const config = await loadSamConfig()
const dsSam = new DsSamSDK({ ...config })
const auctionResult = await dsSam.runFinalOnly()

// AFTER (parallel):
const [epochsPerYear, config] = await Promise.all([
  estimateEpochsPerYear(),
  loadSamConfig(),
])
const dsSam = new DsSamSDK({ ...config })
const auctionResult = await dsSam.runFinalOnly()
```

**Expected improvement: 1-3s off initial load**

#### 2. Reduce epoch estimation payload
Fetching 9,999 validators with 11 epochs of stats just to calculate epoch duration is overkill. Options:
- Fetch with `limit=1&epochs=11` — you only need epoch timestamps, not validator data
- Or hardcode `epochsPerYear ≈ 182.5` (Solana epochs are ~2.5 days, very stable) and update it occasionally
- Or create a tiny backend endpoint that returns just epoch timing

**Expected improvement: 1-3s off initial load (this is likely the single biggest payload)**

#### 3. Enable SDK input caching for simulations
```typescript
const dsSam = new DsSamSDK({
  ...config,
  cacheInputs: true,  // ← was false!
})
```
First load fetches everything. Subsequent simulations reuse cached data and only recompute the auction. This should make simulations near-instant.

**Expected improvement: Simulations go from 3-5s → <500ms**

#### 4. Add react-query staleTime
```typescript
useQuery(['sam', simulationRunId], () => loadSam(simulationOverrides), {
  keepPreviousData: true,
  staleTime: 5 * 60 * 1000,  // 5 minutes — epoch data doesn't change fast
  cacheTime: 30 * 60 * 1000, // 30 min cache
})
```

### 🟡 P1 — Medium Effort (1-3 days)

#### 5. Add loading skeleton
Replace the spinner with a skeleton UI matching the stats bar + table layout. Makes perceived load time feel 50% faster.

#### 6. Code split the SDK
The `@marinade.finance/ds-sam-sdk` is likely a large dependency. Lazy-load it:
```typescript
const { DsSamSDK, loadSamConfig } = await import('@marinade.finance/ds-sam-sdk')
```
Combined with webpack's dynamic import, this splits the SDK into a separate chunk that loads in parallel.

#### 7. Prefetch on navigation hover
If the user is on another tab (Bonds, Protected Events), prefetch SAM data when they hover over the "Stake Auction Marketplace" nav link.

### 🟠 P2 — Larger Improvements (1+ week)

#### 8. Server-side precomputation
The auction result doesn't change between epochs (~2.5 days). Pre-compute it server-side and serve as a static JSON. The dashboard just fetches one file instead of running the full SDK client-side.

- Run `DsSamSDK.runFinalOnly()` on a cron job every 5 minutes
- Store result in a CDN-cached JSON endpoint
- Dashboard fetches pre-computed result (~100KB vs running the full simulation)
- Simulation mode still runs client-side (for what-if scenarios)

**This would make initial load <1s.**

#### 9. Migrate to Vite
Vite gives faster dev builds, better tree-shaking, and ESM-native output. Not urgent but a nice DX win.

#### 10. Service Worker caching
Cache API responses in a service worker for offline/instant revisits. Good for validators who check the dashboard multiple times a day.

---

## Bundle Size Audit (TODO)

Run `npx webpack-bundle-analyzer` to identify:
- Size of ds-sam-sdk
- Size of Tailwind CSS output
- Any unused dependencies
- Tree-shaking opportunities

---

## Summary — If You Do Only 3 Things

1. **Parallelize + reduce epoch payload** → saves 2-5s
2. **Enable SDK caching** → simulations go instant  
3. **Add skeleton loading** → feels twice as fast

These 3 changes alone should cut perceived load time from ~8-10s to ~3-4s with minimal code changes.
