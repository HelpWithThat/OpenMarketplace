'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cancelCopy, WORKER_CANCEL_PENALTY_USD, type CancelRole } from '@/lib/cancel'

export function CancelJobButton({
  jobId,
  role,
  applyWorkerPenalty,
}: {
  jobId: string
  role: CancelRole
  applyWorkerPenalty?: boolean
}) {
  const router = useRouter()
  const copy = cancelCopy(role, false)
  const [confirming, setConfirming] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleCancel = async () => {
    setError('')
    setSubmitting(true)
    try {
      const res = await fetch(`/api/jobs/${jobId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Could not cancel this job')
      }
      setConfirming(false)
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const penaltyNote =
    role === 'worker' && applyWorkerPenalty
      ? `A $${WORKER_CANCEL_PENALTY_USD} cancel fee will be recorded on your account.`
      : role === 'buyer'
        ? 'If any payment was held, it will be sent back to you.'
        : null

  if (!confirming) {
    return (
      <Button
        type="button"
        size="lg"
        className="h-12 min-h-12 w-full px-6 text-base sm:w-auto"
        onClick={() => {
          setError('')
          setConfirming(true)
        }}
      >
        {copy.buttonLabel}
      </Button>
    )
  }

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-4 ring-1 ring-foreground/10">
      <div className="space-y-2">
        <p className="text-xl font-semibold">{copy.title}</p>
        <p className="text-base leading-relaxed text-muted-foreground">
          {copy.body}
          {penaltyNote ? ` ${penaltyNote}` : ''}
        </p>
      </div>
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
          onClick={handleCancel}
        >
          {submitting ? 'Cancelling…' : copy.confirmLabel}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="h-12 w-full text-base"
          disabled={submitting}
          onClick={() => setConfirming(false)}
        >
          {copy.keepLabel}
        </Button>
      </div>
    </div>
  )
}
