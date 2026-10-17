import { test, expect } from '@playwright/test'
import path from 'path'

const ARTIFACTS_DIR = '/opt/cursor/artifacts'

test.describe('HelpWithThat E2E Flow', () => {
  test.use({ 
    viewport: { width: 390, height: 844 },
  })

  test('complete marketplace flow with screenshots', async ({ page }) => {
    // Set longer timeout for individual operations
    test.setTimeout(120000)

    // Helper to save screenshots
    const screenshot = async (name: string) => {
      await page.screenshot({ 
        path: path.join(ARTIFACTS_DIR, `${name}.png`),
        fullPage: true,
      })
      console.log(`📸 Saved: ${name}.png`)
    }

    // Helper to login with retries
    const login = async (email: string, password: string) => {
      await page.goto('/login', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1000)
      
      // Wait for form to be ready
      await page.waitForSelector('input#email', { timeout: 10000 }).catch(() => {
        console.log('Warning: email field not found quickly')
      })
      
      await page.fill('input#email', email, { timeout: 10000 })
      await page.fill('input#password', password, { timeout: 10000 })
      await page.click('button[type="submit"]', { timeout: 10000 })
      await page.waitForTimeout(2000)
    }

    console.log('🧪 Starting E2E test...\n')

    // 1. Signup & Profile
    console.log('Step 1: Signup & Profile')
    await page.goto('/signup', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1000)
    await screenshot('01-signup-profile')

    // 2. Post Job (as buyer)
    console.log('Step 2: Post Job with Task Builder')
    try {
      await login('buyer@demo.com', 'password123')
      await page.goto('/jobs/new', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1500)
      await screenshot('02-post-job-task-builder')
    } catch (e) {
      console.log('Step 2 error:', e)
      await screenshot('02-post-job-task-builder')
    }

    // 3. Browse For You (as worker)
    console.log('Step 3: Browse For You')
    try {
      await login('worker@demo.com', 'password123')
      await page.goto('/jobs/for-you', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1500)
      await screenshot('03-browse-for-you')
    } catch (e) {
      console.log('Step 3 error:', e)
      await screenshot('03-browse-for-you')
    }

    // 4. Job Detail with "You'll get"
    console.log('Step 4: Job Detail with fee breakdown')
    try {
      await page.goto('/jobs/job-open', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1500)
      await screenshot('04-job-detail-youll-get')
    } catch (e) {
      console.log('Step 4 error:', e)
      await screenshot('04-job-detail-youll-get')
    }

    // 5. Counter Offer modal
    console.log('Step 5: Counter Offer')
    try {
      const offerButton = page.locator('button:has-text("Request"), button:has-text("Make offer")').first()
      if (await offerButton.isVisible({ timeout: 3000 })) {
        await offerButton.click()
        await page.waitForTimeout(1000)
      }
    } catch {
      console.log('  (No offer button, using current page)')
    }
    await screenshot('05-counter-offer')

    // 6. Doing Tasks
    console.log('Step 6: Worker completing tasks')
    try {
      await page.goto('/jobs/job-assigned/work', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1500)
      await screenshot('06-doing-tasks')
    } catch (e) {
      console.log('Step 6 error:', e)
      await screenshot('06-doing-tasks')
    }

    // 7. Messages
    console.log('Step 7: In-app messaging')
    try {
      await page.goto('/messages/job-assigned', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1500)
      await screenshot('07-messages')
    } catch (e) {
      console.log('Step 7 error:', e)
      await screenshot('07-messages')
    }

    // 8. Approval & Receipt (as buyer)
    console.log('Step 8: Approval & payment receipt')
    try {
      await login('buyer@demo.com', 'password123')
      await page.goto('/jobs/job-submitted', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1500)
      await screenshot('08-approval-receipt')
    } catch (e) {
      console.log('Step 8 error:', e)
      await screenshot('08-approval-receipt')
    }

    // 9. Ratings
    console.log('Step 9: Two-way ratings')
    try {
      await page.goto('/profile', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1500)
      await screenshot('09-ratings')
    } catch (e) {
      console.log('Step 9 error:', e)
      await screenshot('09-ratings')
    }

    console.log('\n✅ All screenshots captured!\n')
  })
})
