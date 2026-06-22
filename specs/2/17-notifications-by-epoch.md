---
status: planned
---

# Notifications grouped by epoch

**Why:** the Notifications tab lists PSR events in order, but when there are
many events spanning multiple epochs the list loses context — which events are
from the current epoch vs older epochs?

**What:** group notification rows by epoch number, with a sticky epoch header
separating each group. Most-recent epoch at the top.

**Where:**
- `src/components/validator-detail/` — the Notifications tab list renderer.

**Open questions:**
- Epoch header design: inline divider vs collapsible group?
- How many epochs to show before truncating (pagination or "show more").
