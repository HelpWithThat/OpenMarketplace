'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  expenseConfirmCopy,
  formatExpenseLabel,
  type ExpenseAction,
} from '@/lib/expenses'

type ExpenseItem = {
  id: string
  type: string
  amount: number
  note?: string | null
  receiptUrl?: string | null
  status: string
}

function statusLabel(status: string, isBuyer: boolean): string {
  if (status === 'APPROVED') return 'Approved'
  if (status === 'REJECTED') return 'Declined'
  return isBuyer ? 'Waiting for you' : 'Waiting for the buyer'
}

export function ExpenseList({
  jobId,
  expenses,
  isBuyer,
  allowReview,
  onUpdate,
}: {
  jobId: string
  expenses: ExpenseItem[]
  isBuyer: boolean
  allowReview?: boolean
  onUpdate?: () => void
}) {
  if (!expenses?.length) return null

  const pending = expenses.filter((e) => e.status === 'PENDING')
  const canReview = isBuyer && (allowReview ?? true)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Expenses</CardTitle>
        <CardDescription>
          {isBuyer
            ? pending.length > 0
              ? 'Approve or decline each expense the worker submitted. Approved expenses are added to what you pay, with no extra fee.'
              : 'These expenses have already been reviewed.'
            : 'Expenses you submitted for this job.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {expenses.map((expense) => (
          <ExpenseRow
            key={expense.id}
            jobId={jobId}
            expense={expense}
            isBuyer={isBuyer}
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
  isBuyer,
  canReview,
  onUpdate,
}: {
  jobId: string
  expense: ExpenseItem
  isBuyer: boolean
  canReview: boolean
  onUpdate?: () => void
}) {
  const router = useRouter()
  const [confirm, setConfirm] = useState<ExpenseAction | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const copy = confirm ? expenseConfirmCopy(confirm, expense) : null

  const handleConfirm = async () => {
    if (!confirm) return
    setError('')
    setSubmitting(true)
    try {
      const res = await fetch(`/api/jobs/${jobId}/expenses/${expense.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: confirm, confirm: true }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Could not update this expense')
      }
      setConfirm(null)
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
        <Badge>{statusLabel(expense.status, isBuyer)}</Badge>
      </div>
      {expense.receiptUrl && (
        <a
          href={expense.receiptUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-base text-primary underline"
        >
          View receipt
        </a>
      )}

      {canReview && !confirm && (
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            type="button"
            size="lg"
            className="h-12 flex-1 text-base"
            onClick={() => {
              setError('')
              setConfirm('approve')
            }}
          >
            Approve
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="h-12 flex-1 text-base"
            onClick={() => {
              setError('')
              setConfirm('decline')
            }}
          >
            Decline
          </Button>
        </div>
      )}

      {confirm && copy && (
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
              onClick={() => setConfirm(null)}
            >
              {copy.keepLabel}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
