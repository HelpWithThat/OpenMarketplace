import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { MessagingUI } from '@/components/messaging-ui'

export default async function MessagesPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }

  const userId = user.id

  const thread = await prisma.messageThread.findUnique({
    where: { jobId },
    include: {
      job: true,
      messages: {
        include: {
          sender: {
            include: {
              workerProfile: true,
              buyerProfile: true,
            },
          },
          attachments: true,
        },
        orderBy: { sentAt: 'asc' },
      },
      participants: {
        include: { user: true },
      },
    },
  })

  if (!thread) {
    return <div className="p-4">No messages yet</div>
  }

  const isParticipant = thread.participants.some(p => p.userId === userId)
  if (!isParticipant) {
    redirect('/dashboard')
  }

  return <MessagingUI thread={thread} userId={userId} />
}
