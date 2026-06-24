## [resolved 2026-06-24] protected-events payload pinned by epoch-meter nav subscription

`epoch-meter.tsx` (always-mounted nav) observed `['protected-events']` directly, so
its multi-MB 3-epoch validator payload (cross-referenced from
`validator-with-protected_event.ts`) was held in the QueryClient for the entire
session; `gcTime: 30min` never fired while the app was open. Codex confirmed this as
the dominant amplifier of the switch-to-PE-and-back crash.

Fix: the EpochMeter now uses a lean `['epoch-meter']` query (`fetchEpochMeterData`)
that derives only the scalars it renders (network epoch, settlement epochs,
live-epoch start) and retains nothing else. It reuses the shared
`['protected-events']` cache via `ensureQueryData` (no double fetch on the Events
page), but with no persistent observer in the nav the full payload becomes
GC-eligible once the Events page unmounts. Progress also now comes from the Solana
RPC `['epoch-info']` query, further reducing reliance on the heavy payload.
