import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

import { prisma } from '@/lib/prisma'

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

    const userId = user.id
    const { action, proposedPay, proposedHours, note } = await req.json()

    const offer = await prisma.offer.findUnique({
      where: { id },
      include: { job: true },
    })

    if (!offer) {
      return NextResponse.json({ error: 'Offer not found' }, { status: 404 })
    }

    // Only buyer can respond to offers
    if (offer.job.buyerId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    if (action === 'accept') {
      // Accept offer and create assignment
      await prisma.offer.update({
        where: { id: id },
        data: {
          status: 'ACCEPTED',
          respondedAt: new Date(),
        },
      })

      const feeSettings = await prisma.feeSettings.findFirst({
        orderBy: { effectiveDate: 'desc' },
      })

      const assignment = await prisma.assignment.create({
        data: {
          jobId: offer.jobId,
          workerId: offer.workerId,
          agreedPay: offer.proposedPay || offer.job.fixedPrice || 0,
          agreedHours: offer.proposedHours || offer.job.maxHours,
          feeRate: feeSettings?.feeRate || 0.20,
          feeSplitBuyer: feeSettings?.feeSplitBuyer || 0.80,
          feeSplitWorker: feeSettings?.feeSplitWorker || 0.20,
          status: 'UPCOMING',
        },
      })

      await prisma.job.update({
        where: { id: offer.jobId },
        data: { status: 'ASSIGNED' },
      })

      // Create message thread
      await prisma.messageThread.create({
        data: {
          jobId: offer.jobId,
          participants: {
            create: [
              { userId: offer.job.buyerId },
              { userId: offer.workerId },
            ],
          },
        },
      })

      return NextResponse.json({ assignment })
    } else if (action === 'decline') {
      await prisma.offer.update({
        where: { id: id },
        data: {
          status: 'DECLINED',
          respondedAt: new Date(),
        },
      })
      return NextResponse.json({ success: true })
    } else if (action === 'counter') {
      // Counter-offer (buyer counters worker's request)
      if (offer.round >= 3) {
        return NextResponse.json(
          { error: 'Maximum 3 rounds reached' },
          { status: 400 }
        )
      }

      await prisma.offer.update({
        where: { id: id },
        data: {
          status: 'DECLINED',
          respondedAt: new Date(),
        },
      })

      const counterOffer = await prisma.offer.create({
        data: {
          jobId: offer.jobId,
          workerId: offer.workerId,
          type: 'BUYER_COUNTER',
          round: offer.round + 1,
          proposedPay,
          proposedHours,
          note,
          status: 'PENDING',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      })

      return NextResponse.json({ counterOffer })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Offer response error:', error)
    return NextResponse.json(
      { error: 'Failed to respond to offer' },
      { status: 500 }
    )
  }
}
