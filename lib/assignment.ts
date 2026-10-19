import { prisma } from './prisma'
import { afterJobAccepted, afterJobCompleted, type ReliabilityCounts } from './reliability'

type Tx = typeof prisma

export function assignmentForDisplay<
  T extends { status: string; assignment?: { status: string } | null },
>(job: T): T['assignment'] {
  const assignment = job.assignment
  if (!assignment) return null
  if (job.status === 'OPEN' && assignment.status === 'CANCELLED') return null
  return assignment
}

export async function bumpAcceptedJobs(workerId: string, db: Tx = prisma) {
  const profile = await db.workerProfile.findUnique({ where: { userId: workerId } })
  if (!profile) return null
  const next = afterJobAccepted(profile as ReliabilityCounts)
  return db.workerProfile.update({
    where: { userId: workerId },
    data: {
      acceptedJobs: next.acceptedJobs,
      reliability: next.reliability,
    },
  })
}

export async function bumpCompletedJobs(workerId: string, db: Tx = prisma) {
  const profile = await db.workerProfile.findUnique({ where: { userId: workerId } })
  if (!profile) return null
  const next = afterJobCompleted(profile as ReliabilityCounts)
  return db.workerProfile.update({
    where: { userId: workerId },
    data: {
      completedJobs: next.completedJobs,
      reliability: next.reliability,
    },
  })
}

export async function removeCancelledAssignment(jobId: string, db: Tx = prisma) {
  const existing = await db.assignment.findUnique({
    where: { jobId },
    include: { payment: true },
  })
  if (!existing || existing.status !== 'CANCELLED') return existing
  if (existing.payment) {
    await db.ledgerEntry.deleteMany({ where: { paymentId: existing.payment.id } })
    await db.payment.delete({ where: { id: existing.payment.id } })
  }
  await db.dispute.deleteMany({ where: { assignmentId: existing.id } })
  await db.assignment.delete({ where: { id: existing.id } })
  return null
}

export async function ensureJobThread(opts: {
  jobId: string
  participantIds: string[]
  db?: Tx
}) {
  const db = opts.db ?? prisma
  const existing = await db.messageThread.findUnique({
    where: { jobId: opts.jobId },
    include: { participants: true },
  })
  if (!existing) {
    return db.messageThread.create({
      data: {
        jobId: opts.jobId,
        participants: {
          create: opts.participantIds.map((userId) => ({ userId })),
        },
      },
    })
  }
  for (const userId of opts.participantIds) {
    if (!existing.participants.some((p) => p.userId === userId)) {
      await db.messageThreadParticipant.create({
        data: { threadId: existing.id, userId },
      })
    }
  }
  return existing
}
