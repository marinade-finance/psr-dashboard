# Marinade PSR Dashboard

Dashboard for Marinade's Protected Staking Rewards program. Displays SAM auction results, validator bonds, and protected events.

## Development

Start the development server:

```sh
pnpm install
NODE_OPTIONS="--max-old-space-size=8192" pnpm start:dev
```

`NODE_OPTIONS="--max-old-space-size=8192"` is required to avoid OOM during the dev build.

### Environment variables

Environment variables are injected at build time via `webpack.DefinePlugin`. To override a variable, set it before running the dev server or build:

```sh
NOTIFICATIONS_API_URL=http://localhost:3000 pnpm start:dev
```

| Variable | Default | Description |
|---|---|---|
| `VALIDATORS_API_URL` | `https://validators-api.marinade.finance` | Validators API (rewards, validator list) |
| `VALIDATOR_BONDS_API_URL` | `https://validator-bonds-api.marinade.finance` | Validator Bonds API (bonds, protected events) |
| `SCORING_API_URL` | `https://scoring.marinade.finance` | Scoring API (SAM scores) |
| `NOTIFICATIONS_API_URL` | `https://marinade-notifications.marinade.finance` | Notifications API |

## Banner Notifications

The dashboard displays broadcast notifications as banners at the top of every page.
Notifications are fetched from the [marinade-notifications API](https://marinade-notifications.marinade.finance/docs)
(`GET /v1/notifications/broadcast?notification_type=sam_auction`).

When there are no active notifications, no banner is shown.

### Adding a banner notification

Post an announcement event to the notifications API:

```bash
# 1. Generate a JWT token (in the marinade-notifications repo)
cd ~/marinade/marinade-notifications/notification-service
pnpm jwt generate-token <username> 720h
# The JWT `sub` claim must match a username in ALLOWED_USERS env var

# 2. Post the announcement
curl -X POST https://marinade-notifications.marinade.finance/bonds-event-v1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>" \
  -d '{
    "header": {
      "producer_id": "my-producer",
      "message_id": "'$(uuidgen)'",
      "created_at": '$(date +%s%3N)'
    },
    "payload": {
      "type": "bonds",
      "inner_type": "announcement",
      "vote_account": "11111111111111111111111111111111",
      "bond_pubkey": null,
      "bond_type": "bidding",
      "epoch": 800,
      "data": {
        "message": "Your announcement text here.\nSecond line renders as a separate paragraph.",
        "title": "Banner Title",
        "details": {}
      },
      "created_at": "'$(date -u +%Y-%m-%dT%H:%M:%S.000Z)'"
    }
  }'
```

- `data.title` — banner heading (falls back to "Announcement" when null)
- `data.message` — banner body; newlines (`\n`) render as separate paragraphs
- `vote_account` — required by schema but ignored for announcements (they broadcast to all)

### Expiry

Announcements auto-expire after **14 days** (configured as `relevance_hours: 336`
in `notifications-bonds/src/config/thresholds.yaml`). The API filters out expired
notifications automatically — no cleanup needed.

### Removing a banner early

There is no API endpoint for deactivation yet. Use SQL directly:

```sql
-- Find recent announcements
SELECT id, title, message, created_at FROM notifications_outbox
WHERE inner_type = 'announcement' ORDER BY created_at DESC LIMIT 5;

-- Deactivate by id
UPDATE notifications_outbox SET deactivated_at = now() WHERE id = <id>;
```

Once `deactivated_at` is set, the notification disappears from the dashboard immediately.
