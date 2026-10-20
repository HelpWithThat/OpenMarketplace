import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getStorageProvider } from '@/lib/storage'
import { isExpensePhotoKind } from '@/lib/expense-photos'
import {
  expensePhotoStoragePrefix,
  extensionForMime,
  validateExpensePhotoBuffer,
} from '@/lib/expense-photo-storage'

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
    const check = validateExpensePhotoBuffer(buffer)
    if (!check.ok) {
      return NextResponse.json({ error: check.error }, { status: 400 })
    }

    const ext = extensionForMime(check.contentType)
    if (!ext) {
      return NextResponse.json({ error: 'Please use a photo (JPEG, PNG, WEBP, or GIF).' }, { status: 400 })
    }

    const relativePath = `${expensePhotoStoragePrefix(jobId, user.id)}${randomUUID()}${ext}`
    const storage = getStorageProvider()
    await storage.upload(buffer, relativePath, check.contentType)

    return NextResponse.json({
      path: relativePath,
      kind: kindValue,
      contentType: check.contentType,
      size: buffer.length,
    })
  } catch (error) {
    console.error('Expense photo upload error:', error)
    return NextResponse.json({ error: 'Could not save that photo' }, { status: 500 })
  }
}
