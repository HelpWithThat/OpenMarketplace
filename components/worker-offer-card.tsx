'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

export function WorkerOfferCard({ offer, jobId, onUpdate }: { offer: any; jobId: string; onUpdate: () => void }) {
  const [responding, setResponding] = useState(false)
  const [proposedPay, setProposedPay] = useState(offer.proposedPay?.toString() || '')
  const [proposedHours, setProposedHours] = useState(offer.proposedHours?.toString() || '')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  const handleCounter = async () => {
    setError('')
    setResponding(true)

    try {
      const res = await fetch(`/api/offers/${offer.id}/counter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposedPay: proposedPay ? parseFloat(proposedPay) : undefined,
          proposedHours: proposedHours ? parseFloat(proposedHours) : undefined,
          note,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to send counter-offer')
      }

      onUpdate()
      setNote('')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setResponding(false)
    }
  }

  const handleAcceptCounter = async () => {
    setError('')
    setResponding(true)

    try {
      const res = await fetch(`/api/offers/${offer.id}/accept-counter`, {
        method: 'POST',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to accept counter-offer')
      }

      onUpdate()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setResponding(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Your Request</CardTitle>
            <CardDescription>
              Submitted {new Date(offer.createdAt).toLocaleDateString()}
            </CardDescription>
          </div>
          <Badge>{offer.status}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {offer.note && (
          <div>
            <p className="text-sm font-medium">Your message:</p>
            <p className="text-sm text-muted-foreground">{offer.note}</p>
          </div>
        )}

        {offer.status === 'PENDING' && (
          <Alert>
            <AlertDescription>
              Waiting for buyer to review your request
            </AlertDescription>
          </Alert>
        )}

        {offer.status === 'COUNTER_OFFER' && (
          <>
            <Alert>
              <AlertDescription>
                The buyer has made a counter-offer
              </AlertDescription>
            </Alert>

            {offer.proposedPay && (
              <div>
                <p className="text-sm font-medium">Counter-offer:</p>
                <p className="text-lg font-bold">
                  ${offer.proposedPay} labor
                  {offer.proposedHours && ` for ${offer.proposedHours} hours`}
                </p>
                <p className="text-xs text-muted-foreground">
                  Labor price only. Your fee comes out of what you receive — you never see what the buyer pays.
                </p>
              </div>
            )}

            {offer.counterNote && (
              <div>
                <p className="text-sm font-medium">Buyer's note:</p>
                <p className="text-sm text-muted-foreground">{offer.counterNote}</p>
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={handleAcceptCounter} disabled={responding}>
                Accept Counter-Offer
              </Button>
              <Dialog>
                <DialogTrigger render={<Button variant="outline" disabled={responding} />}>
                  Make New Counter-Offer
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Counter-Offer</DialogTitle>
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
                      <Label>Proposed Hours</Label>
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
                      onClick={handleCounter}
                      disabled={responding}
                      className="w-full"
                    >
                      Send Counter-Offer
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </>
        )}

        {offer.status === 'APPROVED' && (
          <Alert>
            <AlertDescription>
              Approved! You've been assigned to this job.
            </AlertDescription>
          </Alert>
        )}

        {offer.status === 'REJECTED' && (
          <Alert variant="destructive">
            <AlertDescription>
              This request was declined by the buyer.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
