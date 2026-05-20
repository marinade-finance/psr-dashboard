# Visual Language — Elements Alphabet

The canonical, deduplicated set of visual primitives for the PSR Dashboard
and the one rule that governs each. This extends the baseline in
`CLAUDE.md` (surfaces / status families / bond tiers / charts / typography)
with the rules synthesized this session. Ground truth is the committed
code; every entry cites its file.

---

## PROPOSED CLAUDE.md merge

> Splice the block below into `CLAUDE.md`'s "Visual Language" area (after
> the "Inline style escape hatch" subsection, before "Typography scale").
> Do NOT apply automatically — `CLAUDE.md` has uncommitted user edits.

```markdown
### Two orthogonal axes: severity vs lever

Two independent encodings, never collapsed into one. Enforced at the
source — one CTA helper per lever in `src/services/tip-engine.ts`
(`bondCta`, `bidCta`, `outOfSetCta`, `capCta`, `deltaCta`); `selectTip`
picks the highest-severity candidate, with `LEVER_ORDER` (bond →
bid/rank → cap → none) breaking ties at the same severity.

- **Colour = severity.** `getTipStyle(urgency)` maps
  `TipUrgency.CRITICAL`→destructive, `WARNING`→warning, `INFO`→info,
  `POSITIVE`→primary, `NEUTRAL`→muted. Same axis the breakdown banner
  uses (`tone: red|yellow|green`); `bondAdvice()` emits both so they
  agree by construction.
- **Glyph = the lever** (which knob to turn).
  `TipConstraint.BOND`→ICON_BOND, `BID`→ICON_BID, `RANK`→ICON_BID (same
  lever — raise the bid, so same glyph), `CAP`→ICON_CAP. Only
  `TipConstraint.NONE` (in-set, no binding constraint) gets a
  directional glyph — up/down/right keyed off the real signed `delta`
  so it cannot lie. `getTipIcon` in `src/services/tip-engine.ts`.
- **Octagon alert is the ONLY severity-driven glyph.** `ICON_ALERT`
  (stop-sign octagon) overrides the lever glyph for exactly one state:
  an estimated bond risk fee this epoch (`tip.alert === true`). Plain
  below-min / no-bond stay critical-red but keep their constraint glyph
  — no escalation. `src/components/icons/icon-alert.tsx`.

### Tip glyph set

7 glyphs, all `viewBox 0 0 12 12`, uniform **14.4px** (12 → 14.4, +20%):
bond, bid, cap, alert, up, down, right. `src/components/icons/icon-*.tsx`.
No `rank` glyph — `TipConstraint.RANK` reuses ICON_BID because the lever
is identical.

### Phantom icon slot

Every tip pill renders its glyph inside a fixed
`w-4 h-4` centred box (`shrink-0 inline-flex items-center justify-center`)
so glyph variance never shifts pill margins or breaks column alignment.
`src/components/sam-table/sam-table.tsx` (Next Step cell).

### Bond gauge

One shared track-and-fill `Gauge` (`src/components/gauge/gauge.tsx`),
two sizes. Fill = `clamp(value/scaleMax, 4%, 100%)`. **Critical band +
marker scale independently of fill** — `criticalBand` and `marker` are
fractions of the *track*, fill is a fraction of the *value range*.
Bond pill: `scaleMax = bondGaugeScaleMax(config) = minBondEpochs /
BOND_CRITICAL_FRAC` (i.e. `5 × minBondEpochs`), and both `marker` and
`criticalBand` are passed the constant `BOND_CRITICAL_FRAC = 0.2` — the
20% mark literally is the SDK fee-charged threshold. Healthy validators
above `5 × minBondEpochs` saturate at 100% (accepted tradeoff).
`src/services/calculations.ts` (`BOND_CRITICAL_FRAC`,
`bondGaugeScaleMax`); call site `src/components/sam-table/sam-table.tsx`.

### Breakdown table grammar — one 3-col model

One uniform column model per `<table>`; never mix `CalcRow` (3-col) and
`RevRow` (4-col). Unit rules, no exceptions:

- **PMPE / epochs / named quantities** → declared once as the
  `SectionHeader` `unit` (right-aligned, `font-mono normal-case`); rows
  carry no suffix.
- **SOL** → inline suffix on the value, NEVER a header.
- **%** → inline annotation beside the value, NEVER a header.
- A column never mixes value kinds.

Row weights: plain = no flags; sub-total = `severity` only (dot carries
signal, never with `bold`); section conclusion = `separator + bold +
large`; total = `total`. `src/components/breakdowns/row.tsx`.

### Attention dot persistence

Per-tab attention dot (`w-1.5 h-1.5 rounded-full`,
critical→destructive / warning→warning / info→info) **persists on the
active tab and pulses** (`active && 'animate-pulse'`) — it never vanishes
when the tab is opened. `src/components/validator-detail/validator-detail.tsx`.

### Decorative borders

NEVER `border-l` / left-border accent bands on any element. Status is
carried by colour token + dot + glyph, not by a coloured edge.
```

