# Visual Language — Elements Alphabet

The canonical, deduplicated set of visual primitives for the PSR Dashboard
and the one rule that governs each. Ground truth is the committed
code; every entry cites its file.

---

## Alphabet

Each entry: **what it is** · **the one rule** · **where it lives**.

### Surfaces & semantic colour
Tokens defined in `src/index.css` (`:root` + `.dark` overrides only where
the value differs), exposed to Tailwind via `@theme`. New colours go
through `src/index.css` — never added inline. No CSS Modules;
`src/index.css` holds tokens, the global transition rule, and keyframe
animations only. **Rule:** always the semantic class (`bg-card`,
`text-destructive`, …) — never raw hex/hsl, never inline `var(...)`,
never arbitrary `text-[var(--…)]`.

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
`marker = criticalBand = BOND_CRITICAL_FRAC = 0.2` — confirmed in the
rendered DOM: track `56×4 px`, critical band child `width: 20%`
(`bg-destructive/15`), marker child `left: 20% / w-0.5 / inset-y-[-2px]`
spans `2×8 px` vertically beyond the track, fill `width: <pct>%`. Used
ONLY in the SAM-table bond pill and the epoch-meter today — concentration
tiles do NOT route through `Gauge`, they render a coloured value text
only. `src/components/gauge/gauge.tsx`,
`src/services/calculations.ts`; call sites
`src/components/sam-table/sam-table.tsx`,
`src/components/epoch-meter/epoch-meter.tsx`.

### Bond chip
`BOND_CHIP[state]` → `{chip, dot, bar, shortText, label}`, keyed by the
`BondHealthState` enum (`src/services/bond-health.ts`:
`NO_BOND`/`CRITICAL`/`WATCH`/`SOFT`/`HEALTHY`). Tones: `NO_BOND` and
`CRITICAL` = destructive (`bg-destructive-light text-destructive`, dot
`bg-destructive`, gauge fill `bg-destructive`), `WATCH` = warning
(`bg-warning-light text-warning`, dot/fill `bg-warning`), `SOFT` =
secondary+muted (`bg-secondary text-muted-foreground`, dot/fill
`bg-muted-foreground`, label "Adequate"), `HEALTHY` = primary
(`bg-primary-light-10 text-primary`, dot/fill `bg-primary`). The chip dot
is `w-[7px] h-[7px]` — slightly larger than the 6px attention/marker dot
elsewhere — so chip and gauge tone read together at a glance. **Rule:**
chip, dot, gauge fill and runway all derive from the single `bondHealth`
tier — they can never contradict.
`src/components/sam-table/sam-table.tsx`.

### Bond-coverage heatmap tiers
Five fixed HSL tokens — `--bond-none` / `--bond-low` / `--bond-mid` /
`--bond-high` / `--bond-full` — applied via inline `style={{ background:
'var(--bond-…)' }}` on the heatmap tiles and legend swatches. The
matching `--color-bond-*` aliases are exposed to Tailwind in `@theme` but
the heatmap does NOT use `bg-bond-*` classes; tile sizing varies per
stake, so the colour ships inline alongside `width`/`height`. **Rule:**
these five tiles are the bonds-page heatmap ONLY — do not reuse for
status. Tokens in `src/index.css`; call site
`src/components/validator-bonds-table/validator-bonds-table.tsx`
(`tileColor()` + the legend swatches).

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
`w-1.5 h-1.5 rounded-full shrink-0` — critical=destructive,
warning=warning, info=info. The dot renders on every tab whose
`attention[tab]` tone is set, regardless of which tab is active; on the
active tab it ALSO gets `animate-pulse` (`active && 'animate-pulse'`) so
the carrier-tab signal stays visible after the user opens it — confirmed
in the live tab strip across Bond and Notifications. Each tone reuses an
existing severity source (no new colour, no new fetch). The six tabs
served are Overview, Notifications, Payments, Bidding, Bond, Bid Penalty
— attention is populated by `tabAttention()` from four independent
triggers: bondHealth → Bond, bidPenaltySol > 0 → Bid Penalty,
notifTone → Notifications, then the header tip's `TipConstraint` adds a
soft info dot on the matching tab (`BOND` → Bond, `BID` → Bid Penalty,
`RANK` → Bidding, `CAP`/`NONE` → no dedicated tab) if that tab has no
stronger tone already. `src/components/validator-detail/validator-detail.tsx`.

### Alert/pulse dot (table row)
`w-1.5 h-1.5 rounded-full bg-destructive animate-pulse` trailing the
validator name when bond runway ≤5ep or utilisation ≥85%. **Rule:** same
pulse idiom as the detail tab dot — a present-danger signal, not
decorative. `src/components/sam-table/sam-table.tsx`.

