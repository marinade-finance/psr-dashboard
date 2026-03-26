import { NOTIFICATIONS_API_URL } from './apiUrls'

export type NotificationPriority = 'critical' | 'warning' | 'info'

export interface ValidatorNotification {
  id: string
  notification_type: string
  inner_type: string
  user_id: string
  scope?: 'broadcast' | 'individual'
  priority: NotificationPriority
  title: string | null
  message: string
  data: Record<string, unknown>
  notification_id: string | null
  relevance_until: string
  created_at: string
}

/** Highest-priority notification for a validator (for icon display) */
export interface NotificationSummary {
  count: number
  maxPriority: NotificationPriority
  notifications: ValidatorNotification[]
}

export const PRIORITY_ORDER: Record<NotificationPriority, number> = {
  critical: 0,
  warning: 1,
  info: 2,
}

const PAGE_SIZE = 200
// Safety cap. Assumes fewer than PAGE_SIZE * MAX_PAGES active individual
// notifications at any time; prevents runaway loops if the API misbehaves.
const MAX_PAGES = 25
const TOOLTIP_MAX_NOTIFICATIONS = 10

export async function fetchAllNotifications(
  notificationType?: string,
): Promise<Map<string, NotificationSummary>> {
  const result = new Map<string, NotificationSummary>()

  try {
    for (let page = 0; page < MAX_PAGES; page++) {
      const url = new URL('/v1/notifications/all', NOTIFICATIONS_API_URL)
      if (notificationType) {
        url.searchParams.set('notification_type', notificationType)
      }
      url.searchParams.set('scope', 'individual')
      url.searchParams.set('limit', String(PAGE_SIZE))
      url.searchParams.set('offset', String(page * PAGE_SIZE))
      const res = await fetch(url.toString())
      if (!res.ok) break
      const notifications = (await res.json()) as ValidatorNotification[]

      for (const n of notifications) {
        const existing = result.get(n.user_id)
        if (existing) {
          existing.count++
          if (existing.notifications.length < TOOLTIP_MAX_NOTIFICATIONS) {
            existing.notifications.push(n)
          }
          if (
            (PRIORITY_ORDER[n.priority] ?? 2) <
            (PRIORITY_ORDER[existing.maxPriority] ?? 2)
          ) {
            existing.maxPriority = n.priority
          }
        } else {
          result.set(n.user_id, {
            count: 1,
            maxPriority: n.priority,
            notifications: [n],
          })
        }
      }

      if (notifications.length < PAGE_SIZE) break
    }
  } catch {
    // silently fail — notifications are non-critical
  }

  return result
}

export async function fetchBroadcastNotifications(): Promise<
  ValidatorNotification[]
> {
  try {
    const url = new URL('/v1/notifications/broadcast', NOTIFICATIONS_API_URL)
    url.searchParams.set('notification_type', 'sam_auction')
    url.searchParams.set('limit', '10')
    const res = await fetch(url.toString())
    if (!res.ok) return []
    return (await res.json()) as ValidatorNotification[]
  } catch {
    return []
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function notificationTooltip(summary: NotificationSummary): string {
  // Split each notification body at the footer separator so we can render the
  // "Emitted: …" metadata line smaller/italic and visually subordinate to the
  // main notification text. Format-neutral `\n` characters become `<br/>` only
  // here — the formatter's output stays plain text.
  const shown = summary.notifications.slice(0, TOOLTIP_MAX_NOTIFICATIONS)
  const remaining = summary.count - shown.length
  const rendered = shown
    .map(n => {
      const prefix =
        n.priority === 'critical'
          ? '[CRITICAL]'
          : n.priority === 'warning'
            ? '[WARNING]'
            : '[INFO]'
      const [bodyPart, ...footerParts] = n.message.split('\n\nEmitted:')
      const body = escapeHtml(bodyPart).replace(/\n/g, '<br/>')
      const footer = footerParts.length
        ? `<br/><small><em>Emitted:${escapeHtml(footerParts.join('\n\nEmitted:'))}</em></small>`
        : ''
      return `<strong>${prefix}</strong> ${body}${footer}`
    })
    .join('<hr/>')
  return remaining > 0
    ? `${rendered}<hr/><small><em>+ ${remaining} more</em></small>`
    : rendered
}
