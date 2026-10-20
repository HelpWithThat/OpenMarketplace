/**
 * Expense approve/decline API tests. Requires a running server and demo users.
 */
import { collectForbiddenMoneyKeys } from '../lib/fee-privacy'

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

async function jsonFetch(cookie: string, path: string, init: RequestInit = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      cookie,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  })
  const body = await res.json().catch(() => ({}))
  return { res, body }
}

async function postJob(cookie: string, title: string) {
  const { res, body } = await jsonFetch(cookie, '/api/jobs', {
    method: 'POST',
    body: JSON.stringify({
      title,
      description: 'Expense-flow test job',
      categories: ['Handyman'],
      locationType: 'ON_SITE',
      address: '100 Test St',
      city: 'Denver',
      scheduleType: 'ANYTIME',
      payType: 'FIXED',
      fixedPrice: 80,
      expensesAllowed: true,
      expenseBudget: 40,
    }),
  })
  assert(res.ok && body.id, `post job failed: ${res.status} ${JSON.stringify(body)}`)
  return body
}

console.log('\n🧾 Expense API tests\n')

async function main() {
  const buyerCookie = await login('buyer@demo.com', 'password123')
  const workerCookie = await login('worker@demo.com', 'password123')
  const job = await postJob(buyerCookie, `Expense review ${Date.now()}`)

  const offerRes = await jsonFetch(workerCookie, '/api/offers', {
    method: 'POST',
    body: JSON.stringify({ jobId: job.id, type: 'REQUEST', note: 'I can do it' }),
  })
  assert(offerRes.res.ok, `offer failed: ${JSON.stringify(offerRes.body)}`)

  const acceptRes = await jsonFetch(buyerCookie, `/api/offers/${offerRes.body.id}/respond`, {
    method: 'POST',
    body: JSON.stringify({ action: 'accept' }),
  })
  assert(acceptRes.res.ok, `accept failed: ${JSON.stringify(acceptRes.body)}`)

  const submitRes = await jsonFetch(workerCookie, `/api/jobs/${job.id}/submit`, {
    method: 'POST',
    body: JSON.stringify({
      results: {},
      expenses: [
        { type: 'PARKING', amount: 12.5, note: 'Lot parking' },
        { type: 'MATERIALS', amount: 8, note: 'Supplies' },
      ],
    }),
  })
  assert(submitRes.res.ok, `submit failed: ${JSON.stringify(submitRes.body)}`)

  const jobAfterSubmit = await jsonFetch(buyerCookie, `/api/jobs/${job.id}`)
  const expenses = jobAfterSubmit.body.job?.assignment?.expenses || []
  assert(expenses.length === 2, `expected 2 expenses, got ${expenses.length}`)
  const parking = expenses.find((e: any) => e.type === 'PARKING')
  const materials = expenses.find((e: any) => e.type === 'MATERIALS')
  assert(parking && materials, 'missing submitted expenses')

  await test('expense review without confirm is rejected', async () => {
    const { res, body } = await jsonFetch(
      buyerCookie,
      `/api/jobs/${job.id}/expenses/${parking.id}`,
      { method: 'POST', body: JSON.stringify({ action: 'approve' }) }
    )
    assert(res.status === 400, `expected 400, got ${res.status}`)
    assert(body.error, 'expected an error message')
  })

  await test('worker cannot approve expenses', async () => {
    const { res } = await jsonFetch(
      workerCookie,
      `/api/jobs/${job.id}/expenses/${parking.id}`,
      { method: 'POST', body: JSON.stringify({ action: 'approve', confirm: true }) }
    )
    assert(res.status === 403, `expected 403, got ${res.status}`)
  })

  await test('buyer approve records status, notifies worker, and does not leak payout', async () => {
    const { res, body } = await jsonFetch(
      buyerCookie,
      `/api/jobs/${job.id}/expenses/${parking.id}`,
      { method: 'POST', body: JSON.stringify({ action: 'approve', confirm: true }) }
    )
    assert(res.ok, `approve failed: ${JSON.stringify(body)}`)
    assert(body.expense?.status === 'APPROVED', 'expense should be approved')
    assert(Number(body.expense?.amount) === 12.5, 'buyer can see the expense amount')
    const leaked = collectForbiddenMoneyKeys(body, 'buyer')
    assert(leaked.length === 0, `buyer expense payload leaked ${leaked.join(', ')}`)

    const notes = await jsonFetch(workerCookie, '/api/notifications')
    const notice = (notes.body.notifications || []).find(
      (n: any) => n.type === 'EXPENSE_UPDATE' && n.linkUrl === `/jobs/${job.id}` && n.title === 'Expense approved'
    )
    assert(notice, 'worker should be notified of approval')
    assert(notice.message.includes('$12.50'), 'worker sees the expense amount they submitted')
    assert(!/youPay|payout|penalty/i.test(notice.message), 'notice must not leak buyer totals')
  })

  await test('buyer decline excludes the expense from payment totals', async () => {
    const { res, body } = await jsonFetch(
      buyerCookie,
      `/api/jobs/${job.id}/expenses/${materials.id}`,
      { method: 'POST', body: JSON.stringify({ action: 'decline', confirm: true }) }
    )
    assert(res.ok, `decline failed: ${JSON.stringify(body)}`)
    assert(body.expense?.status === 'REJECTED', 'expense should be declined')

    const buyerJob = await jsonFetch(buyerCookie, `/api/jobs/${job.id}`)
    assert(Number(buyerJob.body.job.fees?.expensesTotal) === 12.5, 'only approved expenses count for the buyer')
    const buyerLeaked = collectForbiddenMoneyKeys(buyerJob.body, 'buyer')
    assert(buyerLeaked.length === 0, `buyer job leaked ${buyerLeaked.join(', ')}`)

    const workerJob = await jsonFetch(workerCookie, `/api/jobs/${job.id}`)
    assert(Number(workerJob.body.job.fees?.expensesTotal) === 12.5, 'worker also sees only approved expenses in their total')
    assert(workerJob.body.job.fees?.youPay === undefined, 'worker must not receive youPay')
    const workerLeaked = collectForbiddenMoneyKeys(workerJob.body, 'worker')
    assert(workerLeaked.length === 0, `worker job leaked ${workerLeaked.join(', ')}`)

    const notes = await jsonFetch(workerCookie, '/api/notifications')
    const notice = (notes.body.notifications || []).find(
      (n: any) => n.type === 'EXPENSE_UPDATE' && n.title === 'Expense declined' && n.linkUrl === `/jobs/${job.id}`
    )
    assert(notice, 'worker should be notified of decline')
  })

  await test('paying is blocked while an expense is still pending', async () => {
    const extraJob = await postJob(buyerCookie, `Pending expense pay ${Date.now()}`)
    const extraOffer = await jsonFetch(workerCookie, '/api/offers', {
      method: 'POST',
      body: JSON.stringify({ jobId: extraJob.id, type: 'REQUEST' }),
    })
    await jsonFetch(buyerCookie, `/api/offers/${extraOffer.body.id}/respond`, {
      method: 'POST',
      body: JSON.stringify({ action: 'accept' }),
    })
    await jsonFetch(workerCookie, `/api/jobs/${extraJob.id}/submit`, {
      method: 'POST',
      body: JSON.stringify({
        results: {},
        expenses: [{ type: 'PARKING', amount: 5, note: 'Meter' }],
      }),
    })
    const { res, body } = await jsonFetch(buyerCookie, `/api/jobs/${extraJob.id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ note: '' }),
    })
    assert(res.status === 400, `expected 400, got ${res.status} ${JSON.stringify(body)}`)
  })

  console.log(`\n${passed} passed, ${failed} failed`)
  if (failed > 0) process.exit(1)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
