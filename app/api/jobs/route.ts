import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { feesForJob, moneyRoleForUser, omitCrossSideMoney } from '@/lib/fee-privacy'

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = user.id
    const data = await req.json()

    const job = await prisma.job.create({
      data: {
        buyerId: userId,
        title: data.title,
        description: data.description,
        categories: data.categories || [],
        locationType: data.locationType,
        address: data.address,
        city: data.city,
        scheduleType: data.scheduleType,
        fixedTime: data.fixedTime ? new Date(data.fixedTime) : null,
        estimatedDuration: data.estimatedDuration,
        payType: data.payType,
        fixedPrice: data.fixedPrice,
        hourlyRate: data.hourlyRate,
        maxHours: data.maxHours,
        expensesAllowed: data.expensesAllowed,
        expenseBudget: data.expenseBudget,
        status: 'OPEN',
        publishedAt: new Date(),
        taskSections: {
          create: data.taskSections?.map((section: any, sectionOrder: number) => ({
            name: section.name,
            order: sectionOrder,
            steps: {
              create: section.steps?.map((step: any, stepOrder: number) => ({
                order: stepOrder,
                type: step.type,
                title: step.title,
                required: step.required,
                instructions: step.instructions,
              })),
            },
          })),
        },
      },
      include: {
        taskSections: {
          include: { steps: true },
        },
      },
    })

    return NextResponse.json(job)
  } catch (error) {
    console.error('Job creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create job' },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const city = searchParams.get('city')

    const where: any = {
      status: status || 'OPEN',
    }

    if (city) {
      where.city = city
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
      orderBy: { publishedAt: 'desc' },
      take: 50,
    })

    const payload = jobs.map((job) => {
      const role = moneyRoleForUser(user, job)
      return omitCrossSideMoney({ ...job, fees: feesForJob(job, role) }, role)
    })
    return NextResponse.json(payload)
  } catch (error) {
    console.error('Job listing error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch jobs' },
      { status: 500 }
    )
  }
}
