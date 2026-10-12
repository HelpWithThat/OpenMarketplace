'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useRouter } from 'next/navigation'

export function RequestJobButton({ jobId, hasRequested }: { jobId: string; hasRequested: boolean }) {
  const router = useRouter()
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleRequest = async () => {
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId,
          type: 'REQUEST',
          note,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to submit request')
      }

      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to submit request')
    } finally {
      setLoading(false)
    }
  }

  if (hasRequested) {
    return <p className="text-sm text-muted-foreground">Your request is pending</p>
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Textarea
        placeholder="Optional: Add a note to introduce yourself or explain why you're a great fit"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={3}
        disabled={loading}
      />
      <Button onClick={handleRequest} disabled={loading} className="w-full">
        {loading ? 'Submitting...' : 'Submit Request'}
      </Button>
    </div>
  )
}
