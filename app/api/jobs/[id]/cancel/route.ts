import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  decideCancel,
  workerPenaltyAmount,
  cancelNotificationText,
  WORKER_CANCEL_PENALTY_RULE,
} from '@/lib/cancel'
import { omitCrossSideMoney, moneyRoleForUser } from '@/lib/fee-privacy'
import { getPaymentProvider } from '@/lib/payments'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let confirm = false
    try {
      const body = await req.json()
      confirm = body?.confirm === true
    } catch {
      confirm = false
    }
    if (!confirm) {
      return NextResponse.json(
        { error: 'Please confirm that you want to cancel this job' },
        { status: 400 }
      )
    }

    const job = await prisma.job.findUnique({
      where: { id },
      include: {
        assignment: {
          include: {
            payment: true,
            worker: { include: { workerProfile: true } },
          },
        },
        offers: true,
      },
    })

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    const decision = decideCancel({
      userId: user.id,
      job,
      assignment: job.assignment,
    })

    if (!decision.ok) {
      return NextResponse.json({ error: decision.error }, { status: decision.status })
    }

    const assignment = job.assignment
    const penaltyAmount = workerPenaltyAmount(decision.applyWorkerPenalty)
    const workerName =
      assignment?.worker.workerProfile?.displayName || assignment?.worker.name || 'The worker'

    if (decision.applyWorkerPenalty && assignment) {
      await prisma.penalty.create({
        data: {
          assignmentId: assignment.id,
          rule: WORKER_CANCEL_PENALTY_RULE,
          amount: penaltyAmount,
          reason: WORKER_CANCEL_PENALTY_RULE,
          status: 'APPLIED',
        },
      })
    }

    if (decision.refundHeldPayment && assignment?.payment) {
      const payment = assignment.payment
      const paymentProvider = getPaymentProvider()
      await paymentProvider.refund(payment.providerRef || payment.id, payment.buyerTotal)
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'REFUNDED' },
      })
      await prisma.ledgerEntry.create({
        data: {
          paymentId: payment.id,
          type: 'REFUND',
          amount: payment.buyerTotal,
          note: decision.role === 'buyer' ? 'Buyer cancelled before work started' : 'Worker cancelled; buyer refunded',
        },
      })
      if (decision.applyWorkerPenalty && penaltyAmount > 0) {
        await prisma.ledgerEntry.create({
          data: {
            paymentId: payment.id,
            type: 'PENALTY',
            amount: penaltyAmount,
            note: WORKER_CANCEL_PENALTY_RULE,
          },
        })
      }
    }

    if (assignment && (decision.role === 'worker' || decision.role === 'buyer')) {
      await prisma.assignment.update({
        where: { id: assignment.id },
        data: { status: 'CANCELLED' },
      })
    }

    const nextJobStatus = decision.reopen ? 'OPEN' : 'CANCELLED'
    await prisma.job.update({
      where: { id: job.id },
      data: { status: nextJobStatus },
    })

    if (decision.role === 'worker' && assignment) {
      await prisma.offer.updateMany({
        where: {
          jobId: job.id,
          workerId: assignment.workerId,
          status: { in: ['ACCEPTED', 'APPROVED'] },
        },
        data: { status: 'DECLINED', respondedAt: new Date() },
      })
    }

    const notifyUserIds = new Set<string>()
    const notifications: {
      userId: string
      type: 'JOB_CANCELLED'
      title: string
      message: string
      linkUrl: string
    }[] = []

    const pushNote = (
      userId: string,
      audience: 'buyer' | 'assigned_worker' | 'other_applicant'
    ) => {
      if (notifyUserIds.has(userId) || userId === user.id) return
      notifyUserIds.add(userId)
      const text = cancelNotificationText({
        cancelledBy: decision.role,
        jobTitle: job.title,
        workerName,
        audience,
      })
      notifications.push({
        userId,
        type: 'JOB_CANCELLED',
        title: text.title,
        message: text.message,
        linkUrl: `/jobs/${job.id}`,
      })
    }

    if (decision.role === 'worker') {
      pushNote(job.buyerId, 'buyer')
      for (const offer of job.offers) {
        if (assignment && offer.workerId === assignment.workerId) continue
        pushNote(offer.workerId, 'other_applicant')
      }
    } else {
      if (assignment) {
        pushNote(assignment.workerId, 'assigned_worker')
      }
      for (const offer of job.offers) {
        pushNote(offer.workerId, 'other_applicant')
      }
    }

    if (notifications.length > 0) {
      await prisma.notification.createMany({ data: notifications })
    }

    const role = moneyRoleForUser(user, job)
    const payload: Record<string, unknown> = {
      success: true,
      cancelledBy: decision.role,
      reopened: decision.reopen,
      job: { id: job.id, status: nextJobStatus, title: job.title },
    }

    if (role === 'worker' && decision.applyWorkerPenalty) {
      payload.yourPenalty = { amount: penaltyAmount, rule: WORKER_CANCEL_PENALTY_RULE }
    }
    if (role === 'buyer') {
      payload.yourRefund = {
        applied: decision.refundHeldPayment,
        message: decision.refundHeldPayment
          ? 'Any held payment was sent back to you.'
          : 'No payment was held yet, so there is nothing to send back.',
      }
    }

    return NextResponse.json(omitCrossSideMoney(payload, role))
  } catch (error) {
    console.error('Cancel job error:', error)
    return NextResponse.json({ error: 'Failed to cancel job' }, { status: 500 })
  }
}
