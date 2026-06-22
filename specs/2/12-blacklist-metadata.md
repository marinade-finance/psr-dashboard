---
status: planned
---

# Blacklist metadata — epoch and reason

**Why:** the CTA for a blacklisted validator currently says "Blacklisted." with no
context about when it happened. Operators want to see the epoch at which the blacklist
took effect so they know whether to escalate.

**Blocked on:** `AggregatedData.blacklist` is `Set<string>` — no epoch metadata.
Needs the SDK or scoring API to emit `{ voteAccount, blacklistedSinceEpoch }`.

**End state:** CTA reads "Blacklisted since epoch {N}." / "Blacklisted since epoch {N}
— {penalty} penalty this epoch."
