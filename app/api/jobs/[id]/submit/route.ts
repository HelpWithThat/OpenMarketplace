import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

import { prisma } from '@/lib/prisma'

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
    })

    if (!assignment || assignment.status === 'CANCELLED') {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
    }

    // Save task results
    for (const [stepId, resultData] of Object.entries(results as any)) {
      const result = resultData as any
      await prisma.taskResult.upsert({
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
          boolValue: result.boolValue,
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
          boolValue: result.boolValue,
          dateValue: result.dateValue ? new Date(result.dateValue) : null,
          signature: result.signature,
          signerName: result.signerName,
        },
      })
    }

    // Save expenses
    for (const expense of expenses || []) {
      if (expense.amount > 0) {
        await prisma.expenseItem.create({
          data: {
            assignmentId: assignment.id,
            type: expense.type || 'OTHER',
            amount: expense.amount,
            note: expense.note,
            receiptUrl: expense.receiptUrl,
            status: 'PENDING',
          },
        })
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
