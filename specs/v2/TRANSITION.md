# Tailwind + shadcn/ui Transition Spec

Two-phase migration. Phase 1: move everything to Tailwind utility classes
with minimal styling. Phase 2: add shadcn/ui components and visual polish.

## Current State

Infrastructure done, one component migrated:

- tailwindcss@3.4, postcss, autoprefixer, postcss-loader in webpack
- Webpack split: `.module.css` → CSS Modules, `.css` → postcss/Tailwind
- `tailwind.config.js` with color tokens + Inter font
- `cn()` utility in `src/lib/utils.ts`
- `sam-detail.tsx` already uses Tailwind classes (done by user)
- `sam.tsx` updated: passes `meta`, `isExpert`, `onEdit` to SamDetail
- `sam.ts` has `selectBondUtilization`, `selectSamActiveStake`,
  `selectSamTargetStake`, `selectStakeDelta`, `getRecommendation`

## Tailwind Color Palette

Use standard Tailwind slate scale, no custom tokens. Keeps classes short
and avoids tailwind.config bloat.

```
Page bg:       bg-slate-950 or bg-slate-900
Card bg:       bg-slate-900/60 or bg-slate-800/50
Elevated bg:   bg-slate-800
Text primary:  text-slate-100 or text-slate-200
Text muted:    text-slate-400
Text dim:      text-slate-500
Accent blue:   text-blue-500, bg-blue-500, border-blue-500
Accent green:  text-green-400
Accent yellow: text-yellow-400
Accent red:    text-red-400
Border:        border-slate-700/20 or border-slate-700/10
```

No custom `tailwind.config.js` color extensions needed — standard
Tailwind colors with opacity modifiers cover everything.

---

## Phase 1: Tailwind Classes Everywhere

Goal: replace every CSS Module import with Tailwind utility classes.
Minimal visual style — functional, readable, dark. No shadcn yet.

### 1.1 Global Styles (index.css)

Replace legacy CSS variables with Tailwind base:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-slate-950 text-slate-200 font-sans antialiased;
  }
}
```

Delete: `:root` variables, `*` reset, `html,body` rules.
Tailwind preflight handles box-sizing and margin reset.

### 1.2 Navigation (navigation.tsx)

Delete `navigation.module.css`. Replace with:

```
Bar:     flex items-center bg-slate-900 sticky top-0 z-50
Tab:     px-5 py-2.5 text-sm text-slate-400 rounded cursor-pointer
         hover:bg-slate-800 hover:text-slate-200 transition-colors
Active:  bg-slate-800 text-slate-100
Docs:    ml-auto (same tab styles)
Links:   no-underline
```

### 1.3 Banner (banner.tsx)

Delete `banner.module.css`. Replace with:

```
Outer:   px-4 pt-4
Inner:   bg-slate-800 border border-slate-700/30 rounded-lg p-5
         max-w-prose text-base leading-relaxed
Title:   font-semibold mb-4
Links:   text-blue-400 hover:underline
```

### 1.4 Metric + ComplexMetric

Delete `metric.module.css` and `complex-metric.module.css`.

```
Card:      bg-slate-800 p-4 cursor-help
Label:     text-slate-400 text-sm whitespace-nowrap
Value:     text-2xl mt-2 whitespace-nowrap
Subtitle:  text-xs text-slate-500 mt-1
```

Keep both components (Metric renders string value, ComplexMetric
renders JSX). Just swap CSS Module classes for Tailwind.

### 1.5 Loader

Delete `loader.module.css`. Recreate the `###...` animation in
Tailwind `@keyframes` via index.css `@layer components`:

```css
@layer components {
  .loader-shift::after {
    animation: shift 1s linear infinite;
    content: '';
    font-family: monospace;
  }
}
@keyframes shift {
  0%   { content: '###...'; }
  16%  { content: '.###..'; }
  32%  { content: '..###.'; }
  48%  { content: '...###'; }
  64%  { content: '#...##'; }
  80%  { content: '##...#'; }
  100% { content: '###...'; }
}
```

Loader component: `<div className="m-2.5 loader-shift">Loading </div>`

### 1.6 SAM Page Shell (sam.tsx)

Delete `sam.module.css`. Replace with:

