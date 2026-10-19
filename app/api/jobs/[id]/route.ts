import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { feesForJob, moneyRoleForUser, omitCrossSideMoney } from '@/lib/fee-privacy'
import { assignmentForDisplay } from '@/lib/assignment'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
            expenses: true,
            taskResults: {
              include: {
                files: true,
                step: true,
              },
            },
          },
        },
      },
    })

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    const viewJob = { ...job, assignment: assignmentForDisplay(job) }
    const role = moneyRoleForUser(user, viewJob)
    const fees = feesForJob(viewJob, role)
    return NextResponse.json(
      omitCrossSideMoney({ job: { ...viewJob, fees } }, role)
    )
  } catch (error) {
    console.error('Get job error:', error)
    return NextResponse.json({ error: 'Failed to load job' }, { status: 500 })
  }
}
