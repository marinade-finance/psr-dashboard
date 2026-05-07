# PSR Dashboard

Marinade Finance PSR (Protected Staking Rewards) dashboard — a React SPA
that visualises the live SAM (Stake Auction Marketplace) auction,
validator bonds, and protected events. Auction computation comes from
[`@marinade.finance/ds-sam-sdk`](https://www.npmjs.com/package/@marinade.finance/ds-sam-sdk).

## Local development

```bash
pnpm install
pnpm start:dev          # Vite dev server (HMR)
pnpm build              # production build → build/
pnpm preview            # serve build/ on :8080

pnpm lint               # eslint
pnpm format:check       # prettier check
pnpm check              # lint + format:check
pnpm test               # vitest unit
pnpm test:e2e           # playwright e2e (uses preview server)
npx tsc --noEmit        # type check
```

Pre-commit hooks (husky + lint-staged) run `eslint --fix` + `prettier
--write` on staged TS/TSX. First run may reformat — retry the commit
once if it fails.

## Routes

Each route has a Basic and an Expert variant; Expert exposes additional
metrics, columns, and the simulation panel.

| Basic | Expert | Page |
|---|---|---|
| `/` | `/expert-` | SAM auction |
| `/bonds` | `/expert-bonds` | Validator bonds |
| `/protected-events` | `/expert-protected-events` | Protected events |
| `/docs` | `/expert-docs` | In-app guide |

## Documentation

- [`SCREENS.md`](SCREENS.md) — live UI inventory (every page, panel, column, badge).
- [`ARCHITECTURE.md`](ARCHITECTURE.md) — code layout, services, data flow, conventions.
- [`CLAUDE.md`](CLAUDE.md) — contributor rules, visual-language tokens.
- [`public/docs/GUIDE.md`](public/docs/GUIDE.md), [`public/docs/GUIDE-EXPERT.md`](public/docs/GUIDE-EXPERT.md) — end-user guides rendered by `/docs`.
- [`specs/index.md`](specs/index.md) — design specs.

## Contributing

Three rules:

1. **Live docs travel with the change.** Update `SCREENS.md` whenever
   the UI changes (column, badge, default sort, route). Update
   `ARCHITECTURE.md` whenever the structure changes (new service,
   new route, new query key, new external dep). Same commit as the code.
2. **Use semantic Tailwind tokens.** Never inline `var(...)`, never raw
   hex/rgb. New colours: define a CSS var in `src/index.css`, expose it
   in the `@theme` block, then use the generated `bg-…` / `text-…`
   class. See `CLAUDE.md` for the full rules.
3. **Commit format**: `[section] Message`. Examples: `[fix]`,
   `[a11y][perf]`, `[docs]`, `[test]`, `[specs]`.
