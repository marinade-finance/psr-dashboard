# Playwright E2E Coverage Matrix — PSR Dashboard

Audit performed against `tests/*.spec.ts` and `SCREENS.md`. Visual snapshot
suites (`visual.spec.ts`, `visual-responsive.spec.ts`) are excluded from the
matrix — they are pure-snapshot regression and owned by the user.

## Run summary (2026-05-17 landing)

- **8 new spec files**, 32 new tests, 32/32 passing.
- Full `pnpm test:e2e` with `--ignore-snapshots`:
  **304 passed, 36 failed, 1 skipped** of 341 (53 min wall).
- All 36 failures are **pre-existing** — verified by reverting the
  redelegation/refactor commits and rerunning `simulation-cycle.spec.ts`:
  same 2 failures, so the regressions are not from this thread. They
  cluster on `detail-sheet-tabs.spec.ts` content (14, mostly looking
  for `bid-too-low penalty` text mid-evolution on a separate branch),
  epoch-picker locator drift in `events*.spec.ts` (5), the same
  modal-overlay vs `Reset Simulation` collision we worked around in
  the new `detail-sheet-deep-flow.spec.ts` (2 in
  `simulation-cycle.spec.ts`), plus assorted pre-existing
  `sam-table-columns`, `bonds-table`, `validator-identity`,
  `nav-consistency`, `help-tip`, `docs-deep`, `visual-responsive`
  drift (13). Not addressed in this round.

**Legend:** `Y` = covered · `~` = partial · `-` = gap · `n/a` = not
applicable (feature does not expose this interaction).

| Feature                          | Smoke | Sort | Filter | Hover | Click-through | Keyboard | Mobile | Dark | A11y |
| -------------------------------- | ----- | ---- | ------ | ----- | ------------- | -------- | ------ | ---- | ---- |
| Navigation (tabs / logo / docs)  | Y     | n/a  | n/a    | Y     | Y             | -        | -      | Y    | Y    |
| SAM headline metrics + tiles     | Y     | n/a  | n/a    | ~ (1) | -             | n/a      | -      | n/a  | Y    |
| SAM concentration popover        | -     | n/a  | n/a    | -     | n/a           | n/a      | -      | n/a  | -    |
| SAM table — columns              | Y     | Y    | n/a    | n/a   | Y             | -        | Y      | n/a  | ~    |
| SAM table — winning-set divider  | Y     | n/a  | n/a    | n/a   | n/a           | n/a      | n/a    | n/a  | n/a  |
| SAM table — row click / detail   | Y     | n/a  | n/a    | n/a   | Y             | - (2)    | n/a    | n/a  | Y    |
| SAM table — penalty badges       | Y     | n/a  | n/a    | -     | -             | n/a      | n/a    | n/a  | Y    |
| Validator detail — tabs          | Y     | n/a  | n/a    | n/a   | Y             | -        | n/a    | n/a  | ~    |
| Validator detail — deep link ?v= | Y     | n/a  | n/a    | n/a   | Y             | Y (Esc)  | n/a    | n/a  | Y    |
| Validator detail — close ways    | Y     | n/a  | n/a    | n/a   | Y             | Y (Esc)  | n/a    | n/a  | Y    |
| Validator detail — simulation    | Y     | n/a  | Y      | n/a   | Y             | -        | n/a    | n/a  | Y    |
| Simulation cycle (ghost rows)    | Y     | n/a  | n/a    | n/a   | Y             | -        | n/a    | n/a  | Y    |
| Bonds page — coverage hero       | Y     | n/a  | n/a    | n/a   | n/a           | n/a      | n/a    | n/a  | n/a  |
| Bonds page — tile map            | Y     | n/a  | n/a    | Y     | n/a (3)       | n/a      | -      | n/a  | -    |
| Bonds page — table               | Y     | Y    | -      | -     | n/a (4)       | -        | -      | n/a  | ~    |
| Bonds page — Expert column       | Y     | n/a  | n/a    | n/a   | n/a           | n/a      | n/a    | n/a  | n/a  |
| Protected Events — metrics tiles | Y     | n/a  | n/a    | -     | n/a           | n/a      | -      | n/a  | n/a  |
| Protected Events — table         | Y     | Y    | Y      | n/a   | n/a (4)       | -        | -      | n/a  | ~    |
| Protected Events — epoch picker  | Y     | n/a  | Y      | n/a   | Y             | -        | -      | n/a  | -    |
| Protected Events — badges        | Y     | n/a  | n/a    | n/a   | n/a           | n/a      | n/a    | n/a  | n/a  |
| Docs — basic / expert tabs       | Y     | n/a  | n/a    | n/a   | Y             | -        | n/a    | n/a  | Y    |
| Docs — anchor links              | Y     | n/a  | n/a    | n/a   | Y             | n/a      | n/a    | n/a  | n/a  |
| Docs — external links            | Y     | n/a  | n/a    | n/a   | -             | n/a      | n/a    | n/a  | n/a  |
| Jump search — dropdown           | Y     | n/a  | Y      | -     | Y             | Y        | n/a    | n/a  | Y    |
| Jump search — bypass filter      | Y     | n/a  | n/a    | n/a   | Y             | n/a      | n/a    | n/a  | n/a  |
| Expert toggle                    | Y     | n/a  | n/a    | n/a   | n/a           | n/a      | n/a    | n/a  | n/a  |
| Banner persistence               | Y     | n/a  | n/a    | n/a   | Y             | n/a      | n/a    | n/a  | Y    |
| Theme toggle persistence         | Y     | n/a  | n/a    | n/a   | Y             | n/a      | n/a    | n/a  | Y    |
| HelpTip discoverability          | Y     | n/a  | n/a    | Y     | n/a           | n/a      | n/a    | n/a  | n/a  |
| ValidatorIdentity consistency    | Y     | n/a  | n/a    | Y     | n/a           | n/a      | Y      | n/a  | n/a  |
| URL ?v= sync (push / pop / back) | ~ (5) | n/a  | n/a    | n/a   | Y             | Y (Esc)  | n/a    | n/a  | n/a  |
| Error state                      | Y     | n/a  | n/a    | n/a   | n/a           | n/a      | n/a    | n/a  | n/a  |

