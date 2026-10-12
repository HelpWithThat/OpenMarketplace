# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: login-test.spec.ts >> Login Flow Test >> should log in as buyer successfully
- Location: e2e/login-test.spec.ts:23:7

# Error details

```
TimeoutError: page.waitForURL: Timeout 10000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
============================================================
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - generic [ref=e4]:
      - generic [ref=e5]: Open Marketplace
      - generic [ref=e6]: Log in to your account
    - generic [ref=e7]:
      - generic [ref=e8]:
        - alert [ref=e9]:
          - generic [ref=e10]: Internal server error
        - generic [ref=e11]:
          - text: Email
          - textbox "Email" [ref=e12]:
            - /placeholder: you@example.com
            - text: buyer@demo.com
        - generic [ref=e13]:
          - text: Password
          - textbox "Password" [ref=e14]: password123
      - generic [ref=e15]:
        - button "Log in" [ref=e16]
        - paragraph [ref=e17]:
          - text: Don't have an account?
          - link "Sign up" [ref=e18] [cursor=pointer]:
            - /url: /signup
  - alert [ref=e19]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test'
  2  | 
  3  | test.describe('Login Flow Test', () => {
  4  |   test.use({ viewport: { width: 390, height: 844 } })
  5  | 
  6  |   test('should log in as worker successfully', async ({ page }) => {
  7  |     await page.goto('http://localhost:43891/login')
  8  |     await page.waitForLoadState('domcontentloaded')
  9  |     
  10 |     await page.fill('input[type="email"]', 'worker@demo.com')
  11 |     await page.fill('input[type="password"]', 'password123')
  12 |     await page.click('button[type="submit"]')
  13 |     
  14 |     // Wait for navigation after login
  15 |     await page.waitForURL(/\/(dashboard|onboarding|jobs)/, { timeout: 10000 })
  16 |     
  17 |     // Verify we're logged in (should see dashboard or similar)
  18 |     const url = page.url()
  19 |     console.log(`Worker logged in, redirected to: ${url}`)
  20 |     expect(url).not.toContain('/login')
  21 |   })
  22 | 
  23 |   test('should log in as buyer successfully', async ({ page }) => {
  24 |     await page.goto('http://localhost:43891/login')
  25 |     await page.waitForLoadState('domcontentloaded')
  26 |     
  27 |     await page.fill('input[type="email"]', 'buyer@demo.com')
  28 |     await page.fill('input[type="password"]', 'password123')
  29 |     await page.click('button[type="submit"]')
  30 |     
  31 |     // Wait for navigation after login
> 32 |     await page.waitForURL(/\/(dashboard|onboarding|jobs)/, { timeout: 10000 })
     |                ^ TimeoutError: page.waitForURL: Timeout 10000ms exceeded.
  33 |     
  34 |     // Verify we're logged in
  35 |     const url = page.url()
  36 |     console.log(`Buyer logged in, redirected to: ${url}`)
  37 |     expect(url).not.toContain('/login')
  38 |   })
  39 | })
  40 | 
```