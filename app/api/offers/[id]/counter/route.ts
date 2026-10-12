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

    const { proposedPay, proposedHours, note } = await req.json()

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

    const updatedOffer = await prisma.offer.update({
      where: { id },
      data: {
        proposedPay,
        proposedHours,
        counterNote: note,
        status: 'COUNTER_OFFER',
      },
    })

    return NextResponse.json({ offer: updatedOffer })
  } catch (error) {
    console.error('Counter-offer error:', error)
    return NextResponse.json({ error: 'Failed to send counter-offer' }, { status: 500 })
  }
}
