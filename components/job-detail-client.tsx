'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { RequestJobButton } from '@/components/request-job-button'
import { JobOffersList } from '@/components/job-offers-list'
import { WorkerOfferCard } from '@/components/worker-offer-card'
import type { RoleFeeView } from '@/lib/fee-privacy'
import { FeeCallout } from '@/components/fee-callout'

export function JobDetailClient({
  job,
  userId,
  isWorker,
  isBuyer,
  fees,
}: {
  job: any
  userId: string
  isWorker: boolean
  isBuyer: boolean
  fees: RoleFeeView
}) {
  const router = useRouter()
  const [refreshKey, setRefreshKey] = useState(0)

  const workerOffers = job.offers.filter((o: any) => o.workerId === userId)
  const hasRequested = workerOffers.length > 0
  const workerOffer = workerOffers[0]

  const handleRefresh = () => {
    setRefreshKey(refreshKey + 1)
    router.refresh()
  }

  return (
    <div className="container max-w-4xl space-y-6 px-4 py-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-bold">{job.title}</h1>
          <p className="text-muted-foreground">
            Posted by {job.buyer.buyerProfile?.businessName || job.buyer.name} •{' '}
            {new Date(job.publishedAt || job.createdAt).toLocaleDateString()}
          </p>
        </div>
        <Badge>{job.status}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Job Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="mb-2 text-sm font-medium">Description</h3>
            <p className="text-sm text-muted-foreground">{job.description}</p>
          </div>

          {job.categories.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-medium">Categories</h3>
              <div className="flex flex-wrap gap-2">
                {job.categories.map((cat: string) => (
                  <Badge key={cat} variant="outline">
                    {cat}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <Separator />

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <h3 className="mb-1 text-sm font-medium">Location</h3>
              <p className="text-sm text-muted-foreground">
                {job.locationType === 'ON_SITE' ? `${job.address || ''}, ${job.city}` : job.locationType.replace('_', ' ')}
              </p>
            </div>
            <div>
              <h3 className="mb-1 text-sm font-medium">Schedule</h3>
              <p className="text-sm text-muted-foreground">
                {job.scheduleType === 'FIXED'
                  ? job.fixedTime ? new Date(job.fixedTime).toLocaleString() : 'Fixed'
                  : job.scheduleType.replace('_', ' ')}
              </p>
            </div>
            {job.estimatedDuration && (
              <div>
                <h3 className="mb-1 text-sm font-medium">Duration</h3>
                <p className="text-sm text-muted-foreground">
                  {formatEstimatedDuration(job.estimatedDuration)}
                </p>
              </div>
            )}
          </div>

          <Separator />

          <div>
            <h3 className="mb-2 text-sm font-medium">Payment</h3>
            {job.payType === 'FIXED' ? (
              <p className="text-sm font-bold">Fixed: ${job.fixedPrice}</p>
            ) : (
              <p className="text-sm font-bold">
                Hourly: ${job.hourlyRate}/hr (max {job.maxHours} hours)
              </p>
            )}
            <FeeCallout fees={fees} className="mt-2 text-sm" />
          </div>

          {job.expensesAllowed && (
            <div>
              <h3 className="mb-1 text-sm font-medium">Expenses</h3>
              <p className="text-sm text-muted-foreground">
                Up to ${job.expenseBudget || 0} for approved expenses
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {job.taskSections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Tasks</CardTitle>
            <CardDescription>Steps to complete this job</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {job.taskSections.map((section: any) => (
              <div key={section.id} className="space-y-2">
                <h3 className="font-medium">{section.name}</h3>
                <ul className="ml-4 space-y-1">
                  {section.steps.map((step: any) => (
                    <li key={step.id} className="text-sm text-muted-foreground">
                      • {step.title}
                      {step.required && <span className="ml-1 text-destructive">*</span>}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Worker view: request or view their offer */}
      {!isBuyer && isWorker && job.status === 'OPEN' && !workerOffer && (
        <Card>
          <CardHeader>
            <CardTitle>Request This Job</CardTitle>
            <CardDescription>Submit a request to work on this job</CardDescription>
          </CardHeader>
          <CardContent>
            <RequestJobButton jobId={job.id} hasRequested={hasRequested} />
          </CardContent>
        </Card>
      )}

      {/* Worker's own offer/counter-offer */}
      {!isBuyer && isWorker && workerOffer && (
        <WorkerOfferCard offer={workerOffer} jobId={job.id} onUpdate={handleRefresh} />
      )}

      {/* Buyer view: see all offers and assign */}
      {isBuyer && job.status === 'OPEN' && (
        <Card>
          <CardHeader>
            <CardTitle>Requests ({job.offers.length})</CardTitle>
            <CardDescription>Review requests and assign a worker</CardDescription>
          </CardHeader>
          <CardContent>
            <JobOffersList jobId={job.id} offers={job.offers} onUpdate={handleRefresh} />
          </CardContent>
        </Card>
      )}

      {/* Assignment card */}
      {job.assignment && (
        <Card>
          <CardHeader>
            <CardTitle>Assignment</CardTitle>
            <CardDescription>
              {isBuyer
                ? `Assigned to ${job.assignment.worker.workerProfile?.displayName || job.assignment.worker.name}`
                : 'You are assigned to this job'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              {!isBuyer && (
                <Button onClick={() => router.push(`/jobs/${job.id}/work`)}>
                  Start/Continue Work
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => router.push(`/messages/${job.id}`)}
              >
                Messages
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function formatEstimatedDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} minutes (estimated)`
  const hours = minutes / 60
  const label = Number.isInteger(hours)
    ? `${hours} hour${hours === 1 ? '' : 's'}`
    : `${hours.toFixed(1)} hours`
  return `${minutes} minutes / ${label} (estimated)`
}
