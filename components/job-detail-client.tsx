'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { RequestJobButton } from '@/components/request-job-button'
import { JobOffersList } from '@/components/job-offers-list'
import { WorkerOfferCard } from '@/components/worker-offer-card'
import { CancelJobButton } from '@/components/cancel-job-button'
import { ReliabilityStat } from '@/components/reliability-stat'
import { ExpenseList } from '@/components/expense-list'
import { WorkProofGallery } from '@/components/work-proof-gallery'
import type { RoleFeeView } from '@/lib/fee-privacy'
import { FeeCallout } from '@/components/fee-callout'
import { decideCancel } from '@/lib/cancel'

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
  const workerOffer = workerOffers[0]
  const hasActiveRequest = workerOffers.some((o: any) =>
    ['PENDING', 'COUNTER_OFFER', 'ACCEPTED', 'APPROVED'].includes(o.status)
  )
  const hasRequested = hasActiveRequest
  const cancelDecision = decideCancel({
    userId,
    job: { status: job.status, buyerId: job.buyerId || (isBuyer ? userId : '') },
    assignment: job.assignment
      ? {
          workerId: job.assignment.workerId,
          status: job.assignment.status,
          checkInAt: job.assignment.checkInAt,
        }
      : null,
  })

  const handleRefresh = () => {
    setRefreshKey(refreshKey + 1)
    router.refresh()
  }

  return (
    <div className="container max-w-4xl space-y-6 px-4 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-bold">{job.title}</h1>
          <p className="text-muted-foreground">
            Posted by {job.buyer.buyerProfile?.businessName || job.buyer.name} •{' '}
            {new Date(job.publishedAt || job.createdAt).toLocaleDateString()}
          </p>
        </div>
        <Badge className="w-fit text-sm">{job.status === 'CANCELLED' ? 'Cancelled' : job.status}</Badge>
      </div>

      {job.status === 'CANCELLED' && (
        <Alert>
          <AlertDescription className="text-base">
            This job was cancelled. It is closed and will not be offered to anyone else.
          </AlertDescription>
        </Alert>
      )}

      {cancelDecision.ok && (
        <div className="space-y-2">
          <p className="text-base text-muted-foreground">
            {cancelDecision.role === 'worker'
              ? "Can't make it? You can cancel and we'll offer this job to other people."
              : "Don't need this anymore? You can cancel and close this job."}
          </p>
          <CancelJobButton
            jobId={job.id}
            role={cancelDecision.role}
            applyWorkerPenalty={cancelDecision.applyWorkerPenalty}
          />
        </div>
      )}

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
                <ul className="space-y-3">
                  {section.steps.map((step: any) => {
                    const result = (job.assignment?.taskResults || []).find((item: any) => item.stepId === step.id)
                    return (
                      <li key={step.id} className="space-y-2 text-base">
                        <p>
                          {step.title}
                          {step.required && <span className="ml-1 text-destructive">*</span>}
                        </p>
                        {step.photoProofRequired && (
                          <p className="text-base text-muted-foreground">A photo is required when this task is done.</p>
                        )}
                        <WorkProofGallery photos={result?.proofPhotos} />
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Worker view: request or view their offer */}
      {!isBuyer && isWorker && job.status === 'OPEN' && !hasActiveRequest && (
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
            {isBuyer && job.assignment.worker.workerProfile && (
              <ReliabilityStat
                completedJobs={job.assignment.worker.workerProfile.completedJobs}
                acceptedJobs={job.assignment.worker.workerProfile.acceptedJobs}
                className="text-sm text-muted-foreground"
              />
            )}
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {!isBuyer && job.status !== 'SUBMITTED' && job.status !== 'APPROVED' && job.status !== 'PAID' && (
                <Button onClick={() => router.push(`/jobs/${job.id}/work`)}>
                  Start/Continue Work
                </Button>
              )}
              {isBuyer && job.status === 'SUBMITTED' && (
                <Button size="lg" className="h-12 text-base" onClick={() => router.push(`/jobs/${job.id}/approve`)}>
                  Review work and pay
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

      {job.assignment?.expenses?.length > 0 && (
        <ExpenseList
          jobId={job.id}
          expenses={job.assignment.expenses}
          isBuyer={isBuyer}
          allowReview={
            isBuyer && !['APPROVED', 'PAID', 'CANCELLED', 'DISPUTED'].includes(job.status)
          }
          onUpdate={handleRefresh}
        />
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
