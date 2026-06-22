---
status: draft
---

# Epoch browser — full dashboard replay at any past epoch

**Why:** the dashboard is always frozen at the current epoch. Validators who
want to understand a past event — what was the winning total PMPE in epoch N,
what happened to their stake, what did their bond coverage look like — have
no way to replay it. The only historical view is the Protected Events table,
which covers settlements but not the full auction state.

## Design

The dashboard re-rendered with frozen historical data for a chosen epoch.
Same SAM table, same validator detail panel, same breakdown cards — but
driven by a historical snapshot.

**UX entry points:**
- Epoch selector in the global header (alongside / replacing the current epoch display)
- Direct URL: `?epoch=N` — linkable and shareable

**Behavioural changes vs live mode:**
- All data fetches parameterised with `?epoch=N`
- "ESTIMATE" / "FINALIZED" badges reflect that epoch's settlement state
- Simulation mode disabled — historical data is read-only
- Visual indicator that a past epoch is active (banner, header tint, or epoch label)

**Preconditions:** validators API, protected events API, and bonds API must
all expose historical snapshots parameterised by epoch number. No dashboard
work starts until the API contract is defined.

**Where:** global header (epoch selector); `src/pages/` route wrappers;
`src/services/` — parameterised fetch wrappers.
