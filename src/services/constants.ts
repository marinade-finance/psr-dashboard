// Solana epoch = 432000 slots × 0.4s/slot = 172800s = 48h exactly.
export const EPOCH_DURATION_MS = 48 * 60 * 60 * 1000
export const EPOCHS_PER_YEAR = (365.25 * 24 * 3600 * 1000) / EPOCH_DURATION_MS

// Last epoch where settled `ProtectedEvent`s were still emitted in dry-run.
// Anything after this is treated as a real settlement.
export const LAST_DRYRUN_EPOCH = 608
