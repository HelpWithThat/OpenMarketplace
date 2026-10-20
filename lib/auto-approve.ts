// Auto-approve logic
// In production, this would be a cron job or background task
// For now, it runs on-demand when checking assignment status

import { prisma } from './prisma'
import { calculateFees } from './fees'
import { getPaymentProvider } from './payments'
import { bumpCompletedJobs } from './assignment'

export async function checkAutoApprove(assignmentId: string) {
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: {
      job: true,
      expenses: true,
      penalties: true,
    },
  })

  if (!assignment || assignment.status !== 'SUBMITTED') {
    return false
  }

  if (!assignment.autoApproveAt || assignment.autoApproveAt > new Date()) {
    return false
  }

  // Auto-approve: approve all pending expenses
  await prisma.expenseItem.updateMany({
    where: {
      assignmentId,
      status: 'PENDING',
    },
    data: {
      status: 'APPROVED',
      approvedAt: new Date(),
    },
  })

  // Calculate final amounts (pending expenses were just approved above)
  const laborValue = assignment.agreedPay
  const expensesTotal = assignment.expenses
    .filter((e) => e.status !== 'REJECTED')
    .reduce((sum, e) => sum + e.amount, 0)
  const penaltiesTotal = assignment.penalties.reduce((sum, p) => sum + p.amount, 0)

  const feeCalc = calculateFees(laborValue - penaltiesTotal, expensesTotal, {
    feeRate: assignment.feeRate,
    feeSplitBuyer: assignment.feeSplitBuyer,
    feeSplitWorker: assignment.feeSplitWorker,
  })

  // Create payment
  const paymentProvider = getPaymentProvider()
  
  const payment = await prisma.payment.create({
    data: {
      assignmentId,
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

    await prisma.ledgerEntry.createMany({
      data: [
        { paymentId: payment.id, type: 'RELEASE', amount: feeCalc.laborValue + feeCalc.expensesTotal },
        { paymentId: payment.id, type: 'BUYER_FEE', amount: feeCalc.buyerFee },
        { paymentId: payment.id, type: 'WORKER_FEE', amount: feeCalc.workerFee },
        { paymentId: payment.id, type: 'PAYOUT', amount: feeCalc.workerGets },
      ],
    })
  } catch (error) {
    console.error('Payment provider error:', error)
  }

  await prisma.assignment.update({
    where: { id: assignmentId },
    data: {
      status: 'APPROVED',
      approvedAt: new Date(),
    },
  })

  await prisma.job.update({
    where: { id: assignment.jobId },
    data: { status: 'APPROVED' },
  })

  await bumpCompletedJobs(assignment.workerId)

  await prisma.notification.create({
    data: {
      userId: assignment.workerId,
      type: 'PAYMENT_APPROVED',
      title: 'Job auto-approved!',
      message: `Your work on "${assignment.job.title}" has been auto-approved after 3 days.`,
      linkUrl: `/jobs/${assignment.jobId}`,
    },
  })

  return true
}
