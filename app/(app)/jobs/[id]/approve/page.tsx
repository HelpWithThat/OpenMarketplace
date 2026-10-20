'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'
import type { BuyerFeeView } from '@/lib/fee-privacy'
import { ExpenseList } from '@/components/expense-list'
import { pendingExpenses, pendingPayReminderCopy, unapprovedExpensesNote } from '@/lib/expense-photos'

export default function ApproveJobPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [job, setJob] = useState<any>(null)
  const [jobId, setJobId] = useState<string>('')
  const [note, setNote] = useState('')
  const [continueWithout, setContinueWithout] = useState(false)

  useEffect(() => {
    params.then(p => setJobId(p.id))
  }, [params])

  useEffect(() => {
    if (jobId) loadJob()
  }, [jobId])

  const loadJob = async () => {
    try {
      const res = await fetch(`/api/jobs/${jobId}`)
      const data = await res.json()
      setJob(data.job)
      setContinueWithout(false)
    } catch (err) {
      setError('Failed to load job')
    } finally {
      setLoading(false)
    }
  }

  const payWork = async () => {
    setError('')
    setSubmitting(true)

    try {
      const res = await fetch(`/api/jobs/${jobId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          note,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to approve job')
      }

      router.push(`/jobs/${jobId}/rate`)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="container max-w-2xl py-8 px-4">Loading...</div>
  }

  if (!job || !job.assignment) {
    return <div className="container max-w-2xl py-8 px-4">Job not found or not assigned</div>
  }

  const fees = job.fees as BuyerFeeView | undefined
  const laborValue = fees?.laborValue ?? job.assignment.agreedPay ?? job.fixedPrice ?? 0
  const yourFee = fees?.yourFee ?? 0
  const expenses: any[] = job.assignment.expenses || []
  const pending = pendingExpenses(expenses)
  const reminder = pendingPayReminderCopy(expenses)
  const unapprovedNote = unapprovedExpensesNote(expenses)
  const totalExpenses = expenses
    .filter((e: any) => e.status === 'APPROVED')
    .reduce((sum: number, e: any) => sum + e.amount, 0)
  const youPay = laborValue + yourFee + totalExpenses

  const handlePayClick = async () => {
    if (pending.length > 0 && !continueWithout) {
      setContinueWithout(true)
      setError('')
      return
    }
    await payWork()
  }

  return (
    <div className="container max-w-2xl space-y-6 px-4 py-8">
      <div>
        <h1 className="mb-2 text-3xl font-bold">Approve Work</h1>
        <p className="text-muted-foreground">Review and approve completed work for {job.title}</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Work Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium">Worker</p>
            <p className="text-sm text-muted-foreground">
              {job.assignment.worker.workerProfile?.displayName || job.assignment.worker.name}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium">Submitted</p>
            <p className="text-sm text-muted-foreground">
              {formatSubmittedAt(job.assignment.submittedAt)}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Completed Tasks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {job.assignment.taskResults?.map((result: any) => (
            <div key={result.id} className="space-y-2">
              <p className="text-sm font-medium">{result.step.title}</p>
              {result.textValue && <p className="text-sm text-muted-foreground">{result.textValue}</p>}
              {result.files?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {result.files.map((file: any) => (
                    <a
                      key={file.id}
                      href={file.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <img
                        src={file.fileUrl}
                        alt={file.fileName || 'Task photo'}
                        className="h-24 w-24 rounded-md object-cover ring-1 ring-foreground/10"
                      />
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {expenses.length > 0 && (
        <ExpenseList
          jobId={jobId}
          expenses={expenses}
          isBuyer
          allowReview
          onUpdate={loadJob}
        />
      )}
      {unapprovedNote && (
        <Alert>
          <AlertDescription className="text-base">{unapprovedNote}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Payment Receipt</CardTitle>
          <CardDescription>Fee breakdown</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span>Labor</span>
            <span className="font-bold">${laborValue.toFixed(2)}</span>
          </div>
          {totalExpenses > 0 && (
            <div className="flex justify-between text-sm">
              <span>Approved Expenses</span>
              <span className="font-bold">${totalExpenses.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Your platform fee</span>
            <span>${yourFee.toFixed(2)}</span>
          </div>
          <Separator />
          <div className="flex justify-between rounded-md bg-primary-tint px-3 py-2 text-base font-bold">
            <span>Total You Pay</span>
            <span>${youPay.toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Optional Note</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note for the worker (optional)"
            rows={3}
          />
        </CardContent>
      </Card>

      {reminder && pending.length > 0 && (
        <div className="space-y-3 rounded-xl border-2 border-primary p-1">
          <ExpenseList
            jobId={jobId}
            expenses={pending}
            isBuyer
            allowReview
            onUpdate={loadJob}
            title={reminder.title}
            description={reminder.body}
          />
        </div>
      )}

      {continueWithout && reminder && pending.length > 0 && (
        <div className="space-y-3 rounded-lg bg-muted/50 p-4">
          <p className="text-lg font-semibold">{reminder.confirmTitle}</p>
          <p className="text-base leading-relaxed text-muted-foreground">{reminder.confirmBody}</p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <Button
          onClick={handlePayClick}
          disabled={submitting}
          className="h-12 w-full text-base"
          size="lg"
        >
          {submitting
            ? 'Paying…'
            : pending.length > 0
              ? continueWithout
                ? reminder?.confirmLabel
                : reminder?.continueLabel
              : 'Approve & Pay'}
        </Button>
        {continueWithout && pending.length > 0 ? (
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="h-12 w-full text-base"
            disabled={submitting}
            onClick={() => setContinueWithout(false)}
          >
            {reminder?.keepLabel}
          </Button>
        ) : (
          <Button variant="outline" className="h-12 w-full text-base" onClick={() => router.back()}>
            Cancel
          </Button>
        )}
      </div>
    </div>
  )
}

function formatSubmittedAt(value: unknown): string {
  if (!value) return 'Just submitted'
  const date = value instanceof Date ? value : new Date(String(value))
  if (Number.isNaN(date.getTime())) return 'Just submitted'
  return date.toLocaleString()
}
