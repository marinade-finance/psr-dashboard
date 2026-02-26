---
phase: 1
plan: 1
name: Tailwind + Design System Setup
wave: 1
autonomous: true
---

# Plan 01-01: Tailwind + Design System Setup

## Objective

Install Tailwind CSS, configure PostCSS for webpack, and set up CSS custom properties matching Marinade's Figma design tokens. This is the foundation every other plan depends on.

## Context

**Phase Goal:** Convert PSR dashboard from CSS Modules to Tailwind CSS
**This Plan's Role:** Infrastructure setup — without this, no Tailwind classes work
**Dependencies:** None (first plan)

## Tasks

### Task 1: Install Tailwind + PostCSS dependencies

**Steps:**
1. `cd /data/clawd/psr-dashboard`
2. `pnpm add -D tailwindcss postcss autoprefixer postcss-loader`
3. Verify packages in package.json

**Commit:** `chore: add tailwind and postcss dependencies`

---

### Task 2: Create Tailwind + PostCSS config files

**Steps:**
1. Create `tailwind.config.js` with Marinade design tokens:
   - Colors: primary (#0C9790), destructive (#DC2626), warning (#E59606), info (#6366F1), chart-1 through chart-5, tag-1 through tag-4, all with light/dark variants
   - Typography: fontFamily with Geist (sans), Geist Mono (mono), PT Serif (serif)
   - Font sizes: 2xs(12px), xs(13px), sm(14px), base(16px), lg(18px), xl(20px), 2xl(24px), 3xl(30px)
   - Border radius: xs(2px), sm(6px), md(8px), lg(10px), xl(12px), 2xl(16px), 3xl(24px), 4xl(32px)
   - Shadows: xs, sm, md, lg, xl from Figma tokens
   - Breakpoints: sm(640px), md(768px), lg(1024px), xl(1280px), 2xl(1536px)
   - Content paths: `./src/**/*.{ts,tsx}`
2. Create `postcss.config.js` with tailwindcss + autoprefixer plugins

**Files:**
- Create: `tailwind.config.js`
- Create: `postcss.config.js`

**Commit:** `chore: configure tailwind with marinade design tokens`

---

### Task 3: Update webpack config to use PostCSS

**Steps:**
1. Read current `webpack.config.cjs` to understand CSS loader chain
2. Add `postcss-loader` to the CSS rule pipeline (after css-loader, before style-loader)
3. Ensure CSS modules still work temporarily (during migration, some files may still use them)
4. The chain should be: style-loader → css-loader → postcss-loader for regular CSS, and style-loader → css-loader (modules) → postcss-loader for .module.css files

**Files:**
- Modify: `webpack.config.cjs`

**Commit:** `chore: add postcss-loader to webpack css pipeline`

---

### Task 4: Set up global CSS with Tailwind directives and design token CSS variables

**Steps:**
1. Add Tailwind directives to `src/index.css`:
   ```
   @tailwind base;
   @tailwind components;
   @tailwind utilities;
   ```
2. Add `:root` CSS variables for ALL Figma tokens (light mode defaults):
   - `--primary: #0C9790`, `--primary-foreground: #F6F9F9`
   - `--background: #FFFFFF`, `--background-page: #F3F7F7`
   - `--foreground: #182120`, `--secondary-foreground: #3A4E4D`
   - `--muted-foreground: #6C8383`, `--muted: #F3F7F7`
   - `--card: #FFFFFF`, `--card-foreground: #081211`
   - `--border: #DDE7E8`, `--border-grid: #E7EEEF`
   - `--input: #E7EEEF`, `--secondary: #E7EEEF`
   - `--accent: #E7EEEF`, `--tertiary: #DDE7E8`
   - `--destructive: #DC2626`, `--warning: #E59606`, `--info: #6366F1`
   - `--ring: rgba(154,177,178,0.3)`
   - `--chart-1: #0C9790`, `--chart-2: #818CF8`, `--chart-3: #FBBF24`, `--chart-4: #C084FC`, `--chart-5: #FB7185`
   - Alpha variants: `--primary-light: rgba(12,151,144,0.15)`, `--primary-light-90: rgba(12,151,144,0.9)`, `--destructive-light: rgba(220,38,38,0.2)`, `--warning-light: rgba(229,150,6,0.2)`, `--warning-light-10: rgba(229,150,6,0.1)`, `--info-light: rgba(99,102,241,0.2)`
   - Tag colors: `--tag-1: #CA8A04`, `--tag-1-bg: rgba(234,179,8,0.15)`, etc.
3. Add `.dark` class variant with dark mode values:
   - `--primary: #179F99`, `--background: #030707`, `--foreground: #F6F9F9`, etc.
4. Add `@import url()` for Geist fonts (from CDN or bundled)
5. Add base resets (`*, *::before, *::after { box-sizing: border-box; }`, etc.)

**Files:**
- Modify: `src/index.css`

**Commit:** `style: add tailwind directives and marinade design token css variables`

---

### Task 5: Verify Tailwind works

**Steps:**
1. Run `pnpm build` and ensure no errors
2. Check that Tailwind classes would be processed (content paths correct)

**Verification:**
```bash
cd /data/clawd/psr-dashboard && pnpm build 2>&1 | tail -20
```

**Commit:** None (verification only)

## Success Criteria

- [ ] Tailwind CSS installed and configured
- [ ] PostCSS pipeline in webpack works
- [ ] CSS variables for all Marinade design tokens defined in index.css
- [ ] Dark mode variables under `.dark` class
- [ ] `pnpm build` succeeds without errors
- [ ] Geist font imported

## Notes

- The tip-engine.ts already references `var(--primary)`, `var(--destructive)`, etc. — these CSS variable names MUST match exactly
- Keep CSS module support in webpack during migration (both systems coexist temporarily)
- Tailwind config should extend (not replace) defaults where sensible
