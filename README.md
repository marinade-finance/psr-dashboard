# Marinade PSR Dashboard

React SPA showing the live SAM (Stake Auction Marketplace) auction,
validator bonds, and protected events. Auction computation comes from
[`@marinade.finance/ds-sam-sdk`](https://www.npmjs.com/package/@marinade.finance/ds-sam-sdk).

## Local development

```sh
pnpm install
pnpm start:dev          # Vite dev server (HMR), port 3000
pnpm build              # production build → build/
pnpm preview            # serve build/ on :8080 (used by Playwright)

pnpm lint               # eslint
pnpm format:check       # prettier check
pnpm check              # lint + format:check
pnpm test               # vitest unit
pnpm test:e2e           # playwright e2e (auto-starts preview)
pnpm test:e2e:update    # refresh visual-regression baselines
npx tsc --noEmit        # type check
```

## Routes

| Route                    | Page                                   |
| ------------------------ | -------------------------------------- |
| `/`                      | SAM auction                            |
| `/bonds`                 | Validator bonds                        |
| `/protected-events`      | Protected events                       |
| `/docs`                  | In-app guide (`public/docs/GUIDE.md`)  |
| `/test-`                 | SAM page over fixture data (Playwright)|
| `/test-bonds`            | Bonds page over fixture data           |
| `/test-protected-events` | Events page over fixture data          |

The main data query on every page auto-refreshes once an hour.

## Documentation

- [`SCREENS.md`](SCREENS.md) — UI inventory (every page, panel, column, badge).
- [`ARCHITECTURE.md`](ARCHITECTURE.md) — code layout, services, data flow.
- [`VISUALS.md`](VISUALS.md) — visual-language alphabet (tokens, primitives).
- [`CLAUDE.md`](CLAUDE.md) — agent operating rules.
- [`public/docs/GUIDE.md`](public/docs/GUIDE.md) — end-user guide rendered by `/docs`.
- [`specs/index.md`](specs/index.md) — design specs.

## Deployment

Build output is `build/`; SPA fallback is `public/_redirects` (Netlify-style)
plus the `spaFallback` middleware in `vite.config.ts` for `pnpm preview`.

## Contributing

1. **Live docs travel with the change.** Update `SCREENS.md` /
   `ARCHITECTURE.md` / `VISUALS.md` in the same commit when the UI,
   structure, or visual tokens change.
2. **Use semantic Tailwind tokens.** Never inline `var(...)`, never raw
   hex/rgb. Define a CSS var in `src/index.css`, expose it in `@theme`,
   then use the generated `bg-…` / `text-…` class.
3. **Commit format:** `[section] Message`. Examples: `[fix]`, `[docs]`,
   `[test]`, `[specs]`.
