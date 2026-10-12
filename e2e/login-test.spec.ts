import { test, expect } from '@playwright/test'

test.describe('Login Flow Test', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('should log in as worker successfully', async ({ page }) => {
    await page.goto('http://localhost:43891/login')
    await page.waitForLoadState('domcontentloaded')
    
    await page.fill('input[type="email"]', 'worker@demo.com')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')
    
    // Wait for navigation after login
    await page.waitForURL(/\/(dashboard|onboarding|jobs)/, { timeout: 10000 })
    
    // Verify we're logged in (should see dashboard or similar)
    const url = page.url()
    console.log(`Worker logged in, redirected to: ${url}`)
    expect(url).not.toContain('/login')
  })

  test('should log in as buyer successfully', async ({ page }) => {
    await page.goto('http://localhost:43891/login')
    await page.waitForLoadState('domcontentloaded')
    
    await page.fill('input[type="email"]', 'buyer@demo.com')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')
    
    // Wait for navigation after login
    await page.waitForURL(/\/(dashboard|onboarding|jobs)/, { timeout: 10000 })
    
    // Verify we're logged in
    const url = page.url()
    console.log(`Buyer logged in, redirected to: ${url}`)
    expect(url).not.toContain('/login')
  })
})
