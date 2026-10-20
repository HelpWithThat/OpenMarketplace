import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { decideExpenseReview, expenseNotificationText } from '@/lib/expenses'
import { moneyRoleForUser, omitCrossSideMoney } from '@/lib/fee-privacy'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; expenseId: string }> }
) {
  try {
    const { id, expenseId } = await params
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let action: string | undefined
    let confirm = false
    try {
      const body = await req.json()
      action = body?.action
      confirm = body?.confirm === true
    } catch {
      confirm = false
    }

    if (!confirm) {
      return NextResponse.json(
        { error: 'Please confirm that you want to approve or decline this expense' },
        { status: 400 }
      )
    }
    if (action !== 'approve' && action !== 'decline') {
      return NextResponse.json({ error: 'Choose approve or decline' }, { status: 400 })
    }

    const job = await prisma.job.findUnique({
      where: { id },
      include: {
        assignment: {
          include: { expenses: true },
        },
      },
    })
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    const expense = job.assignment?.expenses.find((item) => item.id === expenseId)
    if (!expense || !job.assignment) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
    }

    const decision = decideExpenseReview({
      userId: user.id,
      job,
      expense,
    })
    if (!decision.ok) {
      return NextResponse.json({ error: decision.error }, { status: decision.status })
    }

    const nextStatus = action === 'approve' ? 'APPROVED' : 'REJECTED'
    const updated = await prisma.expenseItem.update({
      where: { id: expense.id },
      data: {
        status: nextStatus,
        approvedAt: action === 'approve' ? new Date() : null,
      },
    })

    const note = expenseNotificationText({
      action,
      jobTitle: job.title,
      expense,
    })
    await prisma.notification.create({
      data: {
        userId: job.assignment.workerId,
        type: 'EXPENSE_UPDATE',
        title: note.title,
        message: note.message,
        linkUrl: `/jobs/${job.id}`,
      },
    })

    const role = moneyRoleForUser(user, job)
    return NextResponse.json(
      omitCrossSideMoney(
        {
          success: true,
          expense: {
            id: updated.id,
            status: updated.status,
            type: updated.type,
            amount: updated.amount,
            note: updated.note,
          },
        },
        role
      )
    )
  } catch (error) {
    console.error('Expense review error:', error)
    return NextResponse.json({ error: 'Failed to update expense' }, { status: 500 })
  }
}
