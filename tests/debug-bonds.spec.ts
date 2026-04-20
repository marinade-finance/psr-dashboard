import { test } from './fixtures/mock-api'

test('bonds debug', async ({ page }) => {
  const requests: string[] = []
  page.on('request', r => { if (r.url().includes('marinade')) requests.push(r.url()) })
  page.on('requestfailed', r => { requests.push('FAILED: ' + r.url()) })
  await page.goto('/bonds')
  await page.waitForTimeout(12000)
  for (const r of requests) console.log(r)
})
