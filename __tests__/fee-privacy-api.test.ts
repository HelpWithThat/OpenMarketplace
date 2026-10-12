/**
 * Proves each role's job API omits the other side's money.
 * Requires a running server and seeded jobs (job-open).
 */
import {
  BUYER_FORBIDDEN_MONEY_KEYS,
  WORKER_FORBIDDEN_MONEY_KEYS,
  collectForbiddenMoneyKeys,
} from '../lib/fee-privacy'

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
  const cookie = res.headers.get('set-cookie')
  assert(res.ok && cookie, `login failed for ${email}: ${JSON.stringify(body)}`)
  return cookie!.split(';')[0]
}

async function getJob(cookie: string, jobId: string) {
  const res = await fetch(`${BASE_URL}/api/jobs/${jobId}`, {
    headers: { cookie },
  })
  const body = await res.json()
  assert(res.ok, `GET /api/jobs/${jobId} failed: ${res.status} ${JSON.stringify(body)}`)
  return body
}

console.log('\n💸 Fee privacy API tests\n')

async function main() {
  await test('worker GET /api/jobs/job-open omits buyer amounts and has youGet', async () => {
    const cookie = await login('worker@demo.com', 'password123')
    const body = await getJob(cookie, 'job-open')
    const leaked = collectForbiddenMoneyKeys(body, 'worker')
    assert(leaked.length === 0, `worker payload leaked ${leaked.join(', ')}`)
    for (const key of WORKER_FORBIDDEN_MONEY_KEYS) {
      assert(!(key in (body.job?.fees || {})), `worker fees contained ${key}`)
    }
    assert(body.job?.fees?.role === 'worker', `expected worker fees, got ${JSON.stringify(body.job?.fees)}`)
    assert(typeof body.job.fees.youGet === 'number', 'worker fees.youGet missing')
    assert(typeof body.job.fees.yourFee === 'number', 'worker fees.yourFee missing')
    assert(typeof body.job.fees.laborValue === 'number', 'worker fees.laborValue missing')
    assert(body.job.fees.youPay === undefined, 'worker must not receive youPay')
    assert(body.job.fees.buyerFee === undefined, 'worker must not receive buyerFee')
    assert(body.job.fees.buyerPays === undefined, 'worker must not receive buyerPays')
  })

  await test('buyer GET /api/jobs/job-open omits worker amounts and has youPay', async () => {
    const cookie = await login('buyer@demo.com', 'password123')
    const body = await getJob(cookie, 'job-open')
    const leaked = collectForbiddenMoneyKeys(body, 'buyer')
    assert(leaked.length === 0, `buyer payload leaked ${leaked.join(', ')}`)
    for (const key of BUYER_FORBIDDEN_MONEY_KEYS) {
      assert(!(key in (body.job?.fees || {})), `buyer fees contained ${key}`)
    }
    assert(body.job?.fees?.role === 'buyer', `expected buyer fees, got ${JSON.stringify(body.job?.fees)}`)
    assert(typeof body.job.fees.youPay === 'number', 'buyer fees.youPay missing')
    assert(typeof body.job.fees.yourFee === 'number', 'buyer fees.yourFee missing')
    assert(typeof body.job.fees.laborValue === 'number', 'buyer fees.laborValue missing')
    assert(body.job.fees.youGet === undefined, 'buyer must not receive youGet')
    assert(body.job.fees.workerFee === undefined, 'buyer must not receive workerFee')
    assert(body.job.fees.workerGets === undefined, 'buyer must not receive workerGets')
    assert(body.job.fees.workerPayout === undefined, 'buyer must not receive workerPayout')
  })

  await test('same job: worker youGet !== buyer youPay', async () => {
    const workerCookie = await login('worker@demo.com', 'password123')
    const buyerCookie = await login('buyer@demo.com', 'password123')
    const workerBody = await getJob(workerCookie, 'job-open')
    const buyerBody = await getJob(buyerCookie, 'job-open')
    assert(workerBody.job.fees.laborValue === buyerBody.job.fees.laborValue, 'labor should match')
    assert(workerBody.job.fees.youGet !== buyerBody.job.fees.youPay, 'payout and buyer total must differ')
  })

  console.log(`\n${passed} passed, ${failed} failed`)
  if (failed > 0) process.exit(1)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