Footnotes:

1. The HelpTip suite covers stat-card hover tooltips, but the metric tiles'
   own click / focus behaviour (e.g. focus ring) is not exercised.
2. SAM rows are keyboard-activatable (`role="button"` + `tabIndex=0`,
   Enter / Space handlers) — no test currently exercises the keyboard path.
3. Bonds tiles are non-clickable by design (hover-only tooltip).
4. Bonds / events rows are non-clickable by design.
5. Initial page render with `?v=` is covered; the URL push after a row
   click is covered for SAM. Browser-back is covered. The
   `replaceState`-style update when a different validator is opened from
   the search dropdown while the sheet is already open is not asserted.

## Gaps addressed in this round

The following gaps map to real user flows that go untested today.
Each one ships with one new spec file under `tests/`:

- **`sam-row-keyboard.spec.ts`** — keyboard activation of a row
  (Tab → Enter / Space opens the sheet; ArrowDown / focus path follows).
- **`sam-bond-sort.spec.ts`** — sorting by Bond and Stake/Δ columns
  actually reorders rows correctly (not just a header indicator flip);
  also asserts the default sort and that a fresh page load yields the
  defaulted order.
- **`concentration-popover.spec.ts`** — Top Country / Top ASO
  hover-popover reveal, full ranked table inside the popover, the cap
  marker `N% cap` label, and the close-on-mouseleave behaviour.
- **`bonds-tile-deep-link.spec.ts`** — tile hover tooltip carries the
  validator name + stake + coverage, AND there is **no** click
  navigation off a tile (regression guard — the bonds tile is
  intentionally non-interactive).
- **`detail-sheet-deep-flow.spec.ts`** — combined flow: open from
  jump-search → switch tabs (Payments → Bidding → Bond) → close via X
  → URL ?v= is cleared. Also asserts the `Remove from simulation` and
  `Reset Simulation` buttons coexist correctly across an edit.
