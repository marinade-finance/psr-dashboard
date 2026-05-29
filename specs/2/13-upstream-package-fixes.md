---
status: planned
---

# Upstream package fixes required

### `@marinade.finance/eslint-config` — update eslint-plugin-import

`eslint-plugin-import@2.x` uses `sourceCode.getTokenOrCommentAfter` which was removed in ESLint 10. The shared config bundles this plugin; the dashboard pins `eslint@10.4.0`. Workaround: local `eslint.config.cjs` sets `'import/order': 'off'`.

**Fix:** bump `@marinade.finance/eslint-config` to use `eslint-plugin-import-x` (the ESLint-10-compatible fork) in place of `eslint-plugin-import`. Then remove the local `import/order: off` workaround.

### `@marinade.finance/eslint-config` (or project) — add `@zodios/core`

The generated Zod schemas in `src/schemas/generated/` import from `@zodios/core`.
`@zodios/core@10.9.6` is installed.
