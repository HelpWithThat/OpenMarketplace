// SmartMatch logic for matching jobs to workers

import { prisma } from './prisma'

export async function findMatchingJobs(workerId: string) {
  const worker = await prisma.user.findUnique({
    where: { id: workerId },
    include: {
      workerProfile: true,
      smartMatches: {
        where: { active: true },
      },
    },
  })

  if (!worker || !worker.workerProfile) {
    return []
  }

  const matches = worker.smartMatches
  if (matches.length === 0) {
    return []
  }

  const allMatchingJobs: any[] = []

  for (const match of matches) {
    const where: any = {
      status: 'OPEN',
    }

    // Distance filter
    if (match.maxDistance && worker.workerProfile.privateBaseLat && worker.workerProfile.privateBaseLng) {
      // TODO: Implement proper distance query with PostGIS
      // For now, simplified city match
      if (worker.workerProfile.publicCity) {
        where.city = worker.workerProfile.publicCity
      }
    }

    // Pay filter
    if (match.minPay) {
      where.OR = [
        { fixedPrice: { gte: match.minPay } },
        { hourlyRate: { gte: match.minRate || match.minPay } },
      ]
    }

    // Categories filter
    if (match.categories && match.categories.length > 0) {
      where.categories = {
        hasSome: match.categories,
      }
    }

    // Preferred buyers
    if (match.onlyPastBuyers) {
      const pastBuyerIds = await prisma.assignment.findMany({
        where: { workerId },
        select: { job: { select: { buyerId: true } } },
        distinct: ['jobId'],
      }).then(assignments => 
        assignments.map(a => a.job.buyerId)
      )
      
      where.buyerId = { in: pastBuyerIds }
    } else if (match.preferredBuyerIds && match.preferredBuyerIds.length > 0) {
      where.buyerId = { in: match.preferredBuyerIds }
    }

    // Remote filter
    if (match.remoteOnly) {
      where.locationType = 'REMOTE'
    }

    const jobs = await prisma.job.findMany({
      where,
      include: {
        buyer: {
          include: { buyerProfile: true },
        },
        _count: {
          select: { offers: true },
        },
      },
      take: 20,
    })

    for (const job of jobs) {
      const reasons: string[] = []

      // Calculate distance (simplified)
      let distance = 0
      if (job.city === worker.workerProfile.publicCity) {
        distance = 10 // Mock distance
        if (match.maxDistance) {
          reasons.push(`${distance} mi`)
        }
      }

      // Check pay
      const jobPay = job.fixedPrice || (job.hourlyRate || 0) * (job.maxHours || 1)
      if (match.minPay && jobPay >= match.minPay) {
        reasons.push(`$${jobPay} ≥ your $${match.minPay} min`)
      }

      // Check categories
      if (match.categories && match.categories.length > 0) {
        const matchedCategories = job.categories.filter(cat => 
          match.categories!.includes(cat)
        )
        if (matchedCategories.length > 0) {
          reasons.push(matchedCategories.join(', '))
        }
      }

      // Check buyer preference
      if (match.preferredBuyerIds?.includes(job.buyerId)) {
        reasons.push('Preferred buyer')
      }

      allMatchingJobs.push({
        ...job,
        matchReason: reasons.length > 0 ? `Matched because: ${reasons.join(' • ')}` : 'Matches your criteria',
        smartMatchId: match.id,
        smartMatchName: match.name,
      })
    }
  }

  // Remove duplicates by job ID
  const uniqueJobs = Array.from(
    new Map(allMatchingJobs.map(job => [job.id, job])).values()
  )

  return uniqueJobs
}
