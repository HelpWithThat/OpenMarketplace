import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

import { prisma } from '@/lib/prisma'
import { EXPENSE_PHOTO_MAX_PER_KIND } from '@/lib/expense-photos'
import { EXPENSE_PROOF_REQUIRED_MESSAGE, expenseHasProof } from '@/lib/expenses'
import { WORK_PROOF_PHOTO_MAX, WORK_PROOF_REQUIRED_MESSAGE, workProofHasPhotos } from '@/lib/work-proof'
import { claimOwnedJobPhotos, expenseKindFromIncoming, incomingPhotoId } from '@/lib/job-photos'

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
      const proofPhotoIds: string[] = []
      for (const photo of incomingPhotos) {
        const photoId = incomingPhotoId(photo)
        if (!photoId) {
          return NextResponse.json({ error: 'One of the work photos could not be saved' }, { status: 400 })
        }
        proofPhotoIds.push(photoId)
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

      if (proofPhotoIds.length) {
        const claimed = await claimOwnedJobPhotos({
          ids: proofPhotoIds,
          jobId: id,
          ownerId: userId,
          kinds: ['WORK_PROOF'],
          resultId: saved.id,
        })
        if (!claimed.ok) {
          return NextResponse.json({ error: claimed.error }, { status: 400 })
        }
      }
    }

    // Save expenses
    for (const expense of expenses || []) {
      if (!(expense.amount > 0)) continue

      const incomingPhotos = Array.isArray(expense.photos) ? expense.photos : []
      const photoIds: string[] = []
      let receiptCount = 0
      let itemCount = 0
      for (const photo of incomingPhotos) {
        const kind = expenseKindFromIncoming(photo)
        const photoId = incomingPhotoId(photo)
        if (!kind || !photoId) {
          return NextResponse.json({ error: 'One of the expense photos could not be saved' }, { status: 400 })
        }
        if (kind === 'RECEIPT') receiptCount += 1
        if (kind === 'ITEM') itemCount += 1
        photoIds.push(photoId)
      }
      if (receiptCount > EXPENSE_PHOTO_MAX_PER_KIND || itemCount > EXPENSE_PHOTO_MAX_PER_KIND) {
        return NextResponse.json(
          { error: `Please attach up to ${EXPENSE_PHOTO_MAX_PER_KIND} photos of each kind` },
          { status: 400 }
        )
      }
      if (!expenseHasProof(photoIds)) {
        return NextResponse.json({ error: EXPENSE_PROOF_REQUIRED_MESSAGE }, { status: 400 })
      }

      const savedExpense = await prisma.expenseItem.create({
        data: {
          assignmentId: assignment.id,
          type: expense.type || 'OTHER',
          amount: expense.amount,
          note: expense.note,
          status: 'PENDING',
        },
      })
      const claimed = await claimOwnedJobPhotos({
        ids: photoIds,
        jobId: id,
        ownerId: userId,
        kinds: ['RECEIPT', 'ITEM'],
        expenseId: savedExpense.id,
      })
      if (!claimed.ok) {
        return NextResponse.json({ error: claimed.error }, { status: 400 })
      }
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
