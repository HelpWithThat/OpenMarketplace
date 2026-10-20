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
