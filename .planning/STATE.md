# STATE.md - PSR Dashboard Terminal Redesign

## Current Position
- Branch: `ascii`
- SAM table (main page) already converted to terminal `<pre>` style with pipe separators
- Other pages still use HTML `<table>` and modern UI components

## Phase 1: Full Terminal Redesign
Status: PLANNING → EXECUTING

## Accumulated Decisions
- Single sandy background color: `#F5E6D3` — no card/nav/header differentiation
- Single text color: dark brown `#3D2B1F` with muted `#8B7355`
- No accent colors — everything monochrome brown
- Tables rendered as pre-formatted monospace text with `│` separators
- ASCII progress bars: `[████░░░░░░]`
- Health badges: `[OK]` `[WARN]` `[CRIT]`
- All fonts: monospace only
- No shadows, no rounded corners, no gradients
- Stats as inline text: `:: LABEL value`
- Mobile: horizontal scroll on terminal output, stacked stats