### StatusBanner (shared primitive)
`StatusBanner` in `src/components/breakdowns/card.tsx` — `rounded-lg
px-3 py-2 text-sm` row, tone fill `bg-{tone}-light text-{tone}` (red →
`bg-destructive-light` at `rgba(248,113,113,0.15)`, yellow →
`bg-warning-light` at `rgba(251,146,60,0.15)`, green →
`bg-primary-light-10`, grey → `bg-muted/40`), status text on the left,
optional action pill on the right (`bg-card/55` fill + tone-coloured
border/text). Used both by every `CalcCard`'s status slot AND by the
validator-detail header tip banner; both surfaces are byte-aligned —
confirmed by inspecting the rendered DOM (same class list, same
computed `background-color` / `border-radius` on a banner shown in the
detail header vs the same banner re-emitted inside the breakdown card). `CardStatusAction.tone` can override the
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
`text-2xs` 10px (glanceable meta — cell sub-labels, axis ticks) · `text-3xs`
11px (epoch-meter micro ticks only) · `text-xs` 12px (table cells, meta
labels) · `text-mid` 13px (emphasised secondary, tab labels) · `text-sm`
14px (primary row text) · `text-base`+ (headings). **Rule:** named tokens
only — NEVER `text-[Npx]` arbitrary sizes. Tokens declared in
`src/index.css` `@theme` (`--text-2xs/3xs/mid`).

### Radius scale
`rounded-xs` (.125rem) · `rounded-sm` (.25rem) · `rounded-md` /
`rounded-lg` (.5rem, intentionally equal — matches Marinade app) ·
`rounded-xl` (.75rem) · `rounded-2xl` (1rem) · `rounded-3xl` (1.5rem) ·
`rounded-full` (pills/dots). Tokens in `src/index.css` `@theme`
(`--radius-*`). Existing components use `rounded-md/lg/full`; the wider
scale is available for future shadcn primitives.

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

## Honesty notes (rendered-browser audit)

Verified against the live preview server (`pnpm preview` on `/test-` and
`/test-bonds`, viewport 1440×900, dark mode) — quoted values are
computed-style readings, not source-level assertions.

- **Attention dot persists AND pulses on the active tab** — confirmed.
  Clicked Bond and Notifications; both rendered the dot as
  `w-1.5 h-1.5 rounded-full shrink-0 bg-destructive animate-pulse` while
  active, dropping the `animate-pulse` class once another tab was
  selected. The dot renders on every attention-flagged tab regardless of
  active state — only the pulse is active-only.
- **Tip glyph sizing** — confirmed `width="14.4" height="14.4"
  viewBox="0 0 12 12"` across every tip-pill `svg` in the SAM table.
  Other SVGs on the page (the Marinade logo, the chevron, the `?` help
  glyph) use different sizes and viewboxes; the 14.4px rule applies to
  the seven tip glyphs only.
- **Bond gauge geometry** — track `56 × 4 px`, critical band 11/56 ≈
  20%, marker at `left: 20%` with `inset-y-[-2px] w-0.5` (i.e. 2×8 px),
  fill swings between `4%` (Critical) and `100%` (Healthy/Watch/Soft).
  Confirms `BOND_CRITICAL_FRAC = 0.2` and the clamp.
- **Bond chip dot is 7px, not 6px** — `w-[7px] h-[7px]`. The detail-tab
  attention dot and the SAM-row alert dot are `w-1.5 h-1.5` (6px). Two
  sibling primitives, deliberately different — flagged in the bond-chip
  entry.
- **Bond heatmap uses inline `var(--bond-*)` background, NOT
  `bg-bond-*` classes** — the heatmap tiles render with computed bg
  `rgb(115, 38, 38)` (low) / `rgb(66, 69, 77)` (none), supplied by
  `tileColor()` in `validator-bonds-table.tsx`. The Tailwind aliases
  exist in `@theme` but no element on the bonds page uses them. Entry
  rewritten to reflect that.
- **Concentration tiles do NOT use the `Gauge` primitive** — Top
  Country / Top ASO render `text-destructive` numeric value + capped
  marker text, no track/fill geometry. The shared Gauge ships in the
  SAM-table bond pill and the epoch-meter only.
- **StatusBanner shape** — confirmed identical class list and computed
  styles when shown in the validator-detail header AND when re-emitted
  via `withSimAction()` inside a breakdown card (same `rounded-lg px-3
  py-2 text-sm`, same `bg-destructive-light` at
  `rgba(248,113,113,0.15)`).
- **Simulation surface** — could NOT trigger sim from the deterministic
  `/test-` fixtures (no commission/bid editors render with default
  state, no `?sim=1` URL hook). The `ring-2 ring-inset
  ring-status-yellow`, `header-glow` keyframe, and `--sim-*` tokens are
  defined in source (`sam-table.tsx`, `sam-table.module.css`,
  `src/index.css`) and the entry stands on that evidence; visual proof
  of the inset ring + ghost rows would need an e2e flow that enters
  simulation mode.
- **CSS_* constants** are in `src/css.ts`, **not** `src/lib/utils.ts`
  (that path does not exist). `src/css.ts` exports no
  `CSS_STATUS_GREEN` inline-light variant beyond what's listed;
  `getBondAdviceStyle` uses `CSS_STATUS_YELLOW` + `CSS_STATUS_YELLOW_LIGHT`.
- **No `border-l` accent** — none observed in any rendered surface; the
  rule holds.
