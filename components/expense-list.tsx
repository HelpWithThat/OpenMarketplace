'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { expenseConfirmCopy, formatExpenseLabel } from '@/lib/expenses'
import { expenseStatusLabel } from '@/lib/expense-photos'
import { ExpensePhotoGallery, type ExpensePhotoView } from '@/components/expense-photo-gallery'

type ExpenseItem = {
  id: string
  type: string
  amount: number
  note?: string | null
  receiptUrl?: string | null
  status: string
  photos?: ExpensePhotoView[] | null
}

export function ExpenseList({
  jobId,
  expenses,
  isBuyer,
  allowReview,
  onUpdate,
  title,
  description,
}: {
  jobId: string
  expenses: ExpenseItem[]
  isBuyer: boolean
  allowReview?: boolean
  onUpdate?: () => void
  title?: string
  description?: string
}) {
  if (!expenses?.length) return null

  const pending = expenses.filter((e) => e.status === 'PENDING')
  const canReview = isBuyer && (allowReview ?? true)
  const heading = title || 'Expenses'
  const details =
    description ||
    (isBuyer
      ? pending.length > 0
        ? 'Approve an expense to add it to what you pay, with no extra fee. Anything you do not approve will not be paid.'
        : 'Approved expenses are added to what you pay. Anything not approved is left out.'
      : 'Expenses you submitted for this job. Anything not approved will not be paid.')

  return (
    <Card>
      <CardHeader>
        <CardTitle>{heading}</CardTitle>
        <CardDescription>{details}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {expenses.map((expense) => (
          <ExpenseRow
            key={expense.id}
            jobId={jobId}
            expense={expense}
            canReview={canReview && expense.status === 'PENDING'}
            onUpdate={onUpdate}
          />
        ))}
      </CardContent>
    </Card>
  )
}

function ExpenseRow({
  jobId,
  expense,
  canReview,
  onUpdate,
}: {
  jobId: string
  expense: ExpenseItem
  canReview: boolean
  onUpdate?: () => void
}) {
  const router = useRouter()
  const [confirm, setConfirm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const copy = expenseConfirmCopy(expense)

  const handleConfirm = async () => {
    setError('')
    setSubmitting(true)
    try {
      const res = await fetch(`/api/jobs/${jobId}/expenses/${expense.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', confirm: true }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Could not update this expense')
      }
      setConfirm(false)
      router.refresh()
      onUpdate?.()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-base font-medium">{formatExpenseLabel(expense)}</p>
          <p className="text-lg font-bold">${Number(expense.amount).toFixed(2)}</p>
        </div>
        <Badge>{expenseStatusLabel(expense.status)}</Badge>
      </div>

      <ExpensePhotoGallery photos={expense.photos} receiptUrl={expense.receiptUrl} />

      {canReview && !confirm && (
        <Button
          type="button"
          size="lg"
          className="h-12 w-full text-base"
          onClick={() => {
            setError('')
            setConfirm(true)
          }}
        >
          Approve
        </Button>
      )}

      {confirm && (
        <div className="space-y-3 rounded-lg bg-muted/50 p-3">
          <p className="text-lg font-semibold">{copy.title}</p>
          <p className="text-base leading-relaxed text-muted-foreground">{copy.body}</p>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="flex flex-col gap-3">
            <Button
              type="button"
              size="lg"
              className="h-12 w-full text-base"
              disabled={submitting}
              onClick={handleConfirm}
            >
              {submitting ? 'Saving…' : copy.confirmLabel}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="h-12 w-full text-base"
              disabled={submitting}
              onClick={() => setConfirm(false)}
            >
              {copy.keepLabel}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
