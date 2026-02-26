# PSR Dashboard — Tailwind Refactor

## Vision
Refactor the Marinade PSR (Protected Stake Rewards) validator dashboard from CSS Modules to Tailwind CSS, applying the Marinade design system tokens from Figma. Keep all existing functionality intact.

## Context
- **Repo:** marinade-finance/psr-dashboard (branch: feature/my-feature)
- **Current stack:** React + TypeScript + Webpack + CSS Modules
- **Target stack:** React + TypeScript + Webpack + Tailwind CSS
- **Design tokens:** Figma export (Default_tokens.json) with full light/dark mode support

## Data Sources (DO NOT CHANGE)
- Validators API: `https://validators-api.marinade.finance/validators`
- Bonds API: `https://validator-bonds-api.marinade.finance/bonds`
- Rewards API: `https://validators-api.marinade.finance/rewards`
- Scoring API: `https://scoring.marinade.finance/api/v1/scores/sam`
- SDK: `@marinade.finance/ds-sam-sdk` (runs auction simulation client-side)

## Key Constraints
- Keep ALL business logic in `services/` untouched
- Keep webpack config (not migrating to Vite/Next.js)
- Preserve simulation mode, detail view, stats bar, tip engine
- Use Marinade's exact design tokens (colors, typography, spacing)
- Fonts: Geist (sans), Geist Mono (mono)
