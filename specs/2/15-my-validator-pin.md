---
status: planned
---

# "My Validator" address pin + personal notification ribbon

**Why:** validators want their own notifications surfaced without having to find
their row in the table.

**UX:**

- Input in the navigation where the validator pastes their vote account.
  Validation: account must exist in current auction data or still show
  notifications if not in auction (chip marked muted).
- `localStorage` key `mnde:myValidator`. No server state.
- A slim ribbon above the broadcast `<Banner>` on every page showing
  notifications matching the saved vote account. Each row: priority chip +
  title + message + optional dismiss.
- "Clear" button on the chip.

**Data:** `fetchAllNotifications()` already returns
`Record<user_id, NotificationSummary>` — look up by saved vote account. No new
endpoint. Reuses the 5-min refresh.

**Where:**

- `src/components/navigation/navigation.tsx` — input/chip.
- New `src/components/my-validator-ribbon/` — renders the notification list.
- Pages mount ribbon between `<Navigation>` and `<Banner>`.
