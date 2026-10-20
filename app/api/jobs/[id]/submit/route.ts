import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

import { prisma } from '@/lib/prisma'
import { EXPENSE_PHOTO_MAX_PER_KIND, isExpensePhotoKind } from '@/lib/expense-photos'
import { readOwnedExpensePhotoFile } from '@/lib/expense-photo-storage'
import { EXPENSE_PROOF_REQUIRED_MESSAGE, expenseHasProof } from '@/lib/expenses'
import { WORK_PROOF_PHOTO_MAX, WORK_PROOF_REQUIRED_MESSAGE, workProofHasPhotos } from '@/lib/work-proof'
import { readOwnedWorkProofFile } from '@/lib/work-proof-storage'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = user.id
    const { results, expenses } = await req.json()

    const assignment = await prisma.assignment.findFirst({
      where: {
        jobId: id,
        workerId: userId,
      },
      include: {
        job: {
          include: {
            taskSections: {
              include: { steps: true },
            },
          },
        },
      },
    })

    if (!assignment || assignment.status === 'CANCELLED') {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
    }

    const steps = assignment.job.taskSections.flatMap((section) => section.steps)
    const resultMap = (results || {}) as Record<string, any>

    for (const step of steps) {
      const incoming = Array.isArray(resultMap[step.id]?.proofPhotos) ? resultMap[step.id].proofPhotos : []
      if (step.photoProofRequired && !workProofHasPhotos(incoming)) {
        return NextResponse.json({ error: WORK_PROOF_REQUIRED_MESSAGE }, { status: 400 })
      }
      if (incoming.length > WORK_PROOF_PHOTO_MAX) {
        return NextResponse.json(
          { error: `Please attach up to ${WORK_PROOF_PHOTO_MAX} photos` },
          { status: 400 }
        )
      }
    }

    // Save task results
    for (const [stepId, resultData] of Object.entries(resultMap)) {
      const result = resultData as any
      const incomingPhotos = Array.isArray(result.proofPhotos) ? result.proofPhotos : []
      const proofPhotos = []
      for (const photo of incomingPhotos) {
        if (typeof photo?.path !== 'string') {
          return NextResponse.json({ error: 'One of the work photos could not be saved' }, { status: 400 })
        }
        const owned = await readOwnedWorkProofFile({
          relativePath: photo.path,
          jobId: id,
          userId,
        })
        if ('error' in owned) {
          return NextResponse.json({ error: owned.error }, { status: 400 })
        }
        proofPhotos.push({
          path: photo.path,
          contentType: owned.contentType,
          size: owned.size,
        })
      }

      const saved = await prisma.taskResult.upsert({
        where: {
          assignmentId_stepId: {
            assignmentId: assignment.id,
            stepId,
          },
        },
        create: {
          assignmentId: assignment.id,
          stepId,
          textValue: result.textValue,
          numberValue: result.numberValue,
          boolValue: result.boolValue ?? result.completed,
          dateValue: result.dateValue ? new Date(result.dateValue) : null,
          jsonValue: result.jsonValue,
          signature: result.signature,
          signerName: result.signerName,
          lat: result.lat,
          lng: result.lng,
          files: result.files ? {
            create: result.files.map((file: any) => ({
              fileUrl: file.url,
              fileName: file.path.split('/').pop() || 'file',
              fileType: file.contentType,
            })),
          } : undefined,
        },
        update: {
          textValue: result.textValue,
          numberValue: result.numberValue,
          boolValue: result.boolValue ?? result.completed,
          dateValue: result.dateValue ? new Date(result.dateValue) : null,
          signature: result.signature,
          signerName: result.signerName,
        },
      })

      if (proofPhotos.length) {
        await prisma.taskProofPhoto.deleteMany({ where: { resultId: saved.id } })
        await prisma.taskProofPhoto.createMany({
          data: proofPhotos.map((photo) => ({
            resultId: saved.id,
            path: photo.path,
            contentType: photo.contentType,
            size: photo.size,
          })),
        })
      }
    }

    // Save expenses
    for (const expense of expenses || []) {
      if (!(expense.amount > 0)) continue

      const incomingPhotos = Array.isArray(expense.photos) ? expense.photos : []
      const photos = []
      for (const photo of incomingPhotos) {
        if (!isExpensePhotoKind(photo?.kind) || typeof photo?.path !== 'string') {
          return NextResponse.json({ error: 'One of the expense photos could not be saved' }, { status: 400 })
        }
        const owned = await readOwnedExpensePhotoFile({
          relativePath: photo.path,
          jobId: id,
          userId: userId,
        })
        if ('error' in owned) {
          return NextResponse.json({ error: owned.error }, { status: 400 })
        }
        photos.push({
          kind: photo.kind,
          path: photo.path,
          contentType: owned.contentType,
          size: owned.size,
        })
      }
      const receiptCount = photos.filter((p) => p.kind === 'RECEIPT').length
      const itemCount = photos.filter((p) => p.kind === 'ITEM').length
      if (receiptCount > EXPENSE_PHOTO_MAX_PER_KIND || itemCount > EXPENSE_PHOTO_MAX_PER_KIND) {
        return NextResponse.json(
          { error: `Please attach up to ${EXPENSE_PHOTO_MAX_PER_KIND} photos of each kind` },
          { status: 400 }
        )
      }
      if (!expenseHasProof(photos)) {
        return NextResponse.json({ error: EXPENSE_PROOF_REQUIRED_MESSAGE }, { status: 400 })
      }

      await prisma.expenseItem.create({
        data: {
          assignmentId: assignment.id,
          type: expense.type || 'OTHER',
          amount: expense.amount,
          note: expense.note,
          status: 'PENDING',
          photos: photos.length
            ? {
                create: photos,
              }
            : undefined,
        },
      })
    }

    // Update assignment status
    await prisma.assignment.update({
      where: { id: assignment.id },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
        autoApproveAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
      },
    })

    await prisma.job.update({
      where: { id: id },
      data: { status: 'SUBMITTED' },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Submission error:', error)
    return NextResponse.json(
      { error: 'Submission failed' },
      { status: 500 }
    )
  }
}
