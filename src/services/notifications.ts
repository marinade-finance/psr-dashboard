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

export interface ParsedNotification {
  id: string
  priority: NotificationPriority
  title: string | null
  body: string
  footer: string
}

export interface NotificationSummary {
  count: number
  notifications: ParsedNotification[]
}

const PAGE_SIZE = 200
// Safety cap. Assumes fewer than PAGE_SIZE * MAX_PAGES active individual
// notifications at any time; prevents runaway loops if the API misbehaves.
const MAX_PAGES = 25
const TOOLTIP_MAX_NOTIFICATIONS = 10

export async function fetchAllNotifications(
  notificationType?: string,
  signal?: AbortSignal,
): Promise<Record<string, NotificationSummary>> {
  const result: Record<string, NotificationSummary> = {}

  try {
    for (let page = 0; page < MAX_PAGES; page++) {
      const url = new URL('/v1/notifications/all', NOTIFICATIONS_API_URL)
      if (notificationType) {
        url.searchParams.set('notification_type', notificationType)
      }
      url.searchParams.set('scope', 'individual')
      url.searchParams.set('limit', String(PAGE_SIZE))
      url.searchParams.set('offset', String(page * PAGE_SIZE))

      const res = await fetch(url.toString(), { signal })
      if (!res.ok) break

      const notifications = (await res.json()) as ValidatorNotification[]

      for (const notification of notifications) {
        const existing = result[notification.user_id]
        if (existing) {
          existing.count++
          if (existing.notifications.length < TOOLTIP_MAX_NOTIFICATIONS) {
            existing.notifications.push(parseNotification(notification))
          }
        } else {
          result[notification.user_id] = {
            count: 1,
            notifications: [parseNotification(notification)],
          }
        }
      }

      if (notifications.length < PAGE_SIZE) break
    }
  } catch {
    // silently fail — notifications are non-critical
  }

  return result
}

export async function fetchLatestSamAuctionBroadcastNotification(
  signal?: AbortSignal,
): Promise<ValidatorNotification | null> {
  try {
    const url = new URL('/v1/notifications/broadcast', NOTIFICATIONS_API_URL)
    url.searchParams.set('notification_type', 'sam_auction')
    url.searchParams.set('limit', '10')
    const res = await fetch(url.toString(), { signal })
    if (!res.ok) return null
    const notifications = (await res.json()) as ValidatorNotification[]
    if (notifications.length === 0) return null
    return notifications.reduce((latest, n) =>
      Date.parse(n.created_at) > Date.parse(latest.created_at) ? n : latest,
    )
  } catch {
    return null
  }
}

function parseNotification(n: ValidatorNotification): ParsedNotification {
  const [bodyPart, ...footerParts] = n.message.split('\n\nEmitted:')
  return {
    id: n.id,
    priority: n.priority,
    title: n.title,
    body: bodyPart,
    footer: footerParts.length
      ? `Emitted:${footerParts.join('\n\nEmitted:')}`
      : '',
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
  const shown = summary.notifications.slice(0, TOOLTIP_MAX_NOTIFICATIONS)
  const remaining = summary.count - shown.length
  const rendered = shown
    .map(({ priority, body, footer }) => {
      const prefix =
        priority === 'critical'
          ? '[CRITICAL]'
          : priority === 'warning'
            ? '[WARNING]'
            : '[INFO]'
      const bodyHtml = escapeHtml(body).replace(/\n/g, '<br/>')
      const footerHtml = footer
        ? `<br/><small><em>${escapeHtml(footer)}</em></small>`
        : ''
      return `<p><strong>${prefix}</strong> ${bodyHtml}${footerHtml}</p>`
    })
    .join('<hr/>')
  return remaining > 0
    ? `${rendered}<hr/><p><small><em>+ ${remaining} more</em></small></p>`
    : rendered
}
