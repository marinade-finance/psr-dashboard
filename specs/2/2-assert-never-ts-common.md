---
status: planned
---

# Move `assertNever` into ts-common

`src/utils/assert-never.ts` is a one-function module (exhaustiveness helper).
It has no project-specific dependencies and is the kind of primitive that belongs
in a shared `@marinade.finance/ts-common` (or equivalent) package alongside other
zero-dep utilities used across the monorepo.

**Where:** `src/utils/assert-never.ts`.

**When:** whenever `ts-common` (or the equivalent shared-utils package) is being
assembled or a multi-repo audit finds this duplicated elsewhere.
