/**
 * Cancel API tests. Requires a running server and seeded demo users.
 * Creates its own jobs so seed fixtures stay intact.
 */
import { collectForbiddenMoneyKeys } from '../lib/fee-privacy'
import { WORKER_CANCEL_PENALTY_USD } from '../lib/cancel'

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
      description: 'Cancel-flow test job',
      categories: ['Handyman'],
      locationType: 'ON_SITE',
      address: '100 Test St',
      city: 'Denver',
      scheduleType: 'ANYTIME',
      payType: 'FIXED',
      fixedPrice: 80,
      expensesAllowed: false,
    }),
  })
  assert(res.ok && body.id, `post job failed: ${res.status} ${JSON.stringify(body)}`)
  return body
}

console.log('\n🚫 Cancel API tests\n')

async function main() {
  await test('cancel without confirm is rejected', async () => {
    const cookie = await login('worker@demo.com', 'password123')
    const { res, body } = await jsonFetch(cookie, '/api/jobs/job-assigned/cancel', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    assert(res.status === 400, `expected 400, got ${res.status}`)
    assert(body.error, 'expected an error message')
  })

  await test('worker cancel reopens the job, records $25 penalty, and does not leak buyer money', async () => {
    const buyerCookie = await login('buyer@demo.com', 'password123')
    const workerCookie = await login('worker@demo.com', 'password123')
    const job = await postJob(buyerCookie, `Cancel reopen ${Date.now()}`)

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

    const cancelRes = await jsonFetch(workerCookie, `/api/jobs/${job.id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ confirm: true }),
    })
    assert(cancelRes.res.ok, `worker cancel failed: ${JSON.stringify(cancelRes.body)}`)
    assert(cancelRes.body.reopened === true, 'job should reopen')
    assert(cancelRes.body.job.status === 'OPEN', 'job status OPEN')
    assert(cancelRes.body.yourPenalty?.amount === WORKER_CANCEL_PENALTY_USD, 'worker sees $25 penalty')
    assert(cancelRes.body.yourRefund === undefined, 'worker must not see buyer refund')
    const leaked = collectForbiddenMoneyKeys(cancelRes.body, 'worker')
    assert(leaked.length === 0, `worker cancel leaked ${leaked.join(', ')}`)

    const buyerJob = await jsonFetch(buyerCookie, `/api/jobs/${job.id}`)
    assert(buyerJob.body.job.status === 'OPEN', 'buyer sees job open again')
    assert(buyerJob.body.job.assignment == null, 'cancelled assignment is hidden while job is open')
    const buyerLeaked = collectForbiddenMoneyKeys(buyerJob.body, 'buyer')
    assert(buyerLeaked.length === 0, `buyer job leaked ${buyerLeaked.join(', ')}`)

    const notes = await jsonFetch(buyerCookie, '/api/notifications')
    const cancelNote = (notes.body.notifications || []).find(
      (n: any) => n.type === 'JOB_CANCELLED' && n.linkUrl === `/jobs/${job.id}`
    )
    assert(cancelNote, 'buyer should be notified')
    assert(!/\$/.test(cancelNote.message), `buyer notification leaked money: ${cancelNote.message}`)
  })

  await test('buyer cancel closes the job, notifies the worker, and does not leak worker money', async () => {
    const buyerCookie = await login('buyer@demo.com', 'password123')
    const workerCookie = await login('worker@demo.com', 'password123')
    const job = await postJob(buyerCookie, `Buyer cancel ${Date.now()}`)

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

    const cancelRes = await jsonFetch(buyerCookie, `/api/jobs/${job.id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ confirm: true }),
    })
    assert(cancelRes.res.ok, `buyer cancel failed: ${JSON.stringify(cancelRes.body)}`)
    assert(cancelRes.body.reopened === false, 'buyer cancel must not reopen')
    assert(cancelRes.body.job.status === 'CANCELLED', 'job is cancelled')
    assert(cancelRes.body.yourPenalty === undefined, 'buyer must not see worker penalty')
    assert(cancelRes.body.yourRefund, 'buyer should see refund info')
    const leaked = collectForbiddenMoneyKeys(cancelRes.body, 'buyer')
    assert(leaked.length === 0, `buyer cancel leaked ${leaked.join(', ')}`)

    const workerJob = await jsonFetch(workerCookie, `/api/jobs/${job.id}`)
    assert(workerJob.body.job.status === 'CANCELLED', 'worker sees cancelled job')
    const workerLeaked = collectForbiddenMoneyKeys(workerJob.body, 'worker')
    assert(workerLeaked.length === 0, `worker job leaked ${workerLeaked.join(', ')}`)

    const notes = await jsonFetch(workerCookie, '/api/notifications')
    const cancelNote = (notes.body.notifications || []).find(
      (n: any) => n.type === 'JOB_CANCELLED' && n.linkUrl === `/jobs/${job.id}`
    )
    assert(cancelNote, 'assigned worker should be notified')
    assert(!/\$/.test(cancelNote.message), `worker notification leaked money: ${cancelNote.message}`)
  })

  await test('buyer can cancel an open job before anyone is assigned', async () => {
    const buyerCookie = await login('buyer@demo.com', 'password123')
    const workerCookie = await login('worker@demo.com', 'password123')
    const job = await postJob(buyerCookie, `Open cancel ${Date.now()}`)

    await jsonFetch(workerCookie, '/api/offers', {
      method: 'POST',
      body: JSON.stringify({ jobId: job.id, type: 'REQUEST', note: 'I can do it' }),
    })

    const cancelRes = await jsonFetch(buyerCookie, `/api/jobs/${job.id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ confirm: true }),
    })
    assert(cancelRes.res.ok, `buyer open-cancel failed: ${JSON.stringify(cancelRes.body)}`)
    assert(cancelRes.body.job.status === 'CANCELLED', 'open job should close')
    assert(cancelRes.body.reopened === false, 'must not reopen')

    const notes = await jsonFetch(workerCookie, '/api/notifications')
    const cancelNote = (notes.body.notifications || []).find(
      (n: any) => n.type === 'JOB_CANCELLED' && n.linkUrl === `/jobs/${job.id}`
    )
    assert(cancelNote, 'interested worker should be notified')
  })

  await test('a stranger cannot cancel someone else\'s job', async () => {
    const buyerCookie = await login('buyer@demo.com', 'password123')
    const workerCookie = await login('worker@demo.com', 'password123')
    const job = await postJob(buyerCookie, `Stranger cancel ${Date.now()}`)
    const { res } = await jsonFetch(workerCookie, `/api/jobs/${job.id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ confirm: true }),
    })
    assert(res.status === 403, `expected 403, got ${res.status}`)
  })

  console.log(`\n${passed} passed, ${failed} failed`)
  if (failed > 0) process.exit(1)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
