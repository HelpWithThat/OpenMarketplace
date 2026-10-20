import {
  decideExpenseReview,
  expenseConfirmCopy,
  expenseHasProof,
  expenseNotificationText,
  expenseProofFields,
  EXPENSE_PROOF_REQUIRED_MESSAGE,
  formatExpenseLabel,
} from './expenses'
import {
  canAccessJobExpenses,
  expenseStatusLabel,
  pendingPayReminderCopy,
  unapprovedExpensesNote,
} from './expense-photos'
import { collectForbiddenMoneyKeys } from './fee-privacy'
import { detectImageMime, isOwnedExpensePhotoPath, validateExpensePhotoBuffer } from './expense-photo-storage'

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

const PNG_1x1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
)

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

test('every expense type, including parking, requires proof photos', () => {
  assert(expenseHasProof([{ kind: 'RECEIPT' }]), 'receipt counts as proof')
  assert(!expenseHasProof([]), 'empty is missing')
  assert(!expenseHasProof(null), 'null is missing')
  const parking = expenseProofFields('PARKING')
  assert(parking.proofTitle.includes('Parking proof'), parking.proofTitle)
  assert(parking.proofHelp.includes('meter'), parking.proofHelp)
  assert(parking.proofHelp.includes('gallery'), parking.proofHelp)
  assert(parking.proofHelp.includes('Take a photo'), parking.proofHelp)
  assert(!parking.showItems, 'parking does not need item photos')
  assert(!expenseProofFields('TRAVEL').showItems, 'travel is proof-only')
  assert(!expenseProofFields('TOLLS').showItems, 'tolls are proof-only')
  assert(expenseProofFields('MATERIALS').showItems, 'materials still has item photos')
  assert(expenseProofFields('OTHER').showItems, 'other still has item photos')
  assert(expenseProofFields('TRAVEL').proofHelp.includes('gallery'), 'travel uses the same upload')
  assert(EXPENSE_PROOF_REQUIRED_MESSAGE.includes('parking receipt'), EXPENSE_PROOF_REQUIRED_MESSAGE)
  assert(EXPENSE_PROOF_REQUIRED_MESSAGE.includes('meter'), EXPENSE_PROOF_REQUIRED_MESSAGE)
})

test('approval notification includes the expense amount but not payout keys', () => {
  const approved = expenseNotificationText({
    jobTitle: 'Count inventory',
    expense: { type: 'PARKING', note: 'Lot A', amount: 12.5 },
  })
  assert(approved.message.includes('$12.50'), 'approved notice has expense amount')
  assert(!/declin/i.test(approved.title + approved.message), 'notice should not say declined')
  assert(!/youPay|youGet|payout|penalty/i.test(approved.title + approved.message), approved.message)
  assert(collectForbiddenMoneyKeys(approved, 'worker').length === 0, 'worker-forbidden keys in notice')
  assert(collectForbiddenMoneyKeys(approved, 'buyer').length === 0, 'buyer-forbidden keys in notice')
})

test('confirm copy tells the buyer they will pay the expense', () => {
  const approve = expenseConfirmCopy({ type: 'PARKING', amount: 12.5, note: 'Lot A' })
  assert(approve.body.includes('$12.50'), 'approve mentions amount')
  assert(!/declin/i.test(approve.title + approve.body), 'confirm should not say decline')
  assert(!/youGet|workerPayout/i.test(approve.body), 'no worker payout in confirm copy')
})

test('UI status is Approved or Not approved, never declined', () => {
  assert(expenseStatusLabel('APPROVED') === 'Approved', 'approved')
  assert(expenseStatusLabel('PENDING') === 'Not approved', 'pending')
  assert(expenseStatusLabel('REJECTED') === 'Not approved', 'legacy rejected')
})

test('pay-page note lists expenses that are not approved', () => {
  const note = unapprovedExpensesNote([
    { status: 'APPROVED', type: 'PARKING', note: 'Lot', amount: 12.5 },
    { status: 'PENDING', type: 'MATERIALS', note: 'Pens', amount: 8 },
  ])
  assert(note, 'expected a note')
  assert(note.includes('Materials: Pens'), 'lists the unapproved expense')
  assert(note.includes('$8.00'), 'lists the amount')
  assert(!note.includes('Parking'), 'does not list approved expenses')
  assert(!/declin/i.test(note), 'does not say declined')
})

test('pay reminder lists each pending expense so they cannot be missed', () => {
  const reminder = pendingPayReminderCopy([
    { status: 'APPROVED', type: 'PARKING', note: 'Lot', amount: 12.5 },
    { status: 'PENDING', type: 'MATERIALS', note: 'Pens', amount: 8 },
    { status: 'PENDING', type: 'TRAVEL', note: 'Bus', amount: 3 },
  ])
  assert(reminder, 'expected a reminder when expenses are still pending')
  assert(reminder.title.includes('before you pay'), reminder.title)
  assert(reminder.confirmBody.includes('Materials: Pens'), 'lists first pending expense')
  assert(reminder.confirmBody.includes('Travel: Bus'), 'lists second pending expense')
  assert(!reminder.confirmBody.includes('Parking'), 'does not treat approved expenses as pending')
  assert(!/declin/i.test(JSON.stringify(reminder)), 'reminder should not say declined')
  assert(pendingPayReminderCopy([{ status: 'APPROVED', type: 'PARKING', amount: 5 }]) === null, 'no reminder when none pending')
})

test('only the job buyer and assigned worker can see expense photos', () => {
  const job = { buyerId: 'buyer-1', assignment: { workerId: 'worker-1' } }
  assert(canAccessJobExpenses('buyer-1', job), 'buyer')
  assert(canAccessJobExpenses('worker-1', job), 'worker')
  assert(!canAccessJobExpenses('stranger', job), 'stranger')
})

test('expense photo paths stay scoped to the worker and job', () => {
  assert(isOwnedExpensePhotoPath('expenses/job-1/user-1/a.jpg', 'job-1', 'user-1'), 'owned')
  assert(!isOwnedExpensePhotoPath('expenses/job-1/user-2/a.jpg', 'job-1', 'user-1'), 'other user')
  assert(!isOwnedExpensePhotoPath('expenses/job-1/user-1/../secret.jpg', 'job-1', 'user-1'), 'traversal')
  assert(!isOwnedExpensePhotoPath('other/job-1/user-1/a.jpg', 'job-1', 'user-1'), 'wrong folder')
})

test('photo validation accepts a PNG and rejects non-images', () => {
  const ok = validateExpensePhotoBuffer(PNG_1x1)
  assert(ok.ok && ok.contentType === 'image/png', 'png accepted')
  assert(detectImageMime(PNG_1x1) === 'image/png', 'png detected')
  const bad = validateExpensePhotoBuffer(Buffer.from('not-an-image-file-here'))
  assert(!bad.ok, 'text rejected')
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
