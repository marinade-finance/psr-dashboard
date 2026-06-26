// Shared numeric primitives moved to @marinade.finance/ds-sam-calc; re-exported
// so existing imports from 'src/services/constants' keep resolving.
export {
  EPOCH_DURATION_MS,
  EPOCHS_PER_YEAR,
  LAMPORTS_PER_SOL,
  pmpeToSol,
} from '@marinade.finance/ds-sam-calc'

// Last epoch where settled `ProtectedEvent`s were still emitted in dry-run.
// Anything after this is treated as a real settlement. Dashboard-only.
export const LAST_DRYRUN_EPOCH = 608
