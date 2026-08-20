// Shared numeric primitives moved to @marinade.finance/ds-sam-calc and
// @marinade.finance/ts-common; re-exported so existing imports from
// 'src/services/constants' keep resolving.
export { LAMPORTS_PER_SOL } from '@marinade.finance/ds-sam-calc'
export { pmpeToSol } from '@marinade.finance/ts-common'

// Last epoch where settled `ProtectedEvent`s were still emitted in dry-run.
// Anything after this is treated as a real settlement. Dashboard-only.
export const LAST_DRYRUN_EPOCH = 608
