# Marinade PSR Dashboard — Production Spec & Claude Code Handoff

> **Purpose**: Complete specification for rebuilding the PSR (Protected Stake Rewards) validator dashboard at `psr.marinade.finance`. This document contains everything needed for a Claude Code session to scaffold and implement the production version: design system tokens, component architecture, data models, business logic, UX requirements informed by validator feedback, and the reference React prototype.

---

## 1. Project Context

### What is this?
The PSR dashboard is Marinade Finance's internal tooling for **Solana validators** to understand and optimize their position in the **Stake Auction Marketplace (SAM)**. Validators bid to receive delegated stake from Marinade's TVL (~5.7M SOL). The auction ranks validators by Max APY and allocates stake to the top N winners.

### Current State (problems)
The existing dashboard at `psr.marinade.finance` shows raw auction data (commissions, bids, bonds, SAM Active/Target, effective bid) optimized for **data completeness** rather than **decision-making**. Validator feedback (summarized below) reveals this leads to conservative bidding, support dependency, and low confidence in the system.

### Target State
A dashboard that helps validators:
1. **Understand** where they rank and why
2. **Predict** how parameter changes affect their position
3. **Act** with confidence — clear next steps, not raw data
4. **Trust** the system — transparent mechanics, not a black box

---

## 2. Validator Feedback Summary (10 themes → 10 UX responses)

This feedback was collected from two validator surveys in 2025 plus ongoing support interactions. Each theme maps to a concrete UI feature.

| # | Feedback Theme | Root Cause | Dashboard Response |
|---|---------------|-----------|-------------------|
| 1 | **Unclear profitability** — validators can't reason about whether SAM participation is net-positive | No visibility into commission revenue vs. bid cost tradeoff | **Economic Overview** panel showing commission revenue, bond cost, net P&L estimate |
| 2 | **Auction opacity** — "deterministic in outcome but opaque in reasoning" | Validators don't know which factors determine their rank | **"Why Rank #N?"** constraint explainer listing each factor (APY, bond, WANT, SFDP, uptime) with pass/fail |
| 3 | **Bond lifecycle uncertainty** — don't know when bond will deplete | No runway visibility, bond shown as static balance | **Bond runway** (epochs + days) visible everywhere — table, detail view, simulation |
| 4 | **No predictive signals** — can't safely experiment with parameters | Dashboard is retrospective, no forward-looking tools | **What-If Simulation** with sliders for bid, bond, WANT — shows projected outcomes |
| 5 | **Simulation = survival only** — existing sim says "in/out" but not why | Binary output without constraint-by-constraint reasoning | **Constraint checks** in simulation: APY vs cutoff, bond runway, capacity, penalty risk — each explained |
| 6 | **Missing alerts/observability** — no notifications for bond depletion or stake changes | Validators check manually, often too late | **Alert indicators** — pulsing dot on critical validators, runway badges, colored health states |
| 7 | **Penalty fear** — afraid to change parameters due to unclear penalty rules | No preview of penalty implications before committing | **Penalty warnings** inline when reducing bid or WANT in simulator, before any action |
| 8 | **Competitive opacity** — don't know if bidding too aggressively or conservatively | No visibility into peer bid distribution | **Bid Distribution** histogram + percentile positioning |
| 9 | **Documentation gaps** — unclear commission evaluation, exit mechanics, penalty rules | Information scattered or missing | **Contextual (?) help tooltips** on every metric and section header |
| 10 | **Conservative bidding** — rational response to uncertainty, not lack of awareness | Cumulative effect of items 1-9 | **All of the above** — reduce uncertainty → enable confident participation |

---

## 3. Design System (from Figma tokens)

### Source
Figma design tokens exported as `Default_tokens.json`. All values below are extracted from that file and match Marinade's production app at `app.marinade.finance`.

### Typography
```
font-sans:   "Geist"        — UI text, labels, headings
font-mono:   "Geist Mono"   — numeric data, addresses, APY values, SOL amounts
font-serif:  "PT Serif"     — (available but unused in dashboard)
```