```
Page:     bg-slate-950 min-h-screen
Content:  relative

Sim btn:  h-10 px-5 mx-1 my-1 rounded text-sm whitespace-nowrap
          transition-colors cursor-pointer border-none font-inherit
  Off:    bg-blue-500 text-white hover:bg-blue-600
  Active: bg-sky-500 text-white hover:bg-sky-600
  Calc:   bg-slate-600 text-slate-400 cursor-not-allowed
```

### 1.7 SAM Detail (sam-detail.tsx) — DONE

Already migrated to Tailwind by user. Uses slate-* scale, no CSS Module.
`sam-detail.module.css` can be deleted.

### 1.8 SAM Table Basic Mode (sam-table.tsx)

Replace `.basicTable` and related basic-mode classes with Tailwind.
Keep `.tableWrap`, simulation, ghost row, and position grading classes
in `sam-table.module.css` (expert mode stays).

```
Table:    w-full border-separate border-spacing-y-1 font-sans
THead TH: text-[11px] uppercase tracking-wide text-slate-400
          font-medium px-4 py-2
Row:      cursor-pointer transition-colors
TD:       px-4 py-3 bg-slate-900/60 border-y border-slate-700/10
          first:border-l-[3px] first:border-l-transparent
          first:rounded-l-lg last:rounded-r-lg
Row hover: hover:bg-blue-500/[0.04]
           first-child: hover:border-l-blue-500

Validator cell: flex flex-col gap-0.5
  Name:   text-sm font-medium text-slate-200
  Pubkey: text-[11px] text-slate-500 cursor-pointer hover:underline

Bond cell: flex items-center gap-1.5
  Dot:    w-2 h-2 rounded-full (green-400/yellow-400/red-400/slate-500)
  Label:  text-xs (color matches dot)
  SOL:    text-xs text-slate-400 font-mono

Delta:    text-sm font-mono
  +delta: text-green-400
  -delta: text-red-400
  zero:   text-slate-500

Next Step: text-xs text-slate-400 leading-relaxed
```

### 1.9 Expert Table (table.tsx)

Keep `table.module.css` as-is. Expert mode table stays in CSS Modules.

### 1.10 Protected Events Page + Table

Delete `protected-events.module.css`. Page wrapper: `bg-slate-950`.
Keep `protected-events-table.module.css` for now (expert table).

### 1.11 Validator Bonds Page + Table

Delete `validator-bonds.module.css`. Page wrapper: `bg-slate-950`.
Keep `validator-bonds-table.module.css` for now (expert table).

### 1.12 scheme.module.css

Delete (empty file).

### Phase 1 Completion Checklist

Files deleted:
```
src/components/navigation/navigation.module.css(.d.ts)
src/components/banner/banner.module.css(.d.ts)
src/components/metric/metric.module.css(.d.ts)
src/components/complex-metric/complex-metric.module.css(.d.ts)
src/components/sam-detail/sam-detail.module.css(.d.ts)
src/components/loader/loader.module.css(.d.ts)
src/pages/sam.module.css(.d.ts)
src/pages/validator-bonds.module.css(.d.ts)
src/pages/protected-events.module.css(.d.ts)
src/scheme.module.css(.d.ts)
```

Files kept (expert mode CSS Modules):
```
src/components/table/table.module.css(.d.ts)
src/components/sam-table/sam-table.module.css(.d.ts)
src/components/protected-events-table/*.module.css(.d.ts)
src/components/validator-bonds-table/*.module.css(.d.ts)
```

Verification: `npx tsc --noEmit` passes, `pnpm build` succeeds,
no CSS Module imports remain except for expert-mode components.

---

## Phase 2: shadcn/ui Components + Polish

After Phase 1 is stable, add shadcn/ui for richer components:

- Card, Badge, Button, Tooltip, Progress, Input, Tabs
- Replace raw `<button>` / `<div>` patterns with shadcn primitives
- Add proper tooltips (replace `title=` attributes with shadcn Tooltip)
- Bond health Badge component (dot + label as styled pill)
- Progress bar for bond utilization
- Responsive breakpoints and mobile polish
- View mode Tabs (A/B/C) when Variant B is ready

Phase 2 is out of scope for this spec. Ship Phase 1 first.