---

## Alphabet

Each entry: **what it is** · **the one rule** · **where it lives**.

### Surfaces & semantic colour
See `CLAUDE.md` "Surfaces" and "Status & intent" tables. Tokens defined
in `src/index.css` (`:root` + `.dark` overrides only where the value
differs), exposed to Tailwind via `@theme`. **Rule:** always the semantic
class (`bg-card`, `text-destructive`, …) — never raw hex/hsl, never
inline `var(...)`, never arbitrary `text-[var(--…)]`.

### CSS_* escape hatch
`CSS_PRIMARY`, `CSS_DESTRUCTIVE`, `CSS_WARNING`, `CSS_INFO`,
`CSS_STATUS_YELLOW`, `CSS_MUTED`, … — bare `var(--…)` strings, no hex
fallback. **Rule:** use ONLY when the colour is chosen at runtime from
JS state and a Tailwind class can't reach (inline `style`). Source:
`src/css.ts` (note: not `src/lib/utils.ts`).

### Severity axis (colour)
`getTipStyle(urgency)` → `{color, bg}`: `TipUrgency.CRITICAL`=destructive,
`WARNING`=warning, `INFO`=info, `POSITIVE`=primary, `NEUTRAL`=muted. The
breakdown status banner uses the parallel `CardStatusTone: red | yellow
| green | grey`; they agree by construction (`bondAdvice` returns both,
and `tipBannerTone` in `breakdowns/card.tsx` resolves any
`ValidatorTip` → tone). The `grey` tone is paired with
`TipUrgency.NEUTRAL` (below-min bond with no pending fee — eligibility,
not urgency). **Rule:** colour encodes severity ONLY — never the lever.
`src/services/tip-engine.ts`, `src/components/breakdowns/card.tsx`.

### Lever axis (glyph)
`getTipIcon(tip)` switches on `tip.constraint` (`TipConstraint` enum):
`BOND`→ICON_BOND, `BID`/`RANK`→ICON_BID (same lever, same glyph),
`CAP`→ICON_CAP, `NONE`→directional up/down/right keyed off signed
`delta`. **Rule:** glyph encodes which knob to turn — orthogonal to
colour; only `TipConstraint.NONE` is allowed a directional glyph (it
is the sole lever-less case where stake trajectory is the only signal
left). `src/services/tip-engine.ts`.

### CTA dispatch (one source per lever)
Five CTA helpers in `src/services/tip-engine.ts`, each owning one lever's
text + urgency end-to-end: `bondCta`, `bidCta`, `outOfSetCta`, `capCta`,
`deltaCta`. `outOfSetCta` fires only when the validator is out-of-set
despite `revShare.totalPmpe ≥ winningTotalPmpe` — it names the actual
binding reason instead of letting `deltaCta` lie with a "Losing N SOL"
symptom. Reasons are checked in source order: samBlocked → opted-out
(`maxStakeWanted === 0`, pinned to INFO regardless of stake) →
`samEligible === false` (narrowed to no-bond when `bondBalanceSol == null`,
then to blacklisted, then to a generic "client version / vote credits"
hint) → binding cap → generic "another constraint binds". Severity
tracks `marinadeActivatedStakeSol` against the 10k `NON_TRIVIAL_STAKE_SOL`
line — critical above, neutral below; the cap branch reads warning above
the line, info below.
`selectTip` sorts surviving candidates by `SEVERITY_ORDER` first
(critical→warning→info→positive→neutral), then `LEVER_ORDER`
(bond→bid/rank→cap→none) as the tiebreak. **Rule:** never reword a CTA
at a call site; the helper is the canonical source for the sam-table
Next Step pill, the validator-detail header tip and the matching
breakdown status banner — they surface the same string byte-for-byte
for a given state.

