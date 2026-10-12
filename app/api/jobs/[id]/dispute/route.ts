import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = user.id
    const { reason, description, evidenceUrls, amountHeld } = await req.json()

    const assignment = await prisma.assignment.findFirst({
      where: { jobId: id },
    })

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
    }

    const dispute = await prisma.dispute.create({
      data: {
        assignmentId: assignment.id,
        openedBy: userId,
        reason,
        description,
        evidenceUrls: evidenceUrls || [],
        amountHeld,
        status: 'OPEN',
      },
    })

    await prisma.assignment.update({
      where: { id: assignment.id },
      data: { status: 'DISPUTED' },
    })

    await prisma.job.update({
      where: { id: id },
      data: { status: 'DISPUTED' },
    })

    return NextResponse.json(dispute)
  } catch (error) {
    console.error('Dispute error:', error)
    return NextResponse.json({ error: 'Failed to create dispute' }, { status: 500 })
  }
}
