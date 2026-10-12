import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

import { prisma } from '@/lib/prisma'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const { threadId } = await params
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = user.id
    const { text } = await req.json()

    const message = await prisma.message.create({
      data: {
        threadId,
        senderId: userId,
        text,
      },
      include: {
        sender: {
          include: {
            workerProfile: true,
            buyerProfile: true,
          },
        },
      },
    })

    // Create notification for other participant
    const thread = await prisma.messageThread.findUnique({
      where: { id: threadId },
      include: { 
        participants: true,
        job: true,
      },
    })

    const otherParticipant = thread?.participants.find(p => p.userId !== userId)
    if (otherParticipant && thread) {
      await prisma.notification.create({
        data: {
          userId: otherParticipant.userId,
          type: 'MESSAGE_RECEIVED',
          title: 'New message',
          message: `New message about ${thread.job?.title || 'a job'}`,
          linkUrl: `/messages/${thread.jobId}`,
        },
      })
    }

    return NextResponse.json(message)
  } catch (error) {
    console.error('Send message error:', error)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}