**Text scale:**
| Token | Font Size | Line Height |
|-------|-----------|-------------|
| 2xs | 12px | 12px |
| xs | 13px | 16px |
| sm | 14px | 20px |
| base | 16px | 20px |
| lg | 18px | 24px |
| xl | 20px | 28px |
| 2xl | 24px | 32px |
| 3xl | 30px | 36px |

**Font weights:** thin(100), extralight(200), light(300), normal(400), medium(500), semibold(600), bold(700), extrabold(800), black(900)

### Colors — Light Mode (primary)

**Core:**
| Token | Hex | Usage |
|-------|-----|-------|
| `primary` | `#0C9790` | Primary actions, active states, positive indicators, teal brand |
| `primary @ 15%` | `#0C9790` @ 15% opacity | Light primary backgrounds |
| `primary @ 90%` | `#0C9790` @ 90% opacity | Hover states |
| `primary-foreground` | `#F6F9F9` | Text on primary backgrounds |
| `foreground` | `#182120` | Primary text |
| `secondary-foreground` | `#3A4E4D` | Secondary text |
| `muted-foreground` | `#6C8383` | Muted/tertiary text, labels |
| `background` | `#FFFFFF` | Base background |
| `background-page` | `#F3F7F7` | Page background |
| `card` | `#FFFFFF` | Card backgrounds |
| `card-foreground` | `#081211` | Card text |
| `border` | `#DDE7E8` | Primary borders |
| `border-grid` | `#E7EEEF` | Grid lines, table dividers |
| `input` | `#E7EEEF` | Input backgrounds |
| `secondary` | `#E7EEEF` | Secondary backgrounds |
| `muted` | `#F3F7F7` | Muted backgrounds |
| `accent` | `#E7EEEF` | Accent backgrounds |
| `tertiary` | `#DDE7E8` | Tertiary backgrounds |
| `tertiary-foreground` | `#6F8383` | Tertiary foreground text |
| `ring` | `#9AB1B2` @ 30% | Focus ring |

**Semantic:**
| Token | Hex | Usage |
|-------|-----|-------|
| `destructive` | `#DC2626` | Critical states, errors, bond danger |
| `destructive @ 20%` | `#DC2626` @ 20% | Destructive light background |
| `warning` | `#E59606` | Watch states, caution |
| `warning @ 20%` | `#E59606` @ 20% | Warning light background |
| `warning @ 10%` | `#E59606` @ 10% | Warning subtle background |
| `info` | `#6366F1` | Informational states |
| `info @ 20%` | `#6366F1` @ 20% | Info light background |

**Chart colors (for APY composition bars):**
| Token | Hex | Usage |
|-------|-----|-------|
| `chart-1` | `#0C9790` | Inflation yield (primary teal) |
| `chart-2` | `#818CF8` | MEV tips (indigo) |
| `chart-3` | `#FBBF24` | Block rewards (amber) |
| `chart-4` | `#C084FC` | Stake bid (purple) |
| `chart-5` | `#FB7185` | (reserved) |

**Tag colors (for status badges):**
| Token | Hex | Usage |
|-------|-----|-------|
| `tag-1` | `#CA8A04` (text) / `#EAB308` @ 15% (bg) | Yellow tags |
| `tag-2` | `#EA580C` (text) / `#EA580C` @ 15% (bg) | Orange tags |
| `tag-3` | `#64748B` (text) / `#64748B` @ 15% (bg) | Slate tags |
| `tag-4` | `#3B82F6` (text) / `#3B82F6` @ 15% (bg) | Blue tags |

### Colors — Dark Mode

