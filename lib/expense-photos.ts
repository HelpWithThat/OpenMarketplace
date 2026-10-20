import { formatExpenseLabel } from './expenses'

export const EXPENSE_PHOTO_MAX_BYTES = 8 * 1024 * 1024
export const EXPENSE_PHOTO_MAX_PER_KIND = 8

export const EXPENSE_PHOTO_KINDS = ['RECEIPT', 'ITEM'] as const
export type ExpensePhotoKindName = (typeof EXPENSE_PHOTO_KINDS)[number]

export function isExpensePhotoKind(value: unknown): value is ExpensePhotoKindName {
  return value === 'RECEIPT' || value === 'ITEM'
}

export function canAccessJobExpenses(
  userId: string,
  job: { buyerId: string; assignment?: { workerId?: string | null } | null }
): boolean {
  if (job.buyerId === userId) return true
  if (job.assignment?.workerId === userId) return true
  return false
}

export function expensePhotoClientUrl(jobId: string, expenseId: string, photoId: string): string {
  return `/api/jobs/${jobId}/expenses/${expenseId}/photos/${photoId}`
}

export type ClientExpensePhoto = {
  id: string
  kind: string
  url: string
}

export function presentExpensePhotos(
  jobId: string,
  expense: { id: string; photos?: { id: string; kind: string }[] | null },
  allowed: boolean
): ClientExpensePhoto[] {
  if (!allowed || !expense.photos?.length) return []
  return expense.photos.map((photo) => ({
    id: photo.id,
    kind: photo.kind,
    url: expensePhotoClientUrl(jobId, expense.id, photo.id),
  }))
}

export function presentAssignmentExpenses<
  T extends { workerId?: string | null; expenses?: any[] | null } | null | undefined,
>(jobId: string, assignment: T, userId: string, buyerId: string): T {
  if (!assignment?.expenses) return assignment
  const allowed = canAccessJobExpenses(userId, { buyerId, assignment })
  return {
    ...assignment,
    expenses: assignment.expenses.map((expense: any) => {
      const { photos, receiptUrl, ...rest } = expense
      return {
        ...rest,
        receiptUrl: allowed && receiptUrl && !String(receiptUrl).includes('/expenses/') ? receiptUrl : null,
        photos: presentExpensePhotos(jobId, { id: expense.id, photos }, allowed),
      }
    }),
  }
}

export function expenseStatusLabel(status: string): string {
  return status === 'APPROVED' ? 'Approved' : 'Not approved'
}

export function pendingExpenses<T extends { status: string }>(expenses: T[]): T[] {
  return expenses.filter((expense) => expense.status === 'PENDING')
}

export function unapprovedExpensesNote(
  expenses: { status: string; type: string; note?: string | null; amount: number }[]
): string | null {
  const unapproved = expenses.filter((expense) => expense.status !== 'APPROVED')
  if (!unapproved.length) return null
  const list = unapproved
    .map((expense) => `${formatExpenseLabel(expense)} ($${Number(expense.amount).toFixed(2)})`)
    .join('; ')
  return `These expenses are not approved, so they will not be paid: ${list}.`
}

export function pendingPayReminderCopy(
  expenses: { status: string; type: string; note?: string | null; amount: number }[]
) {
  const pending = pendingExpenses(expenses)
  if (!pending.length) return null
  const list = pending
    .map((expense) => `${formatExpenseLabel(expense)} ($${Number(expense.amount).toFixed(2)})`)
    .join('; ')
  return {
    title: 'Look at these expenses before you pay',
    body: 'These expenses are not approved yet. Approve any you want to pay, or continue without them. Anything you do not approve will not be paid.',
    continueLabel: 'Continue without these expenses',
    confirmTitle: 'Pay without these expenses?',
    confirmBody: `These expenses will not be paid: ${list}.`,
    confirmLabel: 'Yes, pay without them',
    keepLabel: 'Not yet',
  }
}
