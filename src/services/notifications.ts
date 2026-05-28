import { NOTIFICATIONS_API_URL } from './apiUrls'
import { expectArray, expectObject, fetchJson, FetchError } from './fetch-utils'

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

// Spot-check the wire format at the boundary: a backend rename of `user_id`
// or `message` would throw a FetchError here instead of letting `undefined`
// cascade into the tooltip/detail panel as the literal string "undefined".
// `priority` is left loose because broadcast-only callers don't read it and
// test mocks send it as a number.
const validateNotifications = (body: unknown): ValidatorNotification[] => {
  const arr = expectArray(body, 'notifications response')
  if (arr.length > 0) {
    const first = expectObject(arr[0], 'notification entry')
    if (typeof first['id'] !== 'string') {
      throw new Error('notification entry missing `id`')
    }
    if (typeof first['message'] !== 'string') {
      throw new Error('notification entry missing `message`')
    }
    if (first['title'] !== null && typeof first['title'] !== 'string') {
      throw new Error('notification entry has non-string `title`')
    }
  }
  return arr as ValidatorNotification[]
}

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

      let notifications: ValidatorNotification[]
      try {
        notifications = await fetchJson<ValidatorNotification[]>(
          url.toString(),
          signal,
          validateNotifications,
        )
      } catch (err) {
        if (err instanceof FetchError) break
        throw err
      }

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
    const notifications = await fetchJson<ValidatorNotification[]>(
      url.toString(),
      signal,
      validateNotifications,
    )
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
    .replace(/'/g, '&#39;')
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
