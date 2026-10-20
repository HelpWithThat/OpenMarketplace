import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getStorageProvider } from '@/lib/storage'
import { WORK_PROOF_PHOTO_MAX } from '@/lib/work-proof'
import { workProofStoragePrefix } from '@/lib/work-proof-storage'
import {
  extensionForMime,
  validateExpensePhotoBuffer,
} from '@/lib/expense-photo-storage'

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
    const check = validateExpensePhotoBuffer(buffer)
    if (!check.ok) {
      return NextResponse.json({ error: check.error }, { status: 400 })
    }

    const ext = extensionForMime(check.contentType)
    if (!ext) {
      return NextResponse.json({ error: 'Please use a photo (JPEG, PNG, WEBP, or GIF).' }, { status: 400 })
    }

    const relativePath = `${workProofStoragePrefix(jobId, user.id)}${randomUUID()}${ext}`
    const storage = getStorageProvider()
    await storage.upload(buffer, relativePath, check.contentType)

    return NextResponse.json({
      path: relativePath,
      contentType: check.contentType,
      size: buffer.length,
      max: WORK_PROOF_PHOTO_MAX,
    })
  } catch (error) {
    console.error('Work proof photo upload error:', error)
    return NextResponse.json({ error: 'Could not save that photo' }, { status: 500 })
  }
}
