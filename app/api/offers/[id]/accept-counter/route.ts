import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { bumpAcceptedJobs, ensureJobThread, removeCancelledAssignment } from '@/lib/assignment'

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

    const offer = await prisma.offer.findUnique({
      where: { id },
      include: { job: true },
    })

    if (!offer) {
      return NextResponse.json({ error: 'Offer not found' }, { status: 404 })
    }

    if (offer.workerId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    if (offer.status !== 'COUNTER_OFFER') {
      return NextResponse.json({ error: 'No counter-offer to accept' }, { status: 400 })
    }

    if (offer.job.status === 'CANCELLED') {
      return NextResponse.json({ error: 'This job was cancelled' }, { status: 400 })
    }

    const updatedOffer = await prisma.offer.update({
      where: { id },
      data: { status: 'APPROVED' },
    })

    await removeCancelledAssignment(offer.jobId)

    await prisma.assignment.create({
      data: {
        jobId: offer.jobId,
        workerId: offer.workerId,
        agreedPay: offer.proposedPay || offer.job.fixedPrice || 0,
      },
    })

    await bumpAcceptedJobs(offer.workerId)

    await prisma.job.update({
      where: { id: offer.jobId },
      data: { status: 'ASSIGNED' },
    })

    await ensureJobThread({
      jobId: offer.jobId,
      participantIds: [offer.job.buyerId, offer.workerId],
    })

    return NextResponse.json({ offer: updatedOffer })
  } catch (error) {
    console.error('Accept counter-offer error:', error)
    return NextResponse.json({ error: 'Failed to accept counter-offer' }, { status: 500 })
  }
}
