---
status: planned
---

# GUIDE gaps from validator support transcript (2026-04 to 05)

**Why:** real support threads showed validators confused by five specific gaps.
Each maps to a concrete doc addition or UI label.

| #   | Gap                                                                | Fix                                                                                              |
| --- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| 1   | Negative `Cover. [ep]` (e.g. "-9")                                 | GUIDE: negative = below fee threshold, undelegation in flight                                    |
| 2   | BRRM (Bond Risk Reduction Mechanism)                               | Add BRRM section to GUIDE with link to Marinade docs; clarify fee + stake drop are one mechanism |
| 3   | Snapshot timing — when does auction run, when does a top-up count? | "Epoch lifecycle" subsection in GUIDE (overlaps with Epoch Status Badge)                         |
| 4   | Top-up sized to projected stake, not current                       | Dashboard: label recommendation with stake basis; GUIDE: explain the sizing                      |
| 5   | Bid reduction safe-zone                                            | GUIDE: one sentence — "reducing your bid is safe as long as you remain above the clearing price" |

Items 1–3 and 5 are pure GUIDE prose additions. Item 4 needs a UI label in the
bond breakdown AND a GUIDE explanation.

**Where:** `public/docs/GUIDE.md`, `src/components/breakdowns/bond-coverage.tsx`
(item 4 label).
