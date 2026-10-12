import { test, expect } from '@playwright/test'

const password = 'password123'

async function loginThroughForm(page: import('@playwright/test').Page, email: string) {
  await page.goto('/login')
  await page.fill('#email', email)
  await page.fill('#password', password)
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/dashboard/, { timeout: 15000 })
  await expect(page).not.toHaveURL(/\/login/)
}

test.describe('Repeated form login', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('worker@demo.com logs in 3 times in a row', async ({ page }) => {
    for (let i = 1; i <= 3; i++) {
      await loginThroughForm(page, 'worker@demo.com')
      console.log(`worker login ${i}/3 ok → ${page.url()}`)
      await page.goto('/login')
    }
  })

  test('buyer@demo.com logs in 3 times in a row', async ({ page }) => {
    for (let i = 1; i <= 3; i++) {
      await loginThroughForm(page, 'buyer@demo.com')
      console.log(`buyer login ${i}/3 ok → ${page.url()}`)
      await page.goto('/login')
    }
  })
})