### Octagon alert glyph
`ICON_ALERT` — stop-sign octagon, exclamation inside. **Rule:** the ONLY
severity-driven glyph; shown ONLY when `tip.alert === true` (an estimated
bond risk fee this epoch). Below-min / no-bond stay critical-red but keep
their constraint glyph — no escalation.
`src/components/icons/icon-alert.tsx`,
gated in `getTipIcon` / `getValidatorTip`.

### Tip glyph set (7)
bond, bid, cap, alert, up, down, right. **Rule:** all `viewBox 0 0 12
12`, uniform `width=height=14.4`. No `rank` glyph —
`TipConstraint.RANK` reuses ICON_BID because both `BID` and `RANK`
point at the same lever (raise the bid).
`src/components/icons/icon-*.tsx`.

### Phantom icon slot
Fixed `w-4 h-4` centred container wrapping the tip glyph in the Next
Step pill. **Rule:** glyph variance must never shift pill margins or
column alignment — reserve identical space regardless of glyph.
`src/components/sam-table/sam-table.tsx`.

### Gauge (track + fill + marker + band)
`Gauge` — one presentational primitive, sizes `sm`/`lg`. Fill =
`clamp(value/scaleMax, 4%, 100%)`. `marker` and `criticalBand` are
fractions of the **track** (0..1), independent of fill. **Rule:**
critical band & threshold marker scale with the track, fill scales with
the value range — never couple them. Bond pill derives geometry from
live SDK config via `bondGaugeScaleMax(config) = minBondEpochs /
BOND_CRITICAL_FRAC` (`= 5 × minBondEpochs`), with
`marker = criticalBand = BOND_CRITICAL_FRAC = 0.2`.
`src/components/gauge/gauge.tsx`,
`src/services/calculations.ts`; call site
`src/components/sam-table/sam-table.tsx`.

### Bond chip
`BOND_CHIP[state]` → `{chip, dot, bar, shortText, label}`, keyed by the
`BondHealthState` enum (`src/services/bond-health.ts`:
`NO_BOND`/`CRITICAL`/`WATCH`/`SOFT`/`HEALTHY`). Tones: `NO_BOND` and
`CRITICAL` = destructive ("No bond" / "Critical"), `WATCH` = warning
("Watch"), `SOFT` = secondary+muted ("Adequate"), `HEALTHY` = primary
("Healthy"). **Rule:** chip, dot, gauge bar and runway all derive from
the single `bondHealth` tier — they can never contradict.
`src/components/sam-table/sam-table.tsx`.

### Bond-coverage heatmap tiers
`bg-bond-{none,low,mid,high,full}`. **Rule:** these five fixed HSL tiles
are the bonds-page heatmap ONLY — do not reuse for status. Defined
`src/index.css`.

### Breakdown 3-col table grammar
`CalcRow` (label | meta | value) and `RevRow` (label | pct | pmpe |
value) share `rowStyle`. **Rule, one model per `<table>`:**
- PMPE / epochs / named units → `SectionHeader` `unit` (declared once,
  right-aligned over the value column); rows carry no suffix.
- SOL → inline suffix on the value, never a header.
- % → inline annotation, never a header.
- One column never mixes value kinds; never mix `CalcRow` with `RevRow`.

Row weight grammar: plain = no flags; sub-total = `severity` only (the
`Marker` dot carries the signal, never combined with `bold`); section
conclusion = `separator + bold + large`; total = `total` (implies all +
divider above). `src/components/breakdowns/row.tsx`.

### SectionHeader
Uppercase, tracked, muted, dashed bottom border; optional right-aligned
`unit` in `font-mono normal-case`. **Rule:** the `unit` slot declares
ONLY non-SOL, non-% units (PMPE, epochs). `src/components/breakdowns/row.tsx`.

### Marker dot (breakdown)
`w-1.5 h-1.5 rounded-full` — red=destructive, yellow=status-yellow,
green=primary. **Rule:** the sub-total signal carrier; mutually
exclusive with bold (bold is reserved for conclusions/totals).
`src/components/breakdowns/row.tsx`.

