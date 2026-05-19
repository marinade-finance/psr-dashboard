// Coverage gap-fillers — defensive / adversarial paths. Basic mode on
// /test-* fixtures.
import { test, expect } from '@playwright/test'

const SHEET = '[role="dialog"]'
const V01 = 'FiXtUREv1111111111111111111111111111111111aa'
const V_GARBAGE = 'definitely-not-a-real-vote-account'
const V_NOT_IN_FIXTURE = 'GhostValidatornotInFixtures22222222222222222'

test('?v=<garbage> does not crash the SAM page', async ({ page }) => {
  const errors: string[] = []
  page.on('console', m => {
    if (m.type() === 'error') errors.push(m.text())
  })
  await page.goto(`/test-?v=${V_GARBAGE}`)
  await page.waitForSelector('tbody tr', { timeout: 30000 })
  // Sheet must NOT open for an unknown vote account.
  await expect(page.locator(SHEET)).toHaveCount(0, { timeout: 5000 })
  const real = errors.filter(
    e => !e.includes('Failed to load resource') && !e.includes('net::'),
  )
  expect(real).toHaveLength(0)
})

test('?v=<vote-not-in-fixture> renders the table without the sheet', async ({
  page,
}) => {
  await page.goto(`/test-?v=${V_NOT_IN_FIXTURE}`)
  await page.waitForSelector('tbody tr', { timeout: 30000 })
  await expect(page.locator(SHEET)).toHaveCount(0, { timeout: 5000 })
})

test('reloading while sheet is open reopens it from ?v=', async ({ page }) => {
  await page.goto(`/test-?v=${V01}`)
  await page.waitForSelector('tbody tr', { timeout: 30000 })
  await expect(page.locator(SHEET).first()).toBeVisible({ timeout: 5000 })
  await page.reload()
  await page.waitForSelector('tbody tr', { timeout: 30000 })
  await expect(page.locator(SHEET).first()).toBeVisible({ timeout: 5000 })
  await expect(page).toHaveURL(new RegExp(`\\?v=${V01}`))
})

test('browser forward after back reopens the sheet', async ({ page }) => {
  await page.goto('/test-')
  await page.waitForSelector('tbody tr', { timeout: 30000 })
  await page.locator('tbody tr').first().click()
  await expect(page.locator(SHEET).first()).toBeVisible({ timeout: 5000 })
  await page.goBack()
  await expect(page.locator(SHEET)).toHaveCount(0, { timeout: 5000 })
  await page.goForward()
  await expect(page.locator(SHEET).first()).toBeVisible({ timeout: 5000 })
})

test('multiple rapid Escapes after closing sheet do not raise errors', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('console', m => {
    if (m.type() === 'error') errors.push(m.text())
  })
  await page.goto(`/test-?v=${V01}`)
  await page.waitForSelector('tbody tr', { timeout: 30000 })
  await expect(page.locator(SHEET).first()).toBeVisible({ timeout: 5000 })
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press('Escape')
  }
  await expect(page.locator(SHEET)).toHaveCount(0)
  const real = errors.filter(
    e => !e.includes('Failed to load resource') && !e.includes('net::'),
  )
  expect(real).toHaveLength(0)
})

test('events: filter producing 0 rows shows the empty state', async ({
  page,
}) => {
  await page.goto('/test-protected-events')
  await page.waitForSelector('table tbody tr', { timeout: 30000 })
  const input = page.locator('input[type="text"]').first()
  await input.fill('zzz-no-match-at-all-zzz')
  await page.waitForTimeout(300)
  const rows = page.locator('table tbody tr')
  expect(await rows.count()).toBe(0)
})

test('theme choice survives a hard reload (not just route change)', async ({
  page,
}) => {
  await page.goto('/test-')
  await page.waitForSelector('.navigation', { timeout: 15000 })
  await page.evaluate(() => localStorage.setItem('theme', 'light'))
  await page.reload()
  await page.waitForSelector('.navigation', { timeout: 15000 })
  const hasDark = await page.evaluate(() =>
    document.documentElement.classList.contains('dark'),
  )
  expect(hasDark).toBe(false)
})

test('search: typing then clearing the input restores the empty state', async ({
  page,
}) => {
  await page.goto('/test-')
  await page.waitForSelector('tbody tr', { timeout: 30000 })
  const search = page.getByPlaceholder(/Find validator/i).first()
  await search.fill('Test')
  await expect(
    page.locator('[role="listbox"]').first(),
  ).toBeVisible({ timeout: 3000 })
  await search.fill('')
  // Dropdown stays empty (or hidden) when query.trim().length < 2 — see
  // src/components/validator-search/validator-search.tsx showDropdown.
  await expect(page.locator('[role="listbox"]')).toHaveCount(0, {
    timeout: 2000,
  })
})
