// Chrome memory stress test — loads /test-live with real API snapshot data
// (captured by scripts/capture-fixtures.js) and exercises the main
// interactions that preceded crashes: sort, validator detail panel open/close,
// simulation mode toggle.
//
// Run:
//   pnpm test:e2e tests/chrome-stress.spec.ts
//   SCALE=3 pnpm test:e2e tests/chrome-stress.spec.ts  # 3× validator list
//
// Prerequisites:
//   node scripts/capture-fixtures.js   (writes public/snapshot/*.json)
//   pnpm build && pnpm preview          (or pnpm test:e2e which calls preview)
import fs from 'fs'
import path from 'path'

import { test, expect } from '@playwright/test'
import type { CDPSession, Page } from '@playwright/test'

const SCALE = parseInt(process.env['SCALE'] ?? '1', 10)
const SNAPSHOT_PATH = path.join(__dirname, '../public/snapshot/meta.json')

type HeapMetrics = {
  jsHeapUsedMB: number
  jsHeapTotalMB: number
  nodes: number
}

async function heapMetrics(cdp: CDPSession): Promise<HeapMetrics> {
  const { metrics } = await cdp.send('Performance.getMetrics')
  const find = (name: string) => metrics.find(m => m.name === name)?.value ?? 0
  return {
    jsHeapUsedMB: find('JSHeapUsedSize') / 1024 / 1024,
    jsHeapTotalMB: find('JSHeapTotalSize') / 1024 / 1024,
    nodes: find('Nodes'),
  }
}

function fmt(m: HeapMetrics) {
  return `heap ${m.jsHeapUsedMB.toFixed(1)}/${m.jsHeapTotalMB.toFixed(1)} MB  nodes ${m.nodes}`
}

async function gotoLive(page: Page) {
  const url = `/test-${SCALE > 1 ? `?scale=${SCALE}` : ''}`
  await page.goto(url)
  // Wait for the table to appear — snapshot loads first (async), then SamPage
  // renders. Without snapshot the synthetic data renders immediately.
  await page.waitForSelector('tbody tr', { timeout: 60000 })
}

// Skip the whole suite if the snapshot hasn't been captured yet.
test.beforeAll(() => {
  if (!fs.existsSync(SNAPSHOT_PATH)) {
    console.warn('Snapshot not found — skipping chrome-stress tests.')
    console.warn('Run: node scripts/capture-fixtures.js')
  }
})

test.describe('Chrome memory — live data', () => {
  test.skip(!fs.existsSync(SNAPSHOT_PATH), 'Run node scripts/capture-fixtures.js first')

  test('baseline heap after initial load', async ({ page, context }) => {
    const cdp = await context.newCDPSession(page)
    await cdp.send('Performance.enable')

    await gotoLive(page)
    const meta = await page.evaluate(
      () => (window as typeof window & { snapshotMeta: unknown }).snapshotMeta,
    )
    console.log('snapshot meta:', JSON.stringify(meta))

    const baseline = await heapMetrics(cdp)
    console.log(`baseline    ${fmt(baseline)}`)

    // Sanity — table rendered correctly
    const rowCount = await page.locator('tbody tr:not([data-divider])').count()
    console.log(`table rows: ${rowCount}`)
    expect(rowCount).toBeGreaterThan(10)

    // No hard limit on baseline heap — just log it for trend tracking.
    // Anything > 1 GB on first load would be surprising.
    expect(baseline.jsHeapUsedMB).toBeLessThan(1024)
  })

  test('heap does not grow unboundedly across repeated sorts', async ({
    page,
    context,
  }) => {
    const cdp = await context.newCDPSession(page)
    await cdp.send('Performance.enable')

    await gotoLive(page)
    const baseline = await heapMetrics(cdp)
    console.log(`sort test baseline    ${fmt(baseline)}`)

    const maxApyHeader = page.locator('thead th').filter({ hasText: /Max APY/ }).first()
    const bondHeader = page.locator('thead th').filter({ hasText: /^Bond/ }).first()

    // Alternate sort columns 6 times
    for (let i = 0; i < 6; i++) {
      const h = i % 2 === 0 ? maxApyHeader : bondHeader
      await h.click({ position: { x: 10, y: 10 } })
      await page.waitForTimeout(200)
    }

    // Force GC hint via two idle cycles
    await page.evaluate(() => new Promise(r => setTimeout(r, 500)))

    const after = await heapMetrics(cdp)
    console.log(`sort test after       ${fmt(after)}`)

    const growthMB = after.jsHeapUsedMB - baseline.jsHeapUsedMB
    console.log(`heap growth after 6 sorts: ${growthMB.toFixed(1)} MB`)

    // More than 200 MB growth from sorting alone is a leak signal.
    expect(growthMB).toBeLessThan(200)
  })

  test('heap recovers after opening and closing validator detail panels', async ({
    page,
    context,
  }) => {
    const cdp = await context.newCDPSession(page)
    await cdp.send('Performance.enable')

    await gotoLive(page)
    const baseline = await heapMetrics(cdp)
    console.log(`panel test baseline   ${fmt(baseline)}`)

    const rows = page.locator('tbody tr:not([data-divider]):not([data-ghost="true"])')
    const count = Math.min(await rows.count(), 5)

    for (let i = 0; i < count; i++) {
      const row = rows.nth(i)
      await row.click()
      // Wait for slide-over to mount
      await page.waitForSelector('[role="dialog"], aside', { timeout: 5000 }).catch(() => null)
      // Close via Escape
      await page.keyboard.press('Escape')
      await page.waitForTimeout(100)
    }

    await page.evaluate(() => new Promise(r => setTimeout(r, 500)))

    const after = await heapMetrics(cdp)
    console.log(`panel test after      ${fmt(after)}`)

    const growthMB = after.jsHeapUsedMB - baseline.jsHeapUsedMB
    console.log(`heap growth after ${count} panel open/close: ${growthMB.toFixed(1)} MB`)

    // Each slide-over open/close should not retain > 50 MB cumulatively.
    expect(growthMB).toBeLessThan(50 * count)
  })

  test('heap after entering and exiting simulation mode', async ({
    page,
    context,
  }) => {
    const cdp = await context.newCDPSession(page)
    await cdp.send('Performance.enable')

    await gotoLive(page)
    const baseline = await heapMetrics(cdp)
    console.log(`sim test baseline     ${fmt(baseline)}`)

    // Click the first row to open validator detail, then find Simulate tab
    const firstRow = page
      .locator('tbody tr:not([data-divider]):not([data-ghost="true"])')
      .first()
    await firstRow.click()

    const simButton = page.getByRole('button', { name: /Simul/i }).first()
    const simVisible = await simButton.isVisible().catch(() => false)
    if (simVisible) {
      await simButton.click()
      await page.waitForTimeout(500)
      await page.keyboard.press('Escape')
      await page.waitForTimeout(300)
    } else {
      console.log('Simulate button not found — skipping sim interaction')
      await page.keyboard.press('Escape')
    }

    await page.evaluate(() => new Promise(r => setTimeout(r, 500)))

    const after = await heapMetrics(cdp)
    console.log(`sim test after        ${fmt(after)}`)

    const growthMB = after.jsHeapUsedMB - baseline.jsHeapUsedMB
    console.log(`heap growth after sim enter/exit: ${growthMB.toFixed(1)} MB`)

    expect(growthMB).toBeLessThan(300)
  })
})
