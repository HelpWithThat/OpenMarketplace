export const EXPENSE_TYPE_LABELS: Record<string, string> = {
  TRAVEL: 'Travel',
  PARKING: 'Parking',
  TOLLS: 'Tolls',
  MATERIALS: 'Materials',
  OTHER: 'Other',
}

export function formatExpenseType(type: string): string {
  return EXPENSE_TYPE_LABELS[type] || 'Other'
}

export function formatExpenseLabel(expense: { type: string; note?: string | null }): string {
  const type = formatExpenseType(expense.type)
  const note = expense.note?.trim()
  return note ? `${type}: ${note}` : type
}

export const EXPENSE_PROOF_REQUIRED_MESSAGE =
  'Please add a photo of the receipt, parking receipt, or meter/app screenshot for each expense.'

export function expenseHasProof(photos: unknown): boolean {
  return Array.isArray(photos) && photos.length > 0
}

export function expenseProofFields(type: string) {
  if (type === 'PARKING') {
    return {
      proofTitle: 'Parking proof photos',
      proofHelp:
        'Add a photo of the parking receipt, the meter, or the parking app. Take a photo or choose from your gallery. You can add more than one.',
      showItems: false,
      itemsTitle: '',
      itemsHelp: '',
      galleryProofTitle: 'Parking proof',
      galleryProofLabel: 'Parking proof',
    }
  }
  if (type === 'TRAVEL' || type === 'TOLLS') {
    return {
      proofTitle: 'Proof photos',
      proofHelp:
        'Add a photo of the receipt, ticket, or app. Take a photo or choose from your gallery. You can add more than one.',
      showItems: false,
      itemsTitle: '',
      itemsHelp: '',
      galleryProofTitle: 'Proof',
      galleryProofLabel: 'Proof',
    }
  }
  return {
    proofTitle: 'Receipt photos',
    proofHelp: 'Take a picture of the receipt, or choose one from your gallery. You can add more than one.',
    showItems: true,
    itemsTitle: 'Photos of the items',
    itemsHelp: 'Take pictures of what you bought, or choose them from your gallery.',
    galleryProofTitle: 'Receipt',
    galleryProofLabel: 'Receipt',
  }
}

const LOCKED_JOB_STATUSES = ['APPROVED', 'PAID', 'CANCELLED', 'DISPUTED'] as const

export function decideExpenseReview(opts: {
  userId: string
  job: { buyerId: string; status: string }
  expense: { status: string; assignmentId?: string }
}): { ok: true } | { ok: false; error: string; status: number } {
  if (opts.job.buyerId !== opts.userId) {
    return { ok: false, error: 'Only the buyer can approve expenses', status: 403 }
  }
  if (LOCKED_JOB_STATUSES.includes(opts.job.status as (typeof LOCKED_JOB_STATUSES)[number])) {
    return { ok: false, error: 'This job can no longer change expenses', status: 400 }
  }
  if (opts.expense.status !== 'PENDING') {
    return { ok: false, error: 'This expense was already reviewed', status: 400 }
  }
  return { ok: true }
}

export function expenseNotificationText(opts: {
  jobTitle: string
  expense: { type: string; note?: string | null; amount: number }
}): { title: string; message: string } {
  const label = formatExpenseLabel(opts.expense)
  const amount = `$${Number(opts.expense.amount).toFixed(2)}`
  return {
    title: 'Expense approved',
    message: `The buyer approved your ${amount} ${label} expense for "${opts.jobTitle}".`,
  }
}

export function expenseConfirmCopy(expense: { type: string; note?: string | null; amount: number }) {
  const label = formatExpenseLabel(expense)
  const amount = `$${Number(expense.amount).toFixed(2)}`
  return {
    title: 'Approve this expense?',
    body: `You will pay ${amount} for ${label}. It will be added to the job payment, with no extra fee.`,
    confirmLabel: 'Yes, approve it',
    keepLabel: 'Not yet',
  }
}