| Token | Hex |
|-------|-----|
| `primary-dark` | `#179F99` |
| `background-dark` | `#030707` |
| `background-page-dark` | `#050D0C` |
| `card-dark` | `#050D0C` |
| `foreground-dark` | `#F6F9F9` |
| `border-dark` | `#FFFFFF` @ 15% |
| `border-grid-dark` | `#FFFFFF` @ 6% |
| `destructive-dark` | `#F87171` |
| `warning-dark` | `#FB923C` |
| `info-dark` | `#818CF8` |
| `muted-dark` | `#182120` |
| `muted-foreground-dark` | `#6C8383` |
| `secondary-dark` | `#212C2B` |
| `accent-dark` | `#212C2B` |

### Spacing & Layout

**Border radius:**
| Token | Value |
|-------|-------|
| xs | 2px |
| sm | 6px |
| md | 8px |
| lg | 10px |
| xl | 12px |
| 2xl | 16px |
| 3xl | 24px |
| 4xl | 32px |

**Shadows:**
| Token | Value |
|-------|-------|
| xs | `0 2px 8px rgba(0,0,0,0.05)` |
| sm | `0 1px 14px rgba(0,0,0,0.03)` |
| md | `0 4px 8px -1px rgba(0,0,0,0.07)` + `0 10px 18px rgba(0,0,0,0.05)` |
| lg | `0 10px 15px -3px rgba(0,0,0,0.09)` + `0 4px 18px 3px rgba(0,0,0,0.08)` |
| xl | `0 20px 25px -5px rgba(0,0,0,0.10)` + `0 9px 33px 4px rgba(0,0,0,0.08)` |

**Breakpoints:**
| Token | Value |
|-------|-------|
| sm | 640px |
| md | 768px |
| lg | 1024px |
| xl | 1280px |
| 2xl | 1536px |

**Container widths:** 3xs=256, 2xs=288, xs=320, sm=384, md=448, lg=512, xl=576, 2xl=672, 3xl=768, 4xl=896, 5xl=1024, 6xl=1152, 7xl=1280

---

## 4. Information Architecture

### Page Structure
```
/validators (or /psr)
├── Nav Bar (Marinade global nav)
├── Page Header: "Stake Auction Marketplace" + epoch info + action buttons
├── Stats Bar: 4 summary cards (Total Auction Stake, Winning APY, Projected APY, Winning Validators)
├── Rankings Table (default view)
│   ├── Winning Set (rows 1–66, white background)
│   ├── ── Winning Set Cutoff Divider ──
│   └── Below Cutoff (rows 67+, subtle red tint)
└── Validator Detail View (on row click)
    ├── Header: rank badge, name, 4 key metrics
    ├── Action Tip Banner: constraint-aware recommendation
    ├── Left Column:
    │   ├── "Why Rank #N?" constraint explainer
    │   ├── Position vs Winning APY (visual gauge)
    │   └── APY Composition (stacked bar: Inflation, MEV, Block Rewards, Bid)
    └── Right Column:
        ├── What-If Simulation (bid/bond/WANT sliders + constraint checks)
        ├── Bid Distribution (histogram + percentile)
        └── Economic Overview (commission revenue vs bid cost = net P&L)
```

### Navigation Flow
1. User lands on **Rankings Table** — scans position, health, next step
2. Clicks any row → transitions to **Validator Detail View**
3. Detail view has "Back to rankings" button
4. Future: URL-based routing (`/validators/{pubkey}`) for direct links

---

## 5. Component Architecture

### View 1: Rankings Table (`CleanTable`)

**Columns:**
| # | Column | Content | Interaction |
|---|--------|---------|-------------|
| 1 | `#` | Rank number | — |
| 2 | `Validator` | Name + truncated pubkey. Red pulsing dot if alert. | — |
| 3 | `Max APY` | Colored badge (teal if in set, red if out). | **Hover**: tooltip showing APY breakdown (Inflation, MEV Tips, Block Rewards, Stake Bid) with commission rates |
| 4 | `Bond` | RAG health indicator (Healthy/Watch/Critical) + SOL balance + utilization bar + epoch runway | — |
| 5 | `Stake Δ` | Delta between target and active stake. Green +, Red -, Muted 0. | — |
| 6 | `Next Step` | Constraint-aware actionable tip with urgency color | — |
| 7 | `→` | Chevron button, highlights teal on row hover | **Click**: opens detail view |

