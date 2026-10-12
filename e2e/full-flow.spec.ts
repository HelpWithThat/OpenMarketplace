import { test, expect, Page } from '@playwright/test'
import path from 'node:path'

const buyerEmail = 'buyer@demo.com'
const workerEmail = 'worker@demo.com'
const password = 'password123'
const beforePhoto = path.join(__dirname, 'fixtures/before.png')
const afterPhoto = path.join(__dirname, 'fixtures/after.png')

async function loginAs(page: Page, email: string) {
  await page.goto('/login')
  await page.fill('#email', email)
  await page.fill('#password', password)
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/dashboard/, { timeout: 15000 })
}

async function logout(page: Page) {
  await page.goto('/dashboard')
  await page.locator('header').getByRole('button').last().click()
  await page.getByRole('menuitem', { name: 'Log out' }).click()
  await page.waitForTimeout(500)
}

/** Full-page shot with sticky/fixed chrome in document flow so the receipt isn't covered. */
async function captureFullPage(page: Page, file: string) {
  await page.addStyleTag({
    content: 'header, nav { position: static !important; }',
  })
  await page.screenshot({ path: file, fullPage: true })
}

test.describe('Full Marketplace Flow', () => {
  test.use({
    viewport: { width: 390, height: 844 },
    geolocation: { latitude: 39.7392, longitude: -104.9903 },
    permissions: ['geolocation'],
  })

  test('complete job flow with screenshots', async ({ page }) => {
    test.setTimeout(180000)

    console.log('Step 1: Worker profile')
    await loginAs(page, workerEmail)
    await page.goto('/profile')
    await expect(page.getByRole('heading', { name: 'Edit Profile' })).toBeVisible({ timeout: 15000 })
    await expect(page.locator('#name')).toHaveValue(/Alex/i, { timeout: 10000 })
    await captureFullPage(page, 'screenshots/01-signup-profile.png')
    await logout(page)

    console.log('Step 2: Buyer posts a job')
    await loginAs(page, buyerEmail)
    await page.goto('/post-job')
    await expect(page.getByRole('heading', { name: 'Post a Job' })).toBeVisible({ timeout: 15000 })

    const title = 'Mount 65-inch living room TV'
    await page.fill('#title', title)
    await page.fill('#description', 'Mount a 65-inch TV on the brick wall above the fireplace. Include before and after photos.')
    await page.fill('#categories', 'TV Mounting, Installation')
    await page.fill('#address', '123 Main St')
    await page.fill('#city', 'Denver')
    const when = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
    const local = new Date(when.getTime() - when.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16)
    await page.fill('#fixedTime', local)
    await page.fill('#estimatedDuration', '90')
    await page.fill('#fixedPrice', '150')
    await expect(page.getByRole('heading', { name: 'Prep' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'On Site' })).toBeVisible()
    await captureFullPage(page, 'screenshots/02-post-job-task-builder.png')

    await page.click('button:has-text("Post Job")')
    await page.waitForURL(/\/jobs\/[^/]+$/, { timeout: 15000 })
    const jobId = page.url().split('/').pop()
    console.log('Created job:', jobId)
    await logout(page)

    console.log('Step 3: Worker For You')
    await loginAs(page, workerEmail)
    await page.goto('/jobs/for-you')
    await expect(page.getByRole('heading', { name: 'For You' })).toBeVisible({ timeout: 15000 })
    await expect(page.getByText(/why it matched|matching|TV Mounting|Mount/i).first()).toBeVisible({ timeout: 10000 })
    await captureFullPage(page, 'screenshots/03-browse-for-you.png')

    console.log('Step 4: Job detail You\'ll get')
    await page.goto(`/jobs/${jobId}`)
    await expect(page.getByRole('heading', { name: title })).toBeVisible({ timeout: 15000 })
    await expect(page.getByText(/You'll get/i)).toBeVisible()
    await captureFullPage(page, 'screenshots/04-job-detail-youll-get.png')

    console.log('Step 5: Request + counter-offer UI')
    await page.locator('textarea').first().fill('I have 5 years of TV mounting experience.')
    await page.click('button:has-text("Submit Request")')
    await expect(page.getByText(/pending|request/i).first()).toBeVisible({ timeout: 15000 })
    await logout(page)

    await loginAs(page, buyerEmail)
    await page.goto(`/jobs/${jobId}`)
    await expect(page.getByText('Alex')).toBeVisible({ timeout: 15000 })
    await page.locator('[data-slot="button"]').filter({ hasText: 'Counter-Offer' }).click()
    await expect(page.getByText('Proposed Pay')).toBeVisible({ timeout: 10000 })
    await page.locator('input[placeholder="Amount"]').fill('160')
    await page.locator('textarea[placeholder="Explain your counter-offer"]').fill('Can you do it for $160?')
    await page.waitForTimeout(300)
    await captureFullPage(page, 'screenshots/05-counter-offer.png')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
    await page.getByRole('button', { name: 'Assign Worker' }).click()
    await expect(page.getByText(/Assigned/i).first()).toBeVisible({ timeout: 15000 })
    await logout(page)

    console.log('Step 6: Doing tasks')
    await loginAs(page, workerEmail)
    await page.goto(`/jobs/${jobId}/work`)
    await expect(page.getByText(/Complete all tasks/i)).toBeVisible({ timeout: 15000 })
    await captureFullPage(page, 'screenshots/06-doing-tasks.png')

    for (const label of ['Check In', 'Check Out']) {
      const btn = page.getByRole('button', { name: label })
      if (await btn.count()) {
        await btn.first().click()
        await page.waitForTimeout(400)
      }
    }

    const photoInputs = page.locator('input[type="file"][accept*="image"]')
    const photoCount = await photoInputs.count()
    const photos = [beforePhoto, afterPhoto]
    for (let i = 0; i < photoCount; i++) {
      await photoInputs.nth(i).setInputFiles(photos[i] || afterPhoto)
      await page.waitForTimeout(500)
    }

    await page.getByRole('button', { name: 'Submit for Approval' }).click()
    await page.waitForTimeout(2000)

    console.log('Step 7: Messages')
    await page.goto(`/messages/${jobId}`)
    await expect(page.getByPlaceholder('Type a message...')).toBeVisible({ timeout: 15000 })
    await page.fill('textarea', 'On my way with the mount kit.')
    await page.getByRole('button', { name: 'Send' }).click()
    await page.waitForTimeout(800)
    await captureFullPage(page, 'screenshots/07-messages.png')
    await logout(page)

    console.log('Step 8: Approval receipt')
    await loginAs(page, buyerEmail)
    await page.goto(`/jobs/${jobId}/approve`)
    await expect(page.getByRole('heading', { name: 'Approve Work' })).toBeVisible({ timeout: 15000 })
    await expect(page.getByText('Payment Receipt')).toBeVisible()
    await expect(page.getByText('Total You Pay')).toBeVisible()
    const thumbs = page.locator('img[src*="uploads"]')
    await expect(thumbs.first()).toBeVisible({ timeout: 10000 })
    await expect
      .poll(async () =>
        thumbs.evaluateAll((imgs) =>
          imgs.every((img) => img instanceof HTMLImageElement && img.complete && img.naturalWidth > 0)
        )
      )
      .toBe(true)
    await captureFullPage(page, 'screenshots/08-approval-receipt.png')
    await page.getByRole('button', { name: /Approve/ }).click()
    await page.waitForTimeout(2000)

    console.log('Step 9: Ratings')
    if (!page.url().includes('/rate')) {
      await page.goto(`/jobs/${jobId}/rate`)
    }
    await expect(page.getByRole('heading', { name: 'Rate Your Experience' })).toBeVisible({ timeout: 15000 })
    await page.locator('button', { hasText: '★' }).nth(4).click()
    await captureFullPage(page, 'screenshots/09-ratings.png')

    console.log('Flow complete! All 9 screenshots captured.')
  })
})
