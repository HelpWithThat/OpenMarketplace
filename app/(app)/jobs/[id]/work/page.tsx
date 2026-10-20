import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import { TaskCompletionUI } from '@/components/task-completion-ui'
import { presentAssignmentWorkProof } from '@/lib/work-proof'

export default async function WorkOnJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }

  const userId = user.id
  
  const assignment = await prisma.assignment.findFirst({
    where: {
      jobId: id,
      workerId: userId,
    },
    include: {
      job: {
        include: {
          taskSections: {
            include: {
              steps: {
                orderBy: { order: 'asc' },
              },
            },
            orderBy: { order: 'asc' },
          },
          buyer: {
            include: { buyerProfile: true },
          },
        },
      },
      taskResults: {
        include: {
          files: true,
          proofPhotos: true,
        },
      },
      expenses: {
        include: { photos: true },
      },
    },
  })

  if (!assignment || assignment.status === 'CANCELLED') {
    notFound()
  }

  const presented = presentAssignmentWorkProof(
    id,
    assignment,
    userId,
    assignment.job.buyerId
  )
  return <TaskCompletionUI assignment={presented} />
}
