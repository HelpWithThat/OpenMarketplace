/**
 * Login API regression test.
 * Requires a running server (npm start) and seeded demo users.
 */
const BASE_URL = process.env.BASE_URL || 'http://localhost:43891'

let passed = 0
let failed = 0

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn()
    passed++
    console.log(`✓ ${name}`)
  } catch (error) {
    failed++
    console.error(`✗ ${name}`)
    console.error(error)
  }
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

async function login(email: string, password: string) {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const body = await res.json()
  return { res, body }
}

console.log('\n🔐 Login API tests\n')

async function main() {
await test('rejects missing credentials with 400', async () => {
  const { res, body } = await login('', '')
  assert(res.status === 400, `expected 400, got ${res.status}`)
  assert(body.error, 'expected an error message')
})

await test('rejects wrong password with 401', async () => {
  const { res, body } = await login('worker@demo.com', 'wrong-password')
  assert(res.status === 401, `expected 401, got ${res.status}`)
  assert(body.error, 'expected an error message')
})

await test('logs in worker@demo.com', async () => {
  const { res, body } = await login('worker@demo.com', 'password123')
  assert(res.status === 200, `expected 200, got ${res.status}: ${JSON.stringify(body)}`)
  assert(body.success === true, 'expected success: true')
  const setCookie = res.headers.get('set-cookie') || ''
  assert(setCookie.includes('marketplace_session'), 'expected session cookie')
})

await test('logs in buyer@demo.com', async () => {
  const { res, body } = await login('buyer@demo.com', 'password123')
  assert(res.status === 200, `expected 200, got ${res.status}: ${JSON.stringify(body)}`)
  assert(body.success === true, 'expected success: true')
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
