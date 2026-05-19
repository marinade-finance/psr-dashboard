import type {
  NotificationSummary,
  ValidatorNotification,
} from 'src/services/notifications'

// Frozen fixture timestamps so /test- snapshots stay deterministic. The
// dashboard never re-derives "now" from these — they only feed copy.
const EMITTED = '2026-05-18T09:00:00.000Z'
const RELEVANCE_UNTIL = '2026-06-30T00:00:00.000Z'

// Global broadcast announcement. Seeded into ['notifications-broadcast'];
// SamPage / ProtectedEventsPage feed .title + .message into <Banner/>.
export const TEST_BROADCAST_NOTIFICATION: ValidatorNotification = {
  id: 'test-broadcast-1',
  notification_type: 'sam_auction',
  inner_type: 'auction_announcement',
  user_id: 'broadcast',
  scope: 'broadcast',
  priority: 'info',
  title: 'Deterministic test view — synthetic auction data',
  message:
    'This is the /test- view. Every row is a hand-built synthetic state, ' +
    'not live data — use the cutoff divider to read winners (above the ' +
    'line) versus below-line validators that lose stake next epoch.\n\n' +
    'Fixture config: clearing price 6.0 pmpe (total = 5.0 base + bid). ' +
    'Bond floor 5 SOL minimum; runway min 1 epoch, ideal 13 epochs. ' +
    'Concentration caps 30% per country and 30% per ASO (DE and Hetzner ' +
    'are deliberately over the cap). SAM TVL 6,000,000 SOL.',
  data: {},
  notification_id: null,
  relevance_until: RELEVANCE_UNTIL,
  created_at: EMITTED,
}

const FOOTER = 'Emitted: 2026-05-18 09:00 UTC'
const FOOTER_PREV = 'Emitted: 2026-05-17 09:00 UTC'

// Real TEST_VALIDATORS vote accounts (= user_id). Kept as named constants
// so the map keys carry meaning and no string is duplicated.
const V01 = 'FiXtUREv1111111111111111111111111111111111aa' // Test: In-Set Gaining
const V03 = 'FiXtUREv3333333333333333333333333333333333cc' // Test: Watch Bond
const V04 = 'FiXtUREv4444444444444444444444444444444444dd' // Test: Critical Bond
const V06 = 'FiXtUREv6666666666666666666666666666666666ff' // Test: Bid-Too-Low

// Per-validator notifications keyed by fixture vote account. The detail
// panel reads these as already-parsed ParsedNotification rows
// (id/priority/title/body/footer) and grades the Notifications tab dot by
// the highest priority present. Tones vary across the four validators so
// the attention dot renders info / warning / critical on /test-.
export const TEST_NOTIFICATIONS_MAP: Record<string, NotificationSummary> = {
  [V01]: {
    count: 1,
    notifications: [
      {
        id: 'test-notif-v01-1',
        priority: 'info',
        title: 'Stake increase expected',
        body:
          'Your effective bid clears the current cutoff with room to spare. ' +
          'You are projected to gain stake next epoch.',
        footer: FOOTER,
      },
    ],
  },
  [V03]: {
    count: 1,
    notifications: [
      {
        id: 'test-notif-v03-1',
        priority: 'warning',
        title: 'Bond runway is thinning',
        body:
          'At the current obligation rate your bond covers about 15 more ' +
          'epochs. Top up the bond to avoid a forced undelegation.',
        footer: FOOTER,
      },
    ],
  },
  [V04]: {
    count: 2,
    notifications: [
      {
        id: 'test-notif-v04-1',
        priority: 'critical',
        title: 'Bond nearly exhausted',
        body:
          'Your bond covers fewer than 5 epochs. A forced undelegation is ' +
          'imminent — fund the bond now to keep your stake.',
        footer: FOOTER,
      },
      {
        id: 'test-notif-v04-2',
        priority: 'warning',
        title: 'Commission above peer median',
        body:
          'Your inflation commission is higher than most validators in the ' +
          'set. Lowering it improves your bid competitiveness.',
        footer: FOOTER_PREV,
      },
    ],
  },
  [V06]: {
    count: 1,
    notifications: [
      {
        id: 'test-notif-v06-1',
        priority: 'critical',
        title: 'Bid below clearing price',
        body:
          'Your bid is under the current clearing price. Unless you raise ' +
          'it before the snapshot you will fall out of the auction and lose ' +
          'all Marinade stake next epoch.',
        footer: FOOTER,
      },
    ],
  },
}
