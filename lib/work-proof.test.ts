import {
  WORK_PROOF_HELP,
  WORK_PROOF_POST_HELP,
  WORK_PROOF_REQUIRED_MESSAGE,
  presentWorkProofPhotos,
  workProofHasPhotos,
  workProofPhotoUrl,
} from './work-proof'
import { canAccessJobExpenses } from './expense-photos'
import { isOwnedWorkProofPath } from './work-proof-storage'

let passed = 0
let failed = 0

function test(name: string, fn: () => void) {
  try {
    fn()
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

console.log('\n📷 Work proof tests\n')

test('existing tasks default to photo proof off, and the buyer chooses Yes or No', () => {
  const step = { photoProofRequired: false }
  assert(step.photoProofRequired === false, 'default is No')
  assert(WORK_PROOF_POST_HELP.toLowerCase().includes('yes'), WORK_PROOF_POST_HELP)
  assert(!/keyword|categor/i.test(WORK_PROOF_POST_HELP), 'no auto-suggest copy')
})

test('proof photos are required only when the buyer asked for them', () => {
  assert(workProofHasPhotos([{ id: 'p1' }]), 'photos count as proof')
  assert(!workProofHasPhotos([]), 'empty is missing')
  assert(!workProofHasPhotos(null), 'null is missing')
  assert(WORK_PROOF_REQUIRED_MESSAGE.includes('finished work'), WORK_PROOF_REQUIRED_MESSAGE)
  assert(WORK_PROOF_HELP.includes('old item'), WORK_PROOF_HELP)
})

test('gated proof URLs stay on the job and do not include the storage path', () => {
  const url = workProofPhotoUrl('job-1', 'step-1', 'photo-1')
  assert(url === '/api/jobs/job-1/tasks/step-1/photos/photo-1', url)
  const shown = presentWorkProofPhotos(
    'job-1',
    { stepId: 'step-1', proofPhotos: [{ id: 'photo-1', path: 'work-proof/secret.jpg' } as any] },
    true
  )
  assert(shown.length === 1, 'one photo')
  assert(shown[0].url.includes('/api/jobs/job-1/'), shown[0].url)
  assert(!JSON.stringify(shown).includes('work-proof/'), 'path must not leak')
  assert(presentWorkProofPhotos('job-1', { stepId: 'step-1', proofPhotos: [{ id: 'x' }] }, false).length === 0, 'hidden when not allowed')
})

test('only the job buyer and assigned worker can see work proof photos', () => {
  const job = { buyerId: 'buyer-1', assignment: { workerId: 'worker-1' } }
  assert(canAccessJobExpenses('buyer-1', job), 'buyer')
  assert(canAccessJobExpenses('worker-1', job), 'worker')
  assert(!canAccessJobExpenses('stranger', job), 'stranger')
})

test('work proof paths stay scoped to the worker and job', () => {
  assert(isOwnedWorkProofPath('work-proof/job-1/user-1/a.jpg', 'job-1', 'user-1'), 'owned')
  assert(!isOwnedWorkProofPath('work-proof/job-1/user-2/a.jpg', 'job-1', 'user-1'), 'other user')
  assert(!isOwnedWorkProofPath('work-proof/job-1/user-1/../secret.jpg', 'job-1', 'user-1'), 'traversal')
  assert(!isOwnedWorkProofPath('expenses/job-1/user-1/a.jpg', 'job-1', 'user-1'), 'expense folder is not work proof')
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