**Winning Set Divider:**
Between the last winning validator (rank 66) and first non-winner (rank 67), render a prominent teal banner:
- Star icon + "Winning Set Cutoff"
- Horizontal rule
- "Winning APY: 7.29%"
- "66 of 211 validators"

**Row behavior:**
- Entire row is clickable → opens detail view
- Hover: subtle primary tint background
- Non-winning validators: faint red background tint
- Alert dot (pulsing red): shown when `epochsRunway <= 5` or `bondUtilPct >= 85`

**Column headers:**
- Each has contextual `(?)` help tooltip where relevant (Max APY, Bond, Stake Δ)

### View 2: Validator Detail (`DetailView`)

**Header bar**: rank badge, validator name, pubkey, 4 inline metrics (Max APY, Bond, Stake Δ, Runway)

**Action Tip Banner**: full-width, colored by urgency. Shows:
- Urgency label ("Action Required" / "Recommendation" / "Status")
- Constraint tag ("Bond constraint" / "Bid constraint" / "Rank constraint")
- Human-language recommendation

**Left column panels:**

1. **"Why Rank #N?"** — lists 5 ranking factors:
   - Max APY: value + above/below cutoff
   - Bond capacity: SOL + utilization% + runway
   - WANT: capacity vs current stake
   - SFDP alignment: Yes/No
   - Block production: uptime %
   - Each gets a pass(✓)/fail(✗)/neutral(—) indicator

2. **Position vs Winning APY** — visual gauge:
   - Horizontal bar 0-20% scale
   - Teal marker at Winning APY (7.29%)
   - Colored dot at validator's APY
   - Large delta display: "+X.XX% above cutoff" or "−X.XX% below"
   - Verbal: "Margin of safety before losing stake" / "Gap to close"

3. **APY Composition** — stacked bar with 4 segments:
   - Inflation yield (teal, chart-1)
   - MEV Tips (indigo, chart-2)
   - Block Rewards (amber, chart-3)
   - Stake Bid (purple, chart-4)
   - Legend with individual values
   - Footer showing base rates at 0% commission

**Right column panels:**

4. **What-If Simulation** — interactive sliders:
   - Stake Bid slider: 0-1%, step 0.005%
   - Bond Balance slider: 0 to 3× current
   - Max Stake (WANT) slider: 0 to 2× current
   - Reset button when any value changed
   - **Penalty warnings**: inline orange text when reducing bid or WANT
   - **Constraint checks** (shown when any slider moved):
     - APY vs cutoff: pass/fail + margin
     - Bond runway: pass/warn/fail + epoch count
     - WANT vs bond capacity: pass/fail
     - Penalty risk: detected/clear
   - **Summary box**: "Stays in winning set" / "Drops out" / "Enters" + new APY + runway

5. **Bid Distribution** — histogram:
   - 6 buckets (0-0.05%, 0.05-0.10%, ... 0.50%+)
   - Bar height proportional to validator count per bucket
   - Validator's bucket highlighted in primary
   - Footer: "Your bid: X% · Median: 0.18% · Winning floor: 0.09%"

6. **Economic Overview** — P&L estimate:
   - Commission Revenue (green): annual SOL from inflation/MEV/block commissions
   - Bond Cost (red): annual SOL consumed by bid
   - Net SAM P&L: revenue minus cost
   - Note: "Excludes server costs, opportunity cost of bonded SOL"
   - Link to validator economics guide

---

## 6. Data Model

