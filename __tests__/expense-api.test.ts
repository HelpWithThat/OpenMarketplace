/**
 * Expense approve API tests. Requires a running server and demo users.
 */
import { collectForbiddenMoneyKeys } from '../lib/fee-privacy'

const BASE_URL = process.env.BASE_URL || 'http://localhost:43891'
const PNG_1x1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
)

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

async function assignWorker(buyerCookie: string, workerCookie: string, jobId: string) {
  const offerRes = await jsonFetch(workerCookie, '/api/offers', {
    method: 'POST',
    body: JSON.stringify({ jobId, type: 'REQUEST', note: 'I can do it' }),
  })
  assert(offerRes.res.ok, `offer failed: ${JSON.stringify(offerRes.body)}`)
  const acceptRes = await jsonFetch(buyerCookie, `/api/offers/${offerRes.body.id}/respond`, {
    method: 'POST',
    body: JSON.stringify({ action: 'accept' }),
  })
  assert(acceptRes.res.ok, `accept failed: ${JSON.stringify(acceptRes.body)}`)
}

async function uploadPhoto(cookie: string, jobId: string, kind: 'RECEIPT' | 'ITEM') {
  const form = new FormData()
  form.append('file', new Blob([PNG_1x1], { type: 'image/png' }), 'receipt.png')
  form.append('kind', kind)
  const res = await fetch(`${BASE_URL}/api/jobs/${jobId}/expenses/photos`, {
    method: 'POST',
    headers: { cookie },
    body: form,
  })
  const body = await res.json().catch(() => ({}))
  return { res, body }
}

console.log('\n🧾 Expense API tests\n')

