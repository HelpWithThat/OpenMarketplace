import {
  decideExpenseReview,
  expenseConfirmCopy,
  expenseNotificationText,
  formatExpenseLabel,
} from './expenses'
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

console.log('\n🧾 Expense review tests\n')

test('buyer can review a pending expense', () => {
  const decision = decideExpenseReview({
    userId: 'buyer-1',
    job: { buyerId: 'buyer-1', status: 'SUBMITTED' },
    expense: { status: 'PENDING' },
  })
  assert(decision.ok, 'expected ok')
})

test('worker cannot review expenses', () => {
  const decision = decideExpenseReview({
    userId: 'worker-1',
    job: { buyerId: 'buyer-1', status: 'SUBMITTED' },
    expense: { status: 'PENDING' },
  })
  assert(!decision.ok && decision.status === 403, 'worker is forbidden')
})

test('already reviewed expenses cannot be changed', () => {
  const decision = decideExpenseReview({
    userId: 'buyer-1',
    job: { buyerId: 'buyer-1', status: 'SUBMITTED' },
    expense: { status: 'APPROVED' },
  })
  assert(!decision.ok && decision.status === 400, 'already reviewed')
})

test('expense labels stay plain', () => {
  assert(formatExpenseLabel({ type: 'PARKING', note: 'Lot A' }) === 'Parking: Lot A', 'label with note')
  assert(formatExpenseLabel({ type: 'TRAVEL' }) === 'Travel', 'label without note')
})

test('notifications include the expense amount but not payout keys', () => {
  const approved = expenseNotificationText({
    action: 'approve',
    jobTitle: 'Count inventory',
    expense: { type: 'PARKING', note: 'Lot A', amount: 12.5 },
  })
  const declined = expenseNotificationText({
    action: 'decline',
    jobTitle: 'Count inventory',
    expense: { type: 'MATERIALS', note: 'Pens', amount: 8 },
  })
  assert(approved.message.includes('$12.50'), 'approved notice has expense amount')
  assert(declined.message.includes('$8.00'), 'declined notice has expense amount')
  for (const note of [approved, declined]) {
    assert(!/youPay|youGet|payout|penalty/i.test(note.title + note.message), note.message)
    assert(collectForbiddenMoneyKeys(note, 'worker').length === 0, 'worker-forbidden keys in notice')
    assert(collectForbiddenMoneyKeys(note, 'buyer').length === 0, 'buyer-forbidden keys in notice')
  }
})

test('confirm copy tells the buyer they will or will not pay the expense', () => {
  const approve = expenseConfirmCopy('approve', { type: 'PARKING', amount: 12.5, note: 'Lot A' })
  const decline = expenseConfirmCopy('decline', { type: 'PARKING', amount: 12.5, note: 'Lot A' })
  assert(approve.body.includes('$12.50'), 'approve mentions amount')
  assert(decline.body.includes('will not pay'), 'decline says will not pay')
  assert(!/youGet|workerPayout/i.test(approve.body + decline.body), 'no worker payout in confirm copy')
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