### Validator Object
```typescript
interface Validator {
  // Identity
  rank: number;
  pubkey: string;           // full pubkey or truncated
  name: string;             // validator name from registry
  
  // Commission rates (% kept by validator)
  inflationCommission: number;   // 0-100
  mevCommission: number;         // 0-100
  blockProduction: number;       // 0-100 (% of slots produced)
  
  // Auction parameters (validator-set)
  stakeBid: number;         // additional APY bid, e.g. 0.476 (%)
  want: number;             // max stake willing to accept (SOL)
  
  // Bond state
  bondBalance: number;      // SOL in bond
  bondUtilization: number;  // 0-100 (% of bond backing active stake)
  bondDeltaPerEpoch: number; // SOL consumed per epoch (negative)
  epochsRunway: number;     // estimated epochs until depletion
  
  // Auction outcome
  maxApy: number;           // total APY offered to stakers
  samActive: number;        // current active stake (SOL)
  samTarget: number;        // target stake allocation (SOL), 0 if not in set
  inWinningSet: boolean;
  
  // Metadata
  sfdpAligned: boolean;     // SFDP program alignment
}
```

### Network Constants (fetched per-epoch)
```typescript
interface NetworkState {
  epoch: number;
  epochDurationHours: number;     // ~52 hours currently
  inflationBaseRate: number;      // gross inflation yield at 0% commission (~5.82%)
  mevTipsRate: number;            // Jito MEV APY at 0% commission (~1.42%)
  blockRewardsRate: number;       // priority fees + base fees yield (~0.88%)
  winningApy: number;             // clearing price APY (7.29%)
  winningCount: number;           // validators in winning set (66)
  totalValidators: number;        // total auction participants (211)
  totalAuctionStake: number;      // SOL in auction (5,764,515)
  projectedApy: number;           // next epoch projected APY (6.80%)
  stakeCapPct: number;            // per-validator cap as % of TVL (8%, MIP-19)
}
```

### APY Breakdown Calculation
```typescript
function getApyBreakdown(validator: Validator, network: NetworkState) {
  // Inflation yield passed to staker (after validator commission)
  const inflationYield = network.inflationBaseRate * (1 - validator.inflationCommission / 100);
  
  // MEV tips passed to staker
  const mevYield = network.mevTipsRate * (1 - validator.mevCommission / 100);
  
  // Block rewards (priority fees shared with stakers)
  const blockYield = network.blockRewardsRate * (validator.blockProduction / 100);
  
  // Stake bid (additional APY from validator's bond)
  const bidYield = validator.stakeBid;
  
  return {
    inflation: inflationYield,   // ~5.82% at 0% commission
    mev: mevYield,               // ~1.42% at 0% commission
    blockRewards: blockYield,    // ~0.88% at 100% production
    stakeBid: bidYield,          // variable, 0-1%+
    total: inflationYield + mevYield + blockYield + bidYield
  };
}
```

### Bond Health Classification
```typescript
function getBondHealth(utilization: number, epochsRunway: number): 'healthy' | 'watch' | 'critical' {
  if (epochsRunway <= 5 || utilization >= 85) return 'critical';
  if (epochsRunway <= 10 || utilization >= 65) return 'watch';
  return 'healthy';
}
```

### Tip Engine (constraint-aware recommendations)
Priority order:
1. **Not in winning set** → "Outside winning set. Increase bid by ~X% or lower commission to qualify." (constraint: rank)
2. **Bond critical + low runway** → "Bond depletes in ~N epochs (Xd). Top up to avoid forced unstaking." (constraint: bond)
3. **Bond critical (utilization)** → "Bond utilization >85%. Top up bond or reduce WANT." (constraint: bond)
4. **Bond watch + low bid** → "Bid at X% is below median. Raise to 0.15-0.25%." (constraint: bid)
5. **Bond watch** → "Bond runway ~N epochs. Consider topping up." (constraint: bond)
6. **Low bid + high potential** → "Low bid limits rank. Raising to X% could gain ~NK◎." (constraint: bid)
7. **Gaining stake** → "Gaining +NK◎ next epoch. Bond and bid well-positioned." (constraint: none)
8. **On track** → "On track: +N◎ incoming." (constraint: none)
9. **At target** → "At target allocation. Raise bid to grow." (constraint: none)
10. **Losing stake** → "Losing N◎ stake. Raise bid or check commission." (constraint: bid)