async function main() {
  const buyerCookie = await login('buyer@demo.com', 'password123')
  const workerCookie = await login('worker@demo.com', 'password123')
  const job = await postJob(buyerCookie, `Expense review ${Date.now()}`)
  await assignWorker(buyerCookie, workerCookie, job.id)

  const receipt = await uploadPhoto(workerCookie, job.id, 'RECEIPT')
  assert(receipt.res.ok, `receipt upload failed: ${JSON.stringify(receipt.body)}`)
  const itemPhoto = await uploadPhoto(workerCookie, job.id, 'ITEM')
  assert(itemPhoto.res.ok, `item upload failed: ${JSON.stringify(itemPhoto.body)}`)
  const materialsReceipt = await uploadPhoto(workerCookie, job.id, 'RECEIPT')
  assert(materialsReceipt.res.ok, `materials receipt upload failed: ${JSON.stringify(materialsReceipt.body)}`)

  await test('parking and other expenses cannot be submitted without a proof photo', async () => {
    const missingJob = await postJob(buyerCookie, `Missing proof ${Date.now()}`)
    await assignWorker(buyerCookie, workerCookie, missingJob.id)
    const { res, body } = await jsonFetch(workerCookie, `/api/jobs/${missingJob.id}/submit`, {
      method: 'POST',
      body: JSON.stringify({
        results: {},
        expenses: [{ type: 'PARKING', amount: 6, note: 'Street meter' }],
      }),
    })
    assert(res.status === 400, `expected 400, got ${res.status} ${JSON.stringify(body)}`)
    assert(/photo|receipt|meter/i.test(body.error || ''), body.error)
  })

  const submitRes = await jsonFetch(workerCookie, `/api/jobs/${job.id}/submit`, {
    method: 'POST',
    body: JSON.stringify({
      results: {},
      expenses: [
        {
          type: 'PARKING',
          amount: 12.5,
          note: 'Lot parking',
          photos: [receipt.body, itemPhoto.body],
        },
        {
          type: 'MATERIALS',
          amount: 8,
          note: 'Supplies',
          photos: [materialsReceipt.body],
        },
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
  assert(parking.photos?.length === 2, `expected 2 photos, got ${parking.photos?.length}`)
  assert(!parking.photos.some((p: any) => p.path), 'photo path must not leak to the client')
  const photoUrl = parking.photos[0].url as string
  assert(photoUrl.includes(`/api/jobs/${job.id}/expenses/${parking.id}/photos/`), 'gated photo url')

  await test('expense review without confirm is rejected', async () => {
    const { res, body } = await jsonFetch(
      buyerCookie,
      `/api/jobs/${job.id}/expenses/${parking.id}`,
      { method: 'POST', body: JSON.stringify({ action: 'approve' }) }
    )
    assert(res.status === 400, `expected 400, got ${res.status}`)
    assert(body.error, 'expected an error message')
  })

  await test('decline is not offered and is rejected', async () => {
    const { res, body } = await jsonFetch(
      buyerCookie,
      `/api/jobs/${job.id}/expenses/${materials.id}`,
      { method: 'POST', body: JSON.stringify({ action: 'decline', confirm: true }) }
    )
    assert(res.status === 400, `expected 400, got ${res.status}`)
    assert(/not approved|left out/i.test(body.error || ''), body.error)
  })

  await test('worker cannot approve expenses', async () => {
    const { res } = await jsonFetch(
      workerCookie,
      `/api/jobs/${job.id}/expenses/${parking.id}`,
      { method: 'POST', body: JSON.stringify({ action: 'approve', confirm: true }) }
    )
    assert(res.status === 403, `expected 403, got ${res.status}`)
  })

  await test('buyer and worker can view expense photos; others cannot', async () => {
    const buyerPhoto = await fetch(`${BASE_URL}${photoUrl}`, { headers: { cookie: buyerCookie } })
    assert(buyerPhoto.ok, `buyer should see expense photo: ${buyerPhoto.status}`)
    assert((buyerPhoto.headers.get('content-type') || '').includes('image/png'), 'png content type')

    const workerPhoto = await fetch(`${BASE_URL}${photoUrl}`, { headers: { cookie: workerCookie } })
    assert(workerPhoto.ok, `worker should see expense photo: ${workerPhoto.status}`)

    const publicLeak = await fetch(`${BASE_URL}/api/uploads/${receipt.body.path}`)
    assert(publicLeak.status === 404, `public uploads must not serve expense photos, got ${publicLeak.status}`)

    const signupEmail = `stranger-${Date.now()}@demo.com`
    const signup = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: signupEmail,
        password: 'password123',
        name: 'Stranger',
        isWorker: true,
        isBuyer: false,
      }),
    })
    assert(signup.ok, `signup failed: ${signup.status}`)
    const strangerCookie = await login(signupEmail, 'password123')
    const strangerPhoto = await fetch(`${BASE_URL}${photoUrl}`, { headers: { cookie: strangerCookie } })
    assert(
      strangerPhoto.status === 404 || strangerPhoto.status === 403,
      `stranger must not see expense photo, got ${strangerPhoto.status}`
    )
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
    assert(!/youPay|payout|penalty|declin/i.test(notice.message), 'notice must not leak buyer totals or say declined')
  })

  await test('unapproved expenses are left out of payment totals', async () => {
    const buyerJob = await jsonFetch(buyerCookie, `/api/jobs/${job.id}`)
    assert(Number(buyerJob.body.job.fees?.expensesTotal) === 12.5, 'only approved expenses count for the buyer')
    const buyerLeaked = collectForbiddenMoneyKeys(buyerJob.body, 'buyer')
    assert(buyerLeaked.length === 0, `buyer job leaked ${buyerLeaked.join(', ')}`)

    const workerJob = await jsonFetch(workerCookie, `/api/jobs/${job.id}`)
    assert(Number(workerJob.body.job.fees?.expensesTotal) === 12.5, 'worker also sees only approved expenses in their total')
    assert(workerJob.body.job.fees?.youPay === undefined, 'worker must not receive youPay')
    const workerLeaked = collectForbiddenMoneyKeys(workerJob.body, 'worker')
    assert(workerLeaked.length === 0, `worker job leaked ${workerLeaked.join(', ')}`)
  })

  await test('pay page data includes each pending expense with photos so they cannot be missed', async () => {
    const extraJob = await postJob(buyerCookie, `Pay reminder ${Date.now()}`)
    await assignWorker(buyerCookie, workerCookie, extraJob.id)
    const extraReceipt = await uploadPhoto(workerCookie, extraJob.id, 'RECEIPT')
    const extraItem = await uploadPhoto(workerCookie, extraJob.id, 'ITEM')
    await jsonFetch(workerCookie, `/api/jobs/${extraJob.id}/submit`, {
      method: 'POST',
      body: JSON.stringify({
        results: {},
        expenses: [
          {
            type: 'PARKING',
            amount: 5,
            note: 'Meter',
            photos: [extraReceipt.body, extraItem.body],
          },
          {
            type: 'MATERIALS',
            amount: 4,
            note: 'Tape',
            photos: [await uploadPhoto(workerCookie, extraJob.id, 'RECEIPT').then((r) => r.body)],
          },
        ],
      }),
    })
    const buyerJob = await jsonFetch(buyerCookie, `/api/jobs/${extraJob.id}`)
    const pending = (buyerJob.body.job?.assignment?.expenses || []).filter((e: any) => e.status === 'PENDING')
    assert(pending.length === 2, `expected 2 pending expenses for the pay reminder, got ${pending.length}`)
    const meter = pending.find((e: any) => e.type === 'PARKING')
    assert(meter?.photos?.length === 2, 'pending expense must include photos on the pay payload')
    assert(meter.photos.every((p: any) => typeof p.url === 'string' && !p.path), 'photos are gated URLs, not storage paths')
    assert(Number(buyerJob.body.job.fees?.expensesTotal) === 0, 'pending expenses are not in the pay total yet')
  })

  await test('paying is allowed while an expense is still not approved, and that amount is left out', async () => {
    const extraJob = await postJob(buyerCookie, `Pending expense pay ${Date.now()}`)
    await assignWorker(buyerCookie, workerCookie, extraJob.id)
    const meterProof = await uploadPhoto(workerCookie, extraJob.id, 'RECEIPT')
    await jsonFetch(workerCookie, `/api/jobs/${extraJob.id}/submit`, {
      method: 'POST',
      body: JSON.stringify({
        results: {},
        expenses: [{ type: 'PARKING', amount: 5, note: 'Meter', photos: [meterProof.body] }],
      }),
    })
    const { res, body } = await jsonFetch(buyerCookie, `/api/jobs/${extraJob.id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ note: '' }),
    })
    assert(res.ok, `pay should succeed with unapproved expenses left out: ${res.status} ${JSON.stringify(body)}`)
    assert(Number(body.fees?.expensesTotal) === 0, 'unapproved expense must not be paid')
    assert(Number(body.payment?.expensesTotal) === 0, 'payment record leaves unapproved expenses out')
  })

  await test('non-image uploads are rejected', async () => {
    const form = new FormData()
    form.append('file', new Blob(['hello world'], { type: 'text/plain' }), 'notes.txt')
    form.append('kind', 'RECEIPT')
    const extraJob = await postJob(buyerCookie, `Bad photo ${Date.now()}`)
    await assignWorker(buyerCookie, workerCookie, extraJob.id)
    const res = await fetch(`${BASE_URL}/api/jobs/${extraJob.id}/expenses/photos`, {
      method: 'POST',
      headers: { cookie: workerCookie },
      body: form,
    })
    assert(res.status === 400, `expected 400, got ${res.status}`)
  })

  console.log(`\n${passed} passed, ${failed} failed`)
  if (failed > 0) process.exit(1)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
