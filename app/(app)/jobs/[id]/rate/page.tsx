'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Label } from '@/components/ui/label'

export default function RateJobPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [job, setJob] = useState<any>(null)
  const [jobId, setJobId] = useState<string>('')
  const [stars, setStars] = useState(0)
  const [comment, setComment] = useState('')

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
    } catch (err) {
      setError('Failed to load job')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (stars === 0) {
      setError('Please select a rating')
      return
    }

    setError('')
    setSubmitting(true)

    try {
      const res = await fetch(`/api/jobs/${jobId}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stars,
          comment,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to submit rating')
      }

      router.push('/dashboard')
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
    return <div className="container max-w-2xl py-8 px-4">Job not found</div>
  }

  const isBuyer = job.buyer && job.buyer.id
  const ratingTarget = isBuyer
    ? job.assignment.worker.workerProfile?.displayName || job.assignment.worker.name
    : job.buyer.buyerProfile?.businessName || job.buyer.name

  return (
    <div className="container max-w-2xl space-y-6 px-4 py-8">
      <div>
        <h1 className="mb-2 text-3xl font-bold">Rate Your Experience</h1>
        <p className="text-muted-foreground">How was working with {ratingTarget}?</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{job.title}</CardTitle>
          <CardDescription>
            {isBuyer ? 'Rate the worker' : 'Rate the buyer'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Rating</Label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  onClick={() => setStars(rating)}
                  className={`text-4xl transition-colors ${
                    rating <= stars ? 'text-yellow-500' : 'text-gray-300'
                  }`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="comment">Comment (optional)</Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience..."
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button onClick={handleSubmit} disabled={submitting || stars === 0} className="flex-1">
          {submitting ? 'Submitting...' : 'Submit Rating'}
        </Button>
        <Button variant="outline" onClick={() => router.push('/dashboard')}>
          Skip
        </Button>
      </div>
    </div>
  )
}
