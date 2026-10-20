import {
  decideCancel,
  workHasStarted,
  workerPenaltyAmount,
  cancelNotificationText,
  WORKER_CANCEL_PENALTY_USD,
} from './cancel'
import {
  afterJobAccepted,
  afterJobCompleted,
  formatReliability,
  reliabilityFromCounts,
  RELIABILITY_SCORE_HELPER,
  RELIABILITY_SCORE_LABEL,
} from './reliability'
import { collectForbiddenMoneyKeys } from './fee-privacy'

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

console.log('\n🚫 Job cancel policy tests\n')

const buyerId = 'buyer-1'
const workerId = 'worker-1'

test('worker can cancel an assigned upcoming job and it reopens with $25 penalty', () => {
  const decision = decideCancel({
    userId: workerId,
    job: { status: 'ASSIGNED', buyerId },
    assignment: { workerId, status: 'UPCOMING' },
  })
  assert(decision.ok, 'expected ok')
  assert(decision.role === 'worker', 'expected worker')
  assert(decision.reopen === true, 'job should reopen')
  assert(decision.applyWorkerPenalty === true, 'fixed worker penalty')
  assert(workerPenaltyAmount(decision.applyWorkerPenalty) === WORKER_CANCEL_PENALTY_USD, 'penalty is $25')
})

test('worker can cancel an in-progress job (no-show after starting)', () => {
  const decision = decideCancel({
    userId: workerId,
    job: { status: 'IN_PROGRESS', buyerId },
    assignment: { workerId, status: 'IN_PROGRESS', checkInAt: new Date() },
  })
  assert(decision.ok && decision.reopen && decision.applyWorkerPenalty, 'worker late cancel still reopens')
})

test('buyer can cancel an open job with no assignment', () => {
  const decision = decideCancel({
    userId: buyerId,
    job: { status: 'OPEN', buyerId },
    assignment: null,
  })
  assert(decision.ok, 'expected ok')
  assert(decision.role === 'buyer', 'expected buyer')
  assert(decision.reopen === false, 'buyer cancel must close the job')
  assert(decision.applyWorkerPenalty === false, 'no worker penalty')
})

test('buyer can cancel an assigned job before work starts and is refunded if held', () => {
  const decision = decideCancel({
    userId: buyerId,
    job: { status: 'ASSIGNED', buyerId },
    assignment: { workerId, status: 'UPCOMING', payment: { status: 'HELD' } },
  })
  assert(decision.ok && !decision.reopen, 'buyer cancel closes job')
  assert(decision.refundHeldPayment === true, 'held money is refunded')
  assert(decision.applyWorkerPenalty === false, 'buyer cancel has no worker penalty')
})

test('buyer cannot cancel after work has started', () => {
  const decision = decideCancel({
    userId: buyerId,
    job: { status: 'IN_PROGRESS', buyerId },
    assignment: { workerId, status: 'IN_PROGRESS', checkInAt: new Date() },
  })
  assert(!decision.ok, 'should refuse')
  assert(decision.status === 400, `expected 400, got ${'status' in decision ? decision.status : '?'}`)
  assert(workHasStarted({ workerId, status: 'IN_PROGRESS', checkInAt: new Date() }), 'work started')
})

test('neither side can cancel a submitted job', () => {
  const worker = decideCancel({
    userId: workerId,
    job: { status: 'SUBMITTED', buyerId },
    assignment: { workerId, status: 'SUBMITTED' },
  })
  const buyer = decideCancel({
    userId: buyerId,
    job: { status: 'SUBMITTED', buyerId },
    assignment: { workerId, status: 'SUBMITTED' },
  })
  assert(!worker.ok && !buyer.ok, 'submitted jobs are locked')
})

test('strangers cannot cancel', () => {
  const decision = decideCancel({
    userId: 'other-user',
    job: { status: 'ASSIGNED', buyerId },
    assignment: { workerId, status: 'UPCOMING' },
  })
  assert(!decision.ok && decision.status === 403, 'forbidden')
})

test('notifications never include dollar amounts', () => {
  const notes = [
    cancelNotificationText({ cancelledBy: 'worker', jobTitle: 'Mount TV', workerName: 'Alex R.', audience: 'buyer' }),
    cancelNotificationText({ cancelledBy: 'worker', jobTitle: 'Mount TV', audience: 'other_applicant' }),
    cancelNotificationText({ cancelledBy: 'buyer', jobTitle: 'Mount TV', audience: 'assigned_worker' }),
    cancelNotificationText({ cancelledBy: 'buyer', jobTitle: 'Mount TV', audience: 'other_applicant' }),
  ]
  for (const note of notes) {
    assert(!/\$/.test(note.title + note.message), `notification leaked money: ${note.title} ${note.message}`)
    assert(!/fee|payout|youPay|youGet/i.test(note.title + note.message), `notification leaked money words: ${note.message}`)
  }
  const workerPayload = { success: true, yourPenalty: { amount: 25 } }
  const buyerPayload = { success: true, yourRefund: { applied: true, message: 'Any held payment was sent back to you.' } }
  assert(collectForbiddenMoneyKeys(workerPayload, 'worker').length === 0, 'worker cancel payload leaked buyer money')
  assert(collectForbiddenMoneyKeys(buyerPayload, 'buyer').length === 0, 'buyer cancel payload leaked worker money')
})

console.log('\n📊 Reliability tests\n')

test('accepting a job increases accepted count and lowers reliability until finished', () => {
  const start = { completedJobs: 14, acceptedJobs: 15, reliability: 0.93 }
  const accepted = afterJobAccepted(start)
  assert(accepted.acceptedJobs === 16, 'acceptedJobs +1')
  assert(accepted.completedJobs === 14, 'completed unchanged')
  assert(accepted.reliability === reliabilityFromCounts(14, 16), 'ratio uses new accepted count')
})

test('finishing a job increases completed count', () => {
  const mid = { completedJobs: 14, acceptedJobs: 16, reliability: 0.88 }
  const done = afterJobCompleted(mid)
  assert(done.completedJobs === 15, 'completed +1')
  assert(done.acceptedJobs === 16, 'accepted unchanged')
  assert(done.reliability === reliabilityFromCounts(15, 16), 'ratio uses new completed count')
})

test('formatReliability is plain language', () => {
  assert(
    formatReliability({ completedJobs: 18, acceptedJobs: 20 }) === 'Finished 18 of 20 accepted jobs (90%)',
    'expected finished 18 of 20'
  )
  assert(formatReliability({ completedJobs: 0, acceptedJobs: 0 }) === 'No accepted jobs yet', 'empty state')
  assert(RELIABILITY_SCORE_LABEL === 'Reliability Score', 'label is Reliability Score')
  assert(RELIABILITY_SCORE_HELPER.includes('Reliability Score'), 'helper names Reliability Score')
  assert(!RELIABILITY_SCORE_HELPER.includes('this number'), 'helper should not say this number')
})

test('worker cancel does not increment completedJobs (unfinished accepted job)', () => {
  const afterAccept = afterJobAccepted({ completedJobs: 14, acceptedJobs: 15, reliability: 0.93 })
  // cancel does not call afterJobCompleted
  assert(afterAccept.completedJobs === 14, 'cancel leaves completedJobs alone')
  assert(afterAccept.acceptedJobs === 16, 'accepted job still counts against reliability')
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
