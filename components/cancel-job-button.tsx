'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
  const [open, setOpen] = useState(false)
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
      setOpen(false)
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

  return (
    <>
      <Button
        type="button"
        size="lg"
        className="h-12 min-h-12 w-full px-6 text-base sm:w-auto"
        onClick={() => {
          setError('')
          setOpen(true)
        }}
      >
        {copy.buttonLabel}
      </Button>

      <Dialog open={open} onOpenChange={(nextOpen) => setOpen(nextOpen)}>
        <DialogContent className="sm:max-w-md" showCloseButton={!submitting}>
          <DialogHeader>
            <DialogTitle className="text-xl">{copy.title}</DialogTitle>
            <DialogDescription className="text-base leading-relaxed">
              {copy.body}
              {penaltyNote ? ` ${penaltyNote}` : ''}
            </DialogDescription>
          </DialogHeader>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <DialogFooter className="gap-2 sm:justify-stretch">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="h-12 flex-1 text-base"
              disabled={submitting}
              onClick={() => setOpen(false)}
            >
              {copy.keepLabel}
            </Button>
            <Button
              type="button"
              size="lg"
              className="h-12 flex-1 text-base"
              disabled={submitting}
              onClick={handleCancel}
            >
              {submitting ? 'Cancelling…' : copy.confirmLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
