'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

export function JobOffersList({ jobId, offers, onUpdate }: { jobId: string; offers: any[]; onUpdate: () => void }) {
  const [responding, setResponding] = useState<string | null>(null)
  const [proposedPay, setProposedPay] = useState('')
  const [proposedHours, setProposedHours] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  const handleRespond = async (offerId: string, action: 'accept' | 'counter' | 'decline') => {
    setError('')
    setResponding(offerId)

    try {
      const res = await fetch(`/api/offers/${offerId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          proposedPay: proposedPay ? parseFloat(proposedPay) : undefined,
          proposedHours: proposedHours ? parseFloat(proposedHours) : undefined,
          note,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to respond to offer')
      }

      onUpdate()
      setProposedPay('')
      setProposedHours('')
      setNote('')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setResponding(null)
    }
  }

  if (offers.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No requests yet
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {offers.map((offer) => (
        <Card key={offer.id}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-lg">
                  {offer.worker.workerProfile?.displayName || offer.worker.name}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {new Date(offer.createdAt).toLocaleDateString()}
                </p>
              </div>
              <Badge>{offer.status}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {offer.note && (
              <div>
                <p className="text-sm font-medium">Message:</p>
                <p className="text-sm text-muted-foreground">{offer.note}</p>
              </div>
            )}

            {offer.proposedPay && (
              <div className="text-sm">
                <span className="font-medium">Counter-offer labor: </span>
                ${offer.proposedPay}
                {offer.proposedHours && ` for ${offer.proposedHours} hours`}
                <p className="mt-1 text-xs text-muted-foreground">
                  Labor price only. Your fee is added on your receipt — the worker never sees what you pay.
                </p>
              </div>
            )}

            {offer.counterNote && (
              <div>
                <p className="text-sm font-medium">Counter-offer note:</p>
                <p className="text-sm text-muted-foreground">{offer.counterNote}</p>
              </div>
            )}

            {offer.status === 'PENDING' && (
              <div className="flex gap-2">
                <Button
                  onClick={() => handleRespond(offer.id, 'accept')}
                  disabled={responding === offer.id}
                >
                  Assign Worker
                </Button>
                <Dialog>
                  <DialogTrigger render={<Button variant="outline" disabled={responding === offer.id} />}>
                    Counter-Offer
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Make Counter-Offer</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Proposed Pay</Label>
                        <Input
                          type="number"
                          value={proposedPay}
                          onChange={(e) => setProposedPay(e.target.value)}
                          placeholder="Amount"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Proposed Hours (if applicable)</Label>
                        <Input
                          type="number"
                          value={proposedHours}
                          onChange={(e) => setProposedHours(e.target.value)}
                          placeholder="Hours"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Note</Label>
                        <Textarea
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          placeholder="Explain your counter-offer"
                        />
                      </div>
                      <Button
                        onClick={() => handleRespond(offer.id, 'counter')}
                        disabled={responding === offer.id}
                        className="w-full"
                      >
                        Send Counter-Offer
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
                <Button
                  variant="ghost"
                  onClick={() => handleRespond(offer.id, 'decline')}
                  disabled={responding === offer.id}
                >
                  Decline
                </Button>
              </div>
            )}

            {offer.status === 'COUNTER_OFFER' && (
              <Alert>
                <AlertDescription>
                  Waiting for worker to respond to counter-offer
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
