import { makeApi, Zodios, type ZodiosOptions } from '@zodios/core'
import { z } from 'zod'

const ReportStatusV1 = z.enum([
  'Missing',
  'Requested',
  'Processing',
  'Ready',
  'VerificationSkipped',
  'Verifying',
  'Verified',
  'Error',
  'VerificationFailed',
])
const Controller_submitStatusChange_Body = z
  .object({
    header: z
      .object({
        producer_id: z.string().min(1),
        message_id: z.string().uuid(),
        created_at: z.number().int().gte(0),
        received_at: z.number().int().gte(0).optional(),
        topic: z.string().optional(),
      })
      .passthrough(),
    payload: z
      .object({
        withdraw: z.string(),
        mtime: z.number().int().gte(0),
        status: ReportStatusV1,
        error: z.string(),
        to_slot: z.number().int().gte(0),
        to_block_time: z.number().int().gte(0),
      })
      .passthrough(),
  })
  .passthrough()
const Controller_submitReport_Body = z
  .object({
    header: z
      .object({
        producer_id: z.string().min(1),
        message_id: z.string().uuid(),
        created_at: z.number().int().gte(0),
        received_at: z.number().int().gte(0).optional(),
        topic: z.string().optional(),
      })
      .passthrough(),
    payload: z.object({
      run_id: z
        .string()
        .regex(
          /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
        ),
      schedule_id: z.string().min(1),
      partner_name: z.string().min(1),
      withdraw: z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/),
      stake: z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/),
      recipients: z
        .array(z.string().regex(/^mailto:[^\s@]+@[^\s@]+\.[^\s@]+$/))
        .min(1),
      template: z.string().min(1),
      csv_url: z.string().regex(/^https:\/\/\S+$/),
      scheduled_for: z.string().datetime({ offset: true }),
      data_through_block_time: z.string().datetime({ offset: true }),
      content_sha256: z.string().regex(/^[0-9a-f]{64}$/),
      callback_url: z.string().regex(/^https:\/\/\S+$/),
    }),
  })
  .passthrough()
const SubscribeDto = z.object({}).partial().passthrough()
const UnsubscribeDto = z.object({}).partial().passthrough()

export const schemas = {
  ReportStatusV1,
  Controller_submitStatusChange_Body,
  Controller_submitReport_Body,
  SubscribeDto,
  UnsubscribeDto,
}

const endpoints = makeApi([
  {
    method: 'post',
    path: '/bonds-event-v1',
    alias: 'BondsEventV1Controller_submitEvent',
    requestFormat: 'json',
    response: z.void(),
  },
  {
    method: 'get',
    path: '/health',
    alias: 'HealthController_check',
    requestFormat: 'json',
    response: z.void(),
  },
  {
    method: 'get',
    path: '/metrics',
    alias: 'PrometheusController_index',
    requestFormat: 'json',
    response: z.void(),
  },
  {
    method: 'post',
    path: '/staking-ledger-report-v1',
    alias: 'Controller_submitReport',
    description: `Queues a report for email delivery and, once settled, POSTs the outcome back to payload.callback_url`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `Message with report delivery payload`,
        type: 'Body',
        schema: Controller_submitReport_Body,
      },
    ],
    response: z
      .object({
        message_id: z.string(),
        topic: z.string(),
        created_at: z.number(),
        received_at: z.number(),
      })
      .partial()
      .passthrough(),
    errors: [
      {
        status: 400,
        description: `Validation failed`,
        schema: z.void(),
      },
      {
        status: 403,
        description: `Caller or producer_id is not staking-ledger`,
        schema: z.void(),
      },
      {
        status: 500,
        description: `Internal server error`,
        schema: z.void(),
      },
      {
        status: 503,
        description: `Report delivery URLs are not configured`,
        schema: z.void(),
      },
    ],
  },
  {
    method: 'post',
    path: '/staking-rewards-report-status-v1',
    alias: 'Controller_submitStatusChange',
    description: `Notifies when report status changes and updates Intercom`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `Message with status change payload`,
        type: 'Body',
        schema: Controller_submitStatusChange_Body,
      },
    ],
    response: z
      .object({
        message_id: z.string(),
        topic: z.string(),
        created_at: z.number(),
        received_at: z.number(),
      })
      .partial()
      .passthrough(),
    errors: [
      {
        status: 400,
        description: `Validation failed`,
        schema: z.void(),
      },
      {
        status: 500,
        description: `Internal server error`,
        schema: z.void(),
      },
    ],
  },
  {
    method: 'post',
    path: '/v1/admin/announcements',
    alias: 'AnnouncementsController_create',
    requestFormat: 'json',
    response: z.void(),
  },
  {
    method: 'get',
    path: '/v1/admin/announcements',
    alias: 'AnnouncementsController_list',
    requestFormat: 'json',
    response: z.void(),
  },
  {
    method: 'patch',
    path: '/v1/admin/announcements/:id',
    alias: 'AnnouncementsController_patch',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: z.void(),
  },
  {
    method: 'get',
    path: '/v1/notifications',
    alias: 'NotificationsController_list',
    requestFormat: 'json',
    response: z.void(),
  },
  {
    method: 'get',
    path: '/v1/notifications/all',
    alias: 'NotificationsController_listAll',
    requestFormat: 'json',
    response: z.void(),
  },
  {
    method: 'get',
    path: '/v1/notifications/broadcast',
    alias: 'NotificationsController_listBroadcast',
    requestFormat: 'json',
    response: z.void(),
  },
  {
    method: 'post',
    path: '/v1/subscriptions',
    alias: 'SubscriptionsController_subscribe',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: z.object({}).partial().passthrough(),
      },
    ],
    response: z.void(),
  },
  {
    method: 'delete',
    path: '/v1/subscriptions',
    alias: 'SubscriptionsController_unsubscribe',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: z.object({}).partial().passthrough(),
      },
    ],
    response: z.void(),
  },
  {
    method: 'get',
    path: '/v1/subscriptions',
    alias: 'SubscriptionsController_list',
    requestFormat: 'json',
    response: z.void(),
  },
])

export function createApiClient(baseUrl: string, options?: ZodiosOptions) {
  return new Zodios(baseUrl, endpoints, options)
}
