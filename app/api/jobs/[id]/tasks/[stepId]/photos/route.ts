import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { WORK_PROOF_PHOTO_MAX } from '@/lib/work-proof'
import { createJobPhoto } from '@/lib/job-photos'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string }> }
) {
  try {
    const { id: jobId, stepId } = await params
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        assignment: true,
        taskSections: { include: { steps: true } },
      },
    })
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }
    if (!job.assignment || job.assignment.workerId !== user.id || job.assignment.status === 'CANCELLED') {
      return NextResponse.json({ error: 'Only the assigned worker can add proof photos' }, { status: 403 })
    }
    if (['APPROVED', 'PAID', 'CANCELLED', 'DISPUTED'].includes(job.status)) {
      return NextResponse.json({ error: 'This job can no longer add proof photos' }, { status: 400 })
    }
    const step = job.taskSections.flatMap((section) => section.steps).find((item) => item.id === stepId)
    if (!step) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const formData = await req.formData()
    const file = formData.get('file')
    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: 'Please choose a photo' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const saved = await createJobPhoto({
      jobId,
      ownerId: user.id,
      kind: 'WORK_PROOF',
      buffer,
    })
    if (!saved.ok) {
      return NextResponse.json({ error: saved.error }, { status: 400 })
    }

    return NextResponse.json({
      ...saved.photo,
      max: WORK_PROOF_PHOTO_MAX,
    })
  } catch (error) {
    console.error('Work proof photo upload error:', error)
    return NextResponse.json({ error: 'Could not save that photo' }, { status: 500 })
  }
}
