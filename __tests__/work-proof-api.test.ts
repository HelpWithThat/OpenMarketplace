/**
 * Task work-proof API tests. Requires a running server and demo users.
 */
import { WORK_PROOF_REQUIRED_MESSAGE } from '../lib/work-proof'

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

async function postJob(
  cookie: string,
  title: string,
  photoProofRequired: boolean
) {
  const { res, body } = await jsonFetch(cookie, '/api/jobs', {
    method: 'POST',
    body: JSON.stringify({
      title,
      description: 'Work-proof test job',
      categories: ['Handyman'],
      locationType: 'ON_SITE',
      address: '100 Test St',
      city: 'Denver',
      scheduleType: 'ANYTIME',
      payType: 'FIXED',
      fixedPrice: 80,
      expensesAllowed: false,
      taskSections: [
        {
          name: 'Work',
          steps: [
            {
              type: 'CHECKBOX',
              title: 'Mount the fan',
              required: true,
              photoProofRequired,
            },
          ],
        },
      ],
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

async function uploadWorkProof(cookie: string, jobId: string, stepId: string) {
  const form = new FormData()
  form.append('file', new Blob([PNG_1x1], { type: 'image/png' }), 'finished.png')
  const res = await fetch(`${BASE_URL}/api/jobs/${jobId}/tasks/${stepId}/photos`, {
    method: 'POST',
    headers: { cookie },
    body: form,
  })
  const body = await res.json().catch(() => ({}))
  return { res, body }
}

function firstStep(job: any) {
  const step = job?.taskSections?.[0]?.steps?.[0]
  assert(step?.id, 'expected a task step')
  return step
}

console.log('\n📷 Work proof API tests\n')

async function main() {
  const buyerCookie = await login('buyer@demo.com', 'password123')
  const workerCookie = await login('worker@demo.com', 'password123')

  await test('posted tasks keep the buyer Yes/No photo choice, defaulting to No', async () => {
    const offJob = await postJob(buyerCookie, `Proof off ${Date.now()}`, false)
    const offStep = firstStep(offJob)
    assert(offStep.photoProofRequired === false, 'No stays No')

    const onJob = await postJob(buyerCookie, `Proof on ${Date.now()}`, true)
    const onStep = firstStep(onJob)
    assert(onStep.photoProofRequired === true, 'Yes is stored')
  })

  await test('required work proof cannot be submitted without a photo', async () => {
    const job = await postJob(buyerCookie, `Missing work proof ${Date.now()}`, true)
    await assignWorker(buyerCookie, workerCookie, job.id)
    const step = firstStep(job)
    const { res, body } = await jsonFetch(workerCookie, `/api/jobs/${job.id}/submit`, {
      method: 'POST',
      body: JSON.stringify({
        results: { [step.id]: { completed: true } },
        expenses: [],
      }),
    })
    assert(res.status === 400, `expected 400, got ${res.status} ${JSON.stringify(body)}`)
    assert(body.error === WORK_PROOF_REQUIRED_MESSAGE, body.error)
  })

  await test('optional work proof can be submitted without a photo', async () => {
    const job = await postJob(buyerCookie, `Optional work proof ${Date.now()}`, false)
    await assignWorker(buyerCookie, workerCookie, job.id)
    const step = firstStep(job)
    const { res, body } = await jsonFetch(workerCookie, `/api/jobs/${job.id}/submit`, {
      method: 'POST',
      body: JSON.stringify({
        results: { [step.id]: { completed: true } },
        expenses: [],
      }),
    })
    assert(res.ok, `optional submit failed: ${res.status} ${JSON.stringify(body)}`)
  })

  await test('buyer and worker can view work proof photos; others cannot', async () => {
    const job = await postJob(buyerCookie, `Work proof photos ${Date.now()}`, true)
    await assignWorker(buyerCookie, workerCookie, job.id)
    const step = firstStep(job)
    const uploaded = await uploadWorkProof(workerCookie, job.id, step.id)
    assert(uploaded.res.ok, `upload failed: ${JSON.stringify(uploaded.body)}`)

    const submit = await jsonFetch(workerCookie, `/api/jobs/${job.id}/submit`, {
      method: 'POST',
      body: JSON.stringify({
        results: {
          [step.id]: {
            completed: true,
            proofPhotos: [uploaded.body],
          },
        },
        expenses: [],
      }),
    })
    assert(submit.res.ok, `submit failed: ${JSON.stringify(submit.body)}`)

    const buyerJob = await jsonFetch(buyerCookie, `/api/jobs/${job.id}`)
    const result = (buyerJob.body.job?.assignment?.taskResults || []).find((item: any) => item.stepId === step.id)
    assert(result?.proofPhotos?.length === 1, 'buyer should see the proof photo')
    assert(result.proofPhotos[0].url.includes(`/api/jobs/${job.id}/tasks/${step.id}/photos/`), result.proofPhotos[0].url)
    assert(!JSON.stringify(result.proofPhotos).includes('work-proof/'), 'storage path must not leak')

    const photoUrl = result.proofPhotos[0].url as string
    const buyerPhoto = await fetch(`${BASE_URL}${photoUrl}`, { headers: { cookie: buyerCookie } })
    assert(buyerPhoto.ok, `buyer should see work proof: ${buyerPhoto.status}`)

    const workerPhoto = await fetch(`${BASE_URL}${photoUrl}`, { headers: { cookie: workerCookie } })
    assert(workerPhoto.ok, `worker should see work proof: ${workerPhoto.status}`)

    const publicLeak = await fetch(`${BASE_URL}/api/uploads/${uploaded.body.path}`)
    assert(publicLeak.status === 404, `public uploads must not serve work proof, got ${publicLeak.status}`)

    const signupEmail = `stranger-proof-${Date.now()}@demo.com`
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
      `stranger must not see work proof, got ${strangerPhoto.status}`
    )
  })

  await test('non-image work proof uploads are rejected', async () => {
    const job = await postJob(buyerCookie, `Bad work proof ${Date.now()}`, true)
    await assignWorker(buyerCookie, workerCookie, job.id)
    const step = firstStep(job)
    const form = new FormData()
    form.append('file', new Blob(['hello world'], { type: 'text/plain' }), 'notes.txt')
    const res = await fetch(`${BASE_URL}/api/jobs/${job.id}/tasks/${step.id}/photos`, {
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
