---
status: draft
---

# Product analytics — Mixpanel page, dwell, and interaction tracking

**Why:** today the app fires only a bare GTM pageload (`src/index.tsx:25-29`,
`gtmId: GTM-TTZLQF7`) — no SPA route changes, no dwell, no interaction events.
We can't answer the questions we actually have: which views get visited and how
often, what people spend time looking at, and how they interact with what's
shown — ideally per user. Mixpanel is already provisioned; the work is the event
taxonomy, identity model, and a thin typed wrapper, not the SDK.

Design the taxonomy **backward from the four questions**:

| Question                          | Answered by                                      |
| --------------------------------- | ------------------------------------------------ |
| Which views, how often            | `page_viewed`, `validator_opened`                |
| What people spend time looking at | `view_left` `duration_ms` (page + detail tab)    |
| How they interact                 | interaction events below                         |
| Per user                          | Mixpanel device `distinct_id` (+ identity, below)|

## Event taxonomy

Names are `snake_case` verbs; every event carries the super-properties
(below) plus its own props. Designed so a small set of funnels covers all four
questions — resist adding events that no funnel reads.

**Views & frequency**

- `page_viewed` `{ page: 'sam'|'bonds'|'protected_events'|'docs', path }` —
  fired on **every** react-router navigation, not just first load (GTM misses
  SPA transitions). This is the core "which pages, how often" event.
- `validator_opened` `{ vote_account, rank?, bond_tier?, source: 'table'|'deep_link' }`
  — the detail sheet is a `?v=` deep-link, not a route, so it needs its own
  event. `source` separates organic clicks from shared links.
- `detail_tab_viewed` `{ tab: 'overview'|'notifications'|'payments'|'bidding'|'bond'|'penalty', vote_account }`
  — which tabs operators actually open.

**Dwell — what gets attention**

- `view_left` `{ view, duration_ms, max_scroll_pct? }` — fired on route change,
  sheet close, and tab switch. `view` is the page, the `sheet:<voteAccount>`,
  or the `tab:<id>` being left. Use the Page Visibility API to **pause the
  timer while the tab is backgrounded** so idle dashboards don't inflate dwell.
- Prefer this explicit event over Mixpanel `time_event()` so page + tab dwell
  use one consistent mechanism.

**Interactions**

- `table_sorted` `{ column, direction, page }`
- `table_filtered` `{ active_filters: string[], result_count, page }`
- `validator_searched` `{ query_len, matched: bool }` — **never the raw query**
  (log length only; a search box can contain anything).
- `sim_run` `{ inputs_changed: string[], page }` and `sim_input_changed`
  `{ input: 'bid'|'bond'|... }` — the 5-input simulation panel
  (`validator-detail.tsx`, `sam-table.tsx`; see [[bond-as-sim-input]]).
- `cta_shown` / `cta_clicked` `{ lever, severity }` — the two orthogonal axes
  from `tip-engine.ts` (`getTipStyle` severity, `getTipIcon` lever). Highest-
  value signal: which CTAs actually drive action. Pull both off `selectTip`'s
  result at the render site; do not re-derive.
- `breakdown_expanded` `{ breakdown: 'bidding'|'bond'|'payments'|'penalty', vote_account }`
- `outbound_link_clicked` `{ target, from }` — docs/guide/external links.

**Super-properties** (attached to every event): `epoch` (current Solana
epoch), `is_simulation` (sim mode on?), `app_version`. Set once at init +
update on epoch change.

## Identity — "ideally per user"

No login exists, so true cross-device per-user is impossible; set that
expectation. The ceiling is:

- **Device-level** — Mixpanel's persisted anonymous `distinct_id` stitches
  repeat visits in the same browser. Gives returning-visitor rate, per-device
  retention, per-device funnels. This is the default and covers most of "per
  user."
- **Optional stronger identity** — if "My Validator" pin ([[4/1-my-validator-pin]],
  not yet built) lands, `identify(vote_account)` once an operator pins their own
  validator. Vote accounts are public on-chain ids, so this is acceptable —
  but it identifies the *operator's own* validator, not an arbitrary browsing
  identity. Mark as a follow-up gated on 4/1, not part of v1.

## Privacy / consent

- Vote accounts are public chain data → fine as event props.
- **Never** send raw search text; send `query_len` or a hash.
- If a consent banner exists, gate `mixpanel.init` behind it; if none exists
  today, that gap is called out here and owned before ship (EU consent).
- No precise geo beyond Mixpanel's default IP-derived country.

## Where (implementation pointers)

- `src/services/analytics.ts` (new) — typed `track(event, props)`, `init()`,
  `identify()`, `setSuperProps()`. The wrapper is thin: init, a no-op when not
  consented or `import.meta.env` flags test, and `track`. No logic at call
  sites beyond passing structured props (matches the services/ convention).
- `src/index.tsx` — `mixpanel.init` alongside the existing GTM init (:25); GTM
  stays for marketing tags. Add a router subscription for `page_viewed` +
  dwell-timer management (router defined at `src/index.tsx:81`).
- `src/services/tip-engine.ts` call sites — `cta_shown` / `cta_clicked` with
  `lever` + `severity`.
- `src/components/validator-detail/validator-detail.tsx` — sheet open/close,
  `setTab` (tabs at :107-112), breakdown expansions.
- `src/components/sam-table/sam-table.tsx` — sort / filter / search handlers.

## Constraints / out of scope

- **No analytics in tests.** `/test-*` routes and Playwright must fire zero
  events — gate the wrapper on an env flag so the suite stays deterministic.
- **Don't instrument `/expert-*`** — deprecated, being removed
  ([[2/1-remove-expert-routes]]).
- v1 ships device-level identity only; per-operator `identify()` is a
  follow-up gated on 2/15.

## Funnels this enables (taxonomy acceptance check)

- **Page popularity / frequency** — `page_viewed` count by `page`.
- **Attention** — median `duration_ms` of `view_left` per page and per tab.
- **Engagement funnel** — `validator_opened` → `sim_run` → `cta_clicked`.
- **Per-device retention** — returning `distinct_id` rate week over week.
