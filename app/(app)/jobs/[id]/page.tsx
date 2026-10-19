import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import { JobDetailClient } from '@/components/job-detail-client'
import { feesForJob, moneyRoleForUser } from '@/lib/fee-privacy'
import { assignmentForDisplay } from '@/lib/assignment'

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }

  const userId = user.id
  const job = await prisma.job.findUnique({
    where: { id },
    include: {
      buyer: {
        include: { buyerProfile: true },
      },
      taskSections: {
        include: { steps: true },
        orderBy: { order: 'asc' },
      },
      offers: {
        include: {
          worker: {
            include: { workerProfile: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
      assignment: {
        include: {
          worker: {
            include: { workerProfile: true },
          },
        },
      },
    },
  })

  if (!job) {
    notFound()
  }

  const viewJob = { ...job, assignment: assignmentForDisplay(job) }
  const role = moneyRoleForUser(user, viewJob)
  const fees = feesForJob(viewJob, role)
  return (
    <JobDetailClient
      job={viewJob}
      userId={userId}
      isWorker={user.isWorker}
      isBuyer={job.buyerId === userId}
      fees={fees}
    />
  )
}
