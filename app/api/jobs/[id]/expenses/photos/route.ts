import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isExpensePhotoKind } from '@/lib/expense-photos'
import { createJobPhoto } from '@/lib/job-photos'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: { assignment: true },
    })
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }
    if (!job.assignment || job.assignment.workerId !== user.id || job.assignment.status === 'CANCELLED') {
      return NextResponse.json({ error: 'Only the assigned worker can add expense photos' }, { status: 403 })
    }
    if (['APPROVED', 'PAID', 'CANCELLED', 'DISPUTED'].includes(job.status)) {
      return NextResponse.json({ error: 'This job can no longer add expenses' }, { status: 400 })
    }

    const formData = await req.formData()
    const file = formData.get('file')
    const kindValue = formData.get('kind')
    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: 'Please choose a photo' }, { status: 400 })
    }
    if (!isExpensePhotoKind(kindValue)) {
      return NextResponse.json({ error: 'Choose a receipt photo or a photo of the items' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const saved = await createJobPhoto({
      jobId,
      ownerId: user.id,
      kind: kindValue,
      buffer,
    })
    if (!saved.ok) {
      return NextResponse.json({ error: saved.error }, { status: 400 })
    }

    return NextResponse.json(saved.photo)
  } catch (error) {
    console.error('Expense photo upload error:', error)
    return NextResponse.json({ error: 'Could not save that photo' }, { status: 500 })
  }
}
