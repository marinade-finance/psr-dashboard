# Marinade PSR Dashboard

React SPA showing the live SAM (Stake Auction Marketplace) auction,
validator bonds, and protected events. Auction computation comes from
[`@marinade.finance/ds-sam-sdk`](https://www.npmjs.com/package/@marinade.finance/ds-sam-sdk).

## Local development

`pnpm generate` (Bun) regenerates the Zod API schemas in
`src/schemas/generated/` from the upstream OpenAPI specs.

```sh
pnpm install
pnpm generate           # regenerate Zod schemas from upstream OpenAPI specs (Bun)
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

### Playwright browsers

`pnpm test:e2e` needs Playwright's own pinned build — a system Chrome is not
used. `npx playwright install chromium` covers supported distros. If Playwright
has no Chromium build for the host platform, the install refuses outright
(`Playwright does not support chromium on ubuntu26.04-x64`); install the
nearest supported build instead:

```sh
PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=ubuntu24.04-x64 npx playwright install chromium
```

Note the platform string takes no dash before the version — `ubuntu-24.04`
fails with the same "does not support" message. Install-time only; plain
`pnpm test:e2e` works afterwards. Don't point `playwright.config.ts` at a
system browser: CI runs the bundled build, and the split makes a suite pass
locally and fail in CI.

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
