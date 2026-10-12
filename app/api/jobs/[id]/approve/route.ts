import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

import { prisma } from '@/lib/prisma'
import { calculateFees } from '@/lib/fees'
import { feeViewForRole, omitCrossSideMoney } from '@/lib/fee-privacy'
import { getPaymentProvider } from '@/lib/payments'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = user.id
    const { approvedExpenses, rejectedExpenses, note } = await req.json()

    const job = await prisma.job.findUnique({
      where: { id },
      include: {
        assignment: {
          include: {
            expenses: true,
            penalties: true,
          },
        },
      },
    })

    if (!job || job.buyerId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    if (!job.assignment) {
      return NextResponse.json({ error: 'No assignment found' }, { status: 404 })
    }

    const assignment = job.assignment

    // Update expense statuses
    if (approvedExpenses) {
      for (const expenseId of approvedExpenses) {
        await prisma.expenseItem.update({
          where: { id: expenseId },
          data: {
            status: 'APPROVED',
            approvedAt: new Date(),
          },
        })
      }
    }

    if (rejectedExpenses) {
      for (const expenseId of rejectedExpenses) {
        await prisma.expenseItem.update({
          where: { id: expenseId },
          data: { status: 'REJECTED' },
        })
      }
    }

    // Calculate final amounts
    const laborValue = assignment.agreedPay
    const approvedExpensesTotal = await prisma.expenseItem.aggregate({
      where: {
        assignmentId: assignment.id,
        status: 'APPROVED',
      },
      _sum: { amount: true },
    })
    const expensesTotal = approvedExpensesTotal._sum.amount || 0

    const penaltiesTotal = assignment.penalties.reduce((sum, p) => sum + p.amount, 0)

    const feeCalc = calculateFees(laborValue - penaltiesTotal, expensesTotal, {
      feeRate: assignment.feeRate,
      feeSplitBuyer: assignment.feeSplitBuyer,
      feeSplitWorker: assignment.feeSplitWorker,
    })

    // Create payment record
    const paymentProvider = getPaymentProvider()
    
    const payment = await prisma.payment.create({
      data: {
        assignmentId: assignment.id,
        provider: 'MOCK',
        laborAmount: feeCalc.laborValue,
        buyerFee: feeCalc.buyerFee,
        workerFee: feeCalc.workerFee,
        platformFeeTotal: feeCalc.platformFee,
        expensesTotal: feeCalc.expensesTotal,
        penaltiesTotal,
        buyerTotal: feeCalc.buyerPays,
        workerPayout: feeCalc.workerGets,
        status: 'HELD',
      },
    })

    // Process payment through provider
    try {
      await paymentProvider.release('mock-hold-id', feeCalc.workerGets)
      await paymentProvider.payout(assignment.workerId, feeCalc.workerGets)

      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'PAID_OUT',
          paidAt: new Date(),
        },
      })

      // Create ledger entries
      await prisma.ledgerEntry.createMany({
        data: [
          {
            paymentId: payment.id,
            type: 'RELEASE',
            amount: feeCalc.laborValue + feeCalc.expensesTotal,
          },
          {
            paymentId: payment.id,
            type: 'BUYER_FEE',
            amount: feeCalc.buyerFee,
          },
          {
            paymentId: payment.id,
            type: 'WORKER_FEE',
            amount: feeCalc.workerFee,
          },
          {
            paymentId: payment.id,
            type: 'PAYOUT',
            amount: feeCalc.workerGets,
          },
        ],
      })
    } catch (error) {
      console.error('Payment provider error:', error)
    }

    // Update statuses
    await prisma.assignment.update({
      where: { id: assignment.id },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
      },
    })

    await prisma.job.update({
      where: { id: id },
      data: { status: 'APPROVED' },
    })

    // Create notifications
    await prisma.notification.create({
      data: {
        userId: assignment.workerId,
        type: 'PAYMENT_APPROVED',
        title: 'Job approved!',
        message: `Your work on "${job.title}" has been approved. Payment is being processed.`,
        linkUrl: `/jobs/${job.id}`,
      },
    })

    return NextResponse.json(
      omitCrossSideMoney(
        { payment, fees: feeViewForRole(feeCalc, 'buyer') },
        'buyer'
      )
    )
  } catch (error) {
    console.error('Approval error:', error)
    return NextResponse.json({ error: 'Approval failed' }, { status: 500 })
  }
}