### What-If Simulation Logic
```typescript
function simulate(validator: Validator, newBid: number, newBond: number, newWant: number, network: NetworkState) {
  // New APY
  const newApy = getApyBreakdown({ ...validator, stakeBid: newBid }, network).total;
  const inSet = newApy >= network.winningApy;
  
  // Bond runway
  const bondCostPerEpoch = (newBid / 100) * newWant * (network.epochDurationHours / 8760);
  const runway = bondCostPerEpoch > 0 ? Math.floor(newBond / bondCostPerEpoch) : Infinity;
  
  // Constraint checks
  const constraints = [
    {
      label: inSet ? 'APY above winning cutoff' : 'APY below winning cutoff',
      pass: inSet,
      detail: inSet ? `+${(newApy - network.winningApy).toFixed(2)}% margin` : `Need ${(network.winningApy - newApy).toFixed(2)}% more`
    },
    {
      label: runway < 5 ? 'Bond runway critical' : runway < 10 ? 'Bond runway limited' : 'Bond runway healthy',
      pass: runway >= 10 ? true : runway >= 5 ? null : false,
      detail: `~${runway} epochs`
    },
    {
      label: newWant > newBond * 5000 ? 'WANT exceeds bond capacity' : 'WANT within bond capacity',
      pass: newWant <= newBond * 5000,
      detail: `${newWant.toLocaleString()}◎`
    }
  ];
  
  // Penalty detection
  if (newBid < validator.stakeBid) {
    constraints.push({ label: 'Penalty risk: reducing bid', pass: false, detail: 'May incur temporary ranking penalty' });
  }
  if (newWant < validator.want) {
    constraints.push({ label: 'Penalty risk: reducing WANT', pass: false, detail: 'May trigger forced unstaking' });
  }
  
  return { newApy, inSet, runway, constraints };
}
```

---

## 7. Help Tooltip Content (glossary)

These strings appear in `(?)` tooltips throughout the dashboard. Write them in plain language, not protocol jargon.

| Key | Text |
|-----|------|
| `maxApy` | Maximum APY offered to stakers. Composed of inflation rewards, MEV tips, block rewards, and your stake bid. Higher Max APY = higher rank in the auction. |
| `bond` | SOL deposited as collateral. Protects stakers if you fail to deliver promised APY. Bond utilization shows how much of your bond is backing active stake — higher means less runway. |
| `stakeDelta` | Difference between your target stake allocation and current active stake. Positive = gaining stake next epoch. Negative = losing stake. |
| `stakeBid` | Additional APY you offer on top of base rewards. This is the primary lever to improve your auction rank. Bid is deducted from your bond over time. |
| `winningApy` | The clearing price of the auction — the minimum APY that won stake this epoch. You must exceed this to be in the winning set. |
| `want` | Maximum stake you're willing to accept. Setting WANT too low may leave stake on the table. Reducing WANT may trigger penalties. |
| `bondHealth` | Healthy = bond can sustain current stake for 10+ epochs. Watch = 5-10 epochs runway. Critical = <5 epochs, risk of forced unstaking. |
| `sfdp` | Stake Focused Delegation Program alignment. Validators aligned with SFDP criteria receive favorable stake weighting. |
| `penalty` | Reducing your bid, WANT, or bond below certain thresholds within an epoch may result in temporary ranking penalties. Changes take effect next epoch. |
| `simulation` | Explore how parameter changes affect your rank, stake allocation, and bond runway. Shows constraint-by-constraint impact, not just survival. |
| `profitability` | Estimated net return after accounting for bond cost, operational expenses, and opportunity cost. Varies by validator infrastructure. |
| `bidDistribution` | Shows how your bid compares to the full distribution of bids across all auction participants. Helps gauge competitive positioning. |

---

## 8. Data Sources