### Attention dot (detail tabs)
`w-1.5 h-1.5 rounded-full` — critical=destructive, warning=warning,
info=info. **Rule:** persists on the active tab AND pulses
(`active && 'animate-pulse'`); never vanishes on open. Each tone reuses
an existing severity source (no new colour, no new fetch). Dispatch in
`tabAttention()` is an exhaustive `Record<TipConstraint, Tab | null>`:
`BOND` → Bond tab, `BID` → Bid Penalty tab (the in-set penalty is the
"raise the bid" math), `RANK` → Bidding tab (out-of-set "raise the
static bid to qualify" lever), `CAP`/`NONE` → no dedicated tab.
A new `TipConstraint` value is a compile error until the map is filled.
`src/components/validator-detail/validator-detail.tsx`.

### Alert/pulse dot (table row)
`w-1.5 h-1.5 rounded-full bg-destructive animate-pulse` trailing the
validator name when bond runway ≤5ep or utilisation ≥85%. **Rule:** same
pulse idiom as the detail tab dot — a present-danger signal, not
decorative. `src/components/sam-table/sam-table.tsx`.

### StatusBanner (shared primitive)
`StatusBanner` in `src/components/breakdowns/card.tsx` — rounded pill,
status text on the left, optional action pill on the right
(`bg-card/55` fill + tone-coloured border/text). Used both by every
`CalcCard`'s status slot AND by the validator-detail header tip banner;
both surfaces are byte-aligned. `CardStatusAction.tone` can override the
pill colour independently — sim-jump pills pin to yellow across all
banner tones, so the simulation affordance reads consistently. **Rule:**
never render a bespoke status pill inline — route through
`StatusBanner` so banner-level chrome stays one shape, one set of tone
classes (`STATUS_CLASSES` × `STATUS_ACTION_CLASSES`). The
`withSimAction(base, onGoToSim)` helper (same file) is the one canonical
way to attach a "Simulate →" action to a status — every breakdown card
that links to the sim panel (bidding, payments, bond-coverage) routes
through it so the yellow sim-jump pill stays uniform.

### Simulation surfaces
`ring-status-yellow` inset ring around the table + a status-yellow
banner with a pulsing dot; ghost rows `opacity-40 line-through
bg-muted/30`. **Rule:** status-yellow is the single "simulated / not
live" signal — don't reuse status-yellow for live status in the same
view. `src/components/sam-table/sam-table.tsx`,
`src/index.css` (`header-glow`, `sim-*` tokens).

### Typography scale
`text-[10px]` (glanceable meta) · `text-xs` 12px (table cells, meta
labels) · `text-[13px]` (emphasised secondary, tab labels) · `text-sm`
14px (primary row text) · `text-base`+ (headings). **Rule:** no
off-scale arbitrary sizes (`text-[11px]` etc.) for primary or
interactive content. Defined per-component; baseline in `CLAUDE.md`.

### Charts
`bg-chart-1 … bg-chart-5` fixed sequence for stacked bars / pie
segments. **Rule:** stable ordered palette — not status colours.
`src/index.css`.

### Decorative borders
**Rule:** NEVER `border-l` / left-edge accent bands on any element
(persistent memory rule). Status reads from token + dot + glyph, never a
coloured edge. (No committed `border-l` accent found — rule holds.)

### Motion vocabulary
`pulse` (present danger / live), `spin` (loading), `anchor-flash`
(deep-link target, warning-light fade), `header-glow` (simulation
header), sheet slide/fade (detail panel). **Rule:** `pulse` means "act
now / live"; do not use it decoratively. Keyframes in `src/index.css`.

---

## Honesty notes (could not fully confirm in committed code)

- **Attention-dot persistence** lives in
  `validator-detail.tsx` (detail-panel TabStrip), confirmed in committed
  code (lines 141–149: `active && 'animate-pulse'`). The brief mentioned
  the nav; the committed `src/components/navigation/navigation.tsx` has
  **no** attention dots — the persist+pulse rule applies to the
  validator-detail tab strip only. (`navigation.tsx` is modified in the
  working tree per `git status`; this doc reflects committed HEAD.)
- **CSS_* constants** are in `src/css.ts`, **not** `src/lib/utils.ts`
  (that path does not exist). `src/css.ts` exports no `CSS_STATUS_GREEN`
  inline-light variant beyond what's listed; `getBondAdviceStyle` uses
  `CSS_STATUS_YELLOW` + `CSS_STATUS_YELLOW_LIGHT`.
- "No left-border accent" is enforced by the memory rule; no committed
  decorative `border-l` was found to contradict it (the only `border-l*`
  uses are table grid lines / dividers, not status accents).
- The "14.4px / viewBox 0 0 12 12" icon sizing is confirmed across the
  seven tip glyphs (`icon-bond`, `icon-bid`, `icon-cap`, `icon-alert`,
  `icon-up`, `icon-down`, `icon-right`).