- **`events-clear-filters.spec.ts`** — combining the validator filter
  with the epoch picker, then clearing both, returns the full row set.
  Also asserts the filtered-subline appears whenever any filter is
  active (validator OR epoch), and disappears when both are cleared.
- **`url-state-cycle.spec.ts`** — opening a row pushes `?v=`, opening
  a SECOND validator while the sheet is open swaps `?v=` (no extra
  history entry), browser-back returns to the first validator, second
  back closes the sheet. Validates the URL-driven detail sync.
- **`docs-cross-link.spec.ts`** — a `Guide →` card link on the SAM
  detail sheet navigates to `/docs#...` (basic mode) and
  `/expert-docs#...` (expert mode) and lands on the right anchor.

## Gaps NOT addressed (logged here, not coded)

- **Mobile sort indicators on SAM table.** SCREENS.md says the table is
  horizontally scrollable on narrow viewports; existing tests assert
  scroll geometry but not that sort still works under mobile dragging.
  Not worth a test — the headers are the same DOM nodes.
- **Notifications tab visibility on SAM detail sheet.** Tab is conditional
  on `validator.notifications.length > 0`. The fixture set has no
  notifications. To test we'd need a fixture validator with a notification
  payload and a corresponding wiring in `TestSamPage`. Would require a
  fixture change → out of scope per the "no feature changes" rule.
- **Banner accessibility for screen readers.** No `aria-live` is set on
  the announcement region today — feature gap, log as ISSUE not test.
- **APY composition Bidding tab CTA click.** The `-X% vs winning →
  Bidding` button on the APY card flips the panel to the Bidding tab.
  Covered partially by tab-switching tests; the *trigger from the APY
  card* specifically is not asserted. Low value — the underlying
  switch is exercised by the manual tab-click test.
- **Dark-mode-only assertions** (e.g. token contrast). Visual snapshot
  suite (owned by user) handles this domain. Adding a non-snapshot dark
  assertion would just shadow what `theme toggle persistence` already
  covers.
- **A11y axe-core scan.** Out of scope — no a11y tooling installed and
  the brief asks for interaction tests, not full a11y audits.

## Gaps discovered while landing the suite

These are real-feature-vs-test mismatches found when iterating on the
new specs. They are NOT bugs to fix; just behaviours worth knowing about.

- **Search-while-sheet-open** — typing in the jump-search input while
  the validator detail sheet is open does NOT open the autocomplete
  dropdown. The Radix Dialog's modal portal sets `pointer-events: none`
  on the rest of the document and renders the dropdown beneath the
  modal overlay. The `url-state-cycle` "swap" test originally tried
  this flow; rewritten to close-then-reopen, which is the realistic
  user path.
- **Reset Simulation pill visibility while sheet open** — the
  "Reset Simulation" banner sits on the SAM table behind the modal
  overlay; Playwright's `toBeVisible` reports it as not visible while
  the sheet is open. The `detail-sheet-deep-flow` "simulate-then-reset"
  test now closes the sheet first before asserting the pill — matches
  the realistic flow (user toggles simulation, closes the sheet,
  decides to reset all).
- **Tab-strip button name collides with Overview card title** —
  Overview tab's "Bond" / "Payments" / "Bidding" CalcCard titles are
  rendered as buttons (they're click-to-jump-to-tab), so
  `getByRole('button', { name: 'Bond', exact: true })` is non-strict.
  All tab clicks in the new suite use `.first()` to disambiguate to
  the TabStrip button.
- **Bond / Stake header click hits HelpTip center** — the column
  headers contain a `HelpTip` whose `onClick={e.stopPropagation()}` is
  a sibling of the sortable region. Clicking the header at its default
  center can land on the HelpTip and not trigger sort. The
  `sam-bond-sort` suite passes `{ position: { x: 10, y: 10 } }` to
  click the left edge where the text label sits.
- **Multi-segment sort order on SAM table** — the table partitions
  into above-cutoff and below-cutoff and sorts each independently, so
  the overall value sequence has at most one direction break between
  segments. The `sam-bond-sort` monotonic helper allows one break;
  toggle tests assert order/indicator flip instead of strict
  asc-vs-desc detection.