### Primary: Marinade PSR API
The existing `psr.marinade.finance` sources its data from Marinade's on-chain programs. The production dashboard will need:
- **Validator list** with all auction parameters (rank, commissions, bid, bond, WANT, SAM active/target, SFDP status)
- **Epoch metadata** (current epoch, duration, total stake, winning count)
- **Bond state** (balance, utilization, depletion rate)

### Secondary: Solana Network Rates
For APY composition breakdown, the dashboard needs current base rates:
- **Inflation yield**: ~5.82% (derived from ~3.985% inflation rate / ~65% staked ratio). Solana inflation decreases 15% per epoch-year (~180 epochs). Source: on-chain inflation schedule.
- **MEV tips yield**: ~1.42%. Source: Jito tip distribution data or Flipside/Blockworks.
- **Block rewards yield**: ~0.88%. Source: priority fee data from Solana RPC or indexers.

These can be fetched per-epoch or daily. They change slowly (inflation is formulaic, MEV/fees fluctuate with activity).

### Validator Name Registry
Map pubkeys to human-readable names. Sources:
- Solana validator info on-chain (limited coverage)
- Stakewiz, Solana Beach, or validators.app registries
- Marinade's own validator relationship data

---

## 9. Technical Recommendations

### Stack
- **Framework**: Next.js or the existing Marinade app framework
- **Styling**: Tailwind CSS with design tokens from §3 mapped to CSS variables
- **State**: React state for UI (selected validator, simulation sliders). Server state via SWR/React Query for API data.
- **Charts**: Recharts or lightweight custom SVG for APY composition bars and bid distribution histogram

### Performance
- Validator list is ~211 rows — no virtualization needed
- APY breakdown calculation is pure math, no API call
- Simulation is client-side — instant feedback on slider changes
- Tooltip content is static strings, not fetched

### Accessibility
- Table rows are focusable and keyboard-navigable
- Tooltips triggered by both hover and focus
- Color coding always paired with text labels (not color-only)
- Bond health uses dot + text ("Healthy", "Watch", "Critical"), not just color

---

## 10. Reference Prototype

The following React component is the interactive prototype built during design iteration. It implements all features described above with mock data. Use it as the **behavioral reference** for production — the interactions, layout, and logic are correct; the styling should be rebuilt with proper Tailwind/CSS using the design tokens above.

**File**: `marinade-psr-v3.jsx` (attached alongside this document)

**Key implementation notes from the prototype:**
- Mock data simulates 15 validators (10 in-set including edge cases at ranks 65-66, 3 out-of-set at 67-69)
- Bond health uses both utilization% AND epoch runway for classification
- Tip engine has priority-ordered heuristics with constraint tagging
- Simulation sliders update constraint checks in real-time
- APY tooltip on hover shows all 4 composition categories with commission context
- Winning set divider is a full-width banner between in-set and out-of-set rows
- Bid distribution histogram uses hardcoded bucket data (production: compute from actual validator bids)
- Economic overview shows simplified annual P&L (production: use actual per-epoch data)

---

## 11. Open Questions / Future Work

1. **Validator authentication**: Should the detail view auto-open for the connected wallet's validator? (Likely yes — makes it a "My Position" default)
2. **Real simulation engine**: Current simulation is client-side approximation. Could connect to Marinade's actual auction solver for precise rank/stake predictions.
3. **Historical data**: Validators want to see how their position changed over epochs. Timeline view showing rank, APY, stake, bond over time.
4. **Notifications**: Email/Telegram/Slack alerts for bond depletion, stake changes, epoch results. Mentioned heavily in feedback.
5. **Mobile responsiveness**: Many validators check on mobile. Table → card view transformation needed.
6. **Dark mode**: Design tokens for dark mode are provided above. Low priority but ready when needed.
7. **URL routing**: Direct links to validator detail views (`/validators/{pubkey}`) for sharing and bookmarking.
8. **Bid recommendation engine**: More sophisticated than current heuristics — could model "raise bid to X% to overtake rank #N and gain Y◎ stake" using actual auction math.
