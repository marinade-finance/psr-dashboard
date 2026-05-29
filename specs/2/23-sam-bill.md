---
status: planned
---

# Marinade SAM Bill — per-validator monthly payment report

**Why:** validators have no way to reconcile past SAM spending. The Payments
tab shows only the upcoming epoch estimate. The Protected Events table shows
individual settlement rows but no aggregate. Validators budgeting for SAM
participation or auditing their bond outflow have to do the maths themselves.

## User need (from Discord feedback, 2026-05-29)

> "Is there a way to see past payments?" — validator L

## Deliverable

A downloadable per-validator summary covering one calendar month (or an
arbitrary epoch range the user selects):

| Line item                        | Source                              |
| -------------------------------- | ----------------------------------- |
| Static bid cost per epoch        | bid PMPE × average stake × epochs  |
| Dynamic bid cost per epoch       | clearing-price discount per epoch   |
| PSR settlements (bond-funded)    | protected-events API, bond-paid rows|
| PSR settlements (Marinade-backed)| protected-events API, backstop rows |
| Bond risk fees charged           | protected-events API, BondRiskFee   |
| **Total bond outflow**           | sum of above                        |

Output format: CSV (machine-readable, easy to import into accounting tools).
PDF is a stretch goal — CSV first.

Triggered from a "Download bill" button on the Payments tab or the validator
detail header.

## Preconditions

- Historical per-epoch bid cost data accessible via API (not yet exposed).
- Protected Events API already returns settlement history — that part works today.
- USD conversion is an estimate only (SOL price at epoch close); label it as such.

## Scope

No UI overhaul. Output-only feature on top of existing validator detail panel.
No work starts until the historical bid cost API endpoint is defined.

**Where:** `src/components/validator-detail/` — Payments tab; new download
button; new `src/services/bill.ts` to aggregate the data.
