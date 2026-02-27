import { test as base } from '@playwright/test'

export const test = base.extend({
  page: async ({ page }, use) => {
    await page.routeFromHAR('tests/fixtures/api.har', {
      url: /marinade\.finance/,
      notFound: 'abort',
    })
    await use(page)
  },
})

export { expect } from '@playwright/test'
