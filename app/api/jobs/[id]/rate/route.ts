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
    const data = await req.json()

    const assignment = await prisma.assignment.findFirst({
      where: { jobId: id },
      include: { job: true },
    })

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
    }

    const isBuyer = assignment.job.buyerId === userId
    const isWorker = assignment.workerId === userId

    if (!isBuyer && !isWorker) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const toId = isBuyer ? assignment.workerId : assignment.job.buyerId

    // Create review
    const review = await prisma.review.create({
      data: {
        jobId: id,
        fromId: userId,
        toId,
        overallStars: data.overallStars,
        onTime: data.onTime,
        quality: data.quality,
        communication: data.communication,
        wouldHireAgain: data.wouldHireAgain,
        clearInstructions: data.clearInstructions,
        fairPayment: data.fairPayment,
        respect: data.respect,
        wouldWorkForAgain: data.wouldWorkForAgain,
        comment: data.comment,
      },
    })

    // Check if both reviews are now submitted
    const allReviews = await prisma.review.findMany({
      where: { jobId: id },
    })

    if (allReviews.length === 2) {
      // Both reviews submitted - reveal them
      const now = new Date()
      await prisma.review.updateMany({
        where: { jobId: id },
        data: { visibleAt: now },
      })

      // Update profile ratings
      for (const rev of allReviews) {
        const user = await prisma.user.findUnique({
          where: { id: rev.toId },
          include: {
            workerProfile: true,
            buyerProfile: true,
          },
        })

        if (!user) continue

        if (user.workerProfile) {
          const workerReviews = await prisma.review.findMany({
            where: { toId: user.id, visibleAt: { not: null } },
          })

          const avgRating = workerReviews.reduce((sum, r) => sum + r.overallStars, 0) / workerReviews.length
          const avgOnTime = workerReviews.reduce((sum, r) => sum + (r.onTime || 0), 0) / workerReviews.length
          const avgQuality = workerReviews.reduce((sum, r) => sum + (r.quality || 0), 0) / workerReviews.length
          const avgCommunication = workerReviews.reduce((sum, r) => sum + (r.communication || 0), 0) / workerReviews.length
          const wouldHireAgainPct = workerReviews.filter(r => r.wouldHireAgain).length / workerReviews.length

          await prisma.workerProfile.update({
            where: { userId: user.id },
            data: {
              averageRating: avgRating,
              totalReviews: workerReviews.length,
              ratingOnTime: avgOnTime,
              ratingQuality: avgQuality,
              ratingCommunication: avgCommunication,
              wouldHireAgainPct,
            },
          })
        }

        if (user.buyerProfile) {
          const buyerReviews = await prisma.review.findMany({
            where: { toId: user.id, visibleAt: { not: null } },
          })

          const avgRating = buyerReviews.reduce((sum, r) => sum + r.overallStars, 0) / buyerReviews.length
          const avgClearInstructions = buyerReviews.reduce((sum, r) => sum + (r.clearInstructions || 0), 0) / buyerReviews.length
          const avgFairPayment = buyerReviews.reduce((sum, r) => sum + (r.fairPayment || 0), 0) / buyerReviews.length
          const avgRespect = buyerReviews.reduce((sum, r) => sum + (r.respect || 0), 0) / buyerReviews.length
          const wouldWorkForAgainPct = buyerReviews.filter(r => r.wouldWorkForAgain).length / buyerReviews.length

          await prisma.buyerProfile.update({
            where: { userId: user.id },
            data: {
              averageRating: avgRating,
              totalReviews: buyerReviews.length,
              ratingClearInstructions: avgClearInstructions,
              ratingFairPayment: avgFairPayment,
              ratingRespect: avgRespect,
              wouldWorkForAgainPct,
            },
          })
        }
      }

      // Notify both parties
      await prisma.notification.createMany({
        data: [
          {
            userId: assignment.workerId,
            type: 'REVIEW_RECEIVED',
            title: 'Review received',
            message: `Your review for "${assignment.job.title}" is now visible`,
            linkUrl: `/jobs/${id}`,
          },
          {
            userId: assignment.job.buyerId,
            type: 'REVIEW_RECEIVED',
            title: 'Review received',
            message: `Your review for "${assignment.job.title}" is now visible`,
            linkUrl: `/jobs/${id}`,
          },
        ],
      })
    }

    return NextResponse.json(review)
  } catch (error) {
    console.error('Rating error:', error)
    return NextResponse.json({ error: 'Failed to submit rating' }, { status: 500 })
  }
}
