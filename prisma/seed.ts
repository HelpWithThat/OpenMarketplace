import 'dotenv/config'
import { PrismaClient, type Prisma } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import bcrypt from 'bcrypt'

let connectionString = process.env.DATABASE_URL!

if (!connectionString) {
  console.error('❌ DATABASE_URL not found; skipping seed so the app can still start')
  process.exit(0)
}

// Handle prisma+postgres:// URLs by extracting the actual postgres URL
if (connectionString.startsWith('prisma+postgres://')) {
  try {
    const url = new URL(connectionString)
    const apiKey = url.searchParams.get('api_key')
    if (apiKey) {
      const decoded = JSON.parse(Buffer.from(apiKey, 'base64').toString())
      connectionString = decoded.databaseUrl
      console.log('🔌 Using decoded database URL')
    }
  } catch {
    console.error('Failed to decode prisma+postgres URL, trying as-is')
  }
}

console.log('🔌 Connecting to database...')

const pool = new Pool({
  connectionString,
  max: 1,
})

const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const DEMO_BUYER_EMAIL = 'buyer@demo.com'
const DEMO_WORKER_EMAIL = 'worker@demo.com'
const DEMO_PASSWORD = 'password123'

function daysFromNow(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000)
}

async function ensureJob(id: string, data: Prisma.JobCreateInput) {
  const existing = await prisma.job.findUnique({ where: { id } })
  if (existing) {
    console.log(`  skip job ${id} (already exists)`)
    return existing
  }
  const job = await prisma.job.create({ data: { ...data, id } })
  console.log(`  created job ${id}`)
  return job
}

async function ensureOffer(id: string, data: Prisma.OfferUncheckedCreateInput) {
  const byId = await prisma.offer.findUnique({ where: { id } })
  if (byId) {
    console.log(`  skip offer ${id} (already exists)`)
    return byId
  }
  const existing = await prisma.offer.findFirst({
    where: { jobId: data.jobId, workerId: data.workerId, type: data.type, round: data.round ?? 1 },
  })
  if (existing) {
    console.log(`  skip offer ${id} (same worker/job/round already exists)`)
    return existing
  }
  const offer = await prisma.offer.create({ data: { ...data, id } })
  console.log(`  created offer ${id}`)
  return offer
}

async function ensureExpense(
  id: string,
  data: Prisma.ExpenseItemUncheckedCreateInput,
  jobId?: string
) {
  const byId = await prisma.expenseItem.findUnique({ where: { id } })
  if (byId) {
    console.log(`  skip expense ${id} (already exists)`)
    return byId
  }

  let assignment = data.assignmentId
    ? await prisma.assignment.findUnique({ where: { id: data.assignmentId } })
    : null
  if (!assignment && jobId) {
    assignment = await prisma.assignment.findUnique({ where: { jobId } })
  }
  if (!assignment) {
    console.log(`  skip expense ${id} (assignment missing)`)
    return null
  }

  try {
    const expense = await prisma.expenseItem.create({
      data: { ...data, id, assignmentId: assignment.id },
    })
    console.log(`  created expense ${id}`)
    return expense
  } catch (error) {
    console.warn(`  skip expense ${id} (could not create):`, error)
    return null
  }
}

async function ensureAssignment(id: string, data: Prisma.AssignmentUncheckedCreateInput) {
  const byId = await prisma.assignment.findUnique({ where: { id } })
  if (byId) {
    console.log(`  skip assignment ${id} (already exists)`)
    return byId
  }
  const byJob = await prisma.assignment.findUnique({ where: { jobId: data.jobId } })
  if (byJob) {
    console.log(`  skip assignment ${id} (job already assigned)`)
    return byJob
  }
  const assignment = await prisma.assignment.create({ data: { ...data, id } })
  console.log(`  created assignment ${id}`)
  return assignment
}

async function ensureThread(opts: {
  id: string
  jobId: string
  participantIds: string[]
  messages: { id: string; senderId: string; text: string }[]
}) {
  let thread = await prisma.messageThread.findUnique({
    where: { jobId: opts.jobId },
    include: { messages: true, participants: true },
  })

  if (!thread) {
    thread = await prisma.messageThread.create({
      data: {
        id: opts.id,
        jobId: opts.jobId,
        participants: {
          create: opts.participantIds.map((userId) => ({ userId })),
        },
      },
      include: { messages: true, participants: true },
    })
    console.log(`  created thread ${opts.id}`)
  } else {
    console.log(`  skip thread for ${opts.jobId} (already exists)`)
    for (const userId of opts.participantIds) {
      const already = thread.participants.some((p) => p.userId === userId)
      if (!already) {
        await prisma.messageThreadParticipant.create({
          data: { threadId: thread.id, userId },
        })
      }
    }
  }

  if (thread.messages.length > 0) {
    console.log(`  skip messages on ${opts.jobId} (thread already has messages)`)
    return thread
  }

  for (const msg of opts.messages) {
    const existing = await prisma.message.findUnique({ where: { id: msg.id } })
    if (existing) continue
    await prisma.message.create({
      data: {
        id: msg.id,
        threadId: thread.id,
        senderId: msg.senderId,
        text: msg.text,
      },
    })
  }
  console.log(`  added demo messages on ${opts.jobId}`)
  return thread
}

async function main() {
  console.log('🌱 Seeding database (idempotent; only adds missing demo rows)...\n')

  try {
    await prisma.$queryRaw`SELECT 1`
    console.log('✅ Database connection successful\n')
  } catch (error) {
    console.error('❌ Database connection failed:', error)
    throw error
  }

  const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 10)

  console.log('Ensuring demo buyer...')
  const buyer = await prisma.user.upsert({
    where: { email: DEMO_BUYER_EMAIL },
    update: {},
    create: {
      email: DEMO_BUYER_EMAIL,
      password: hashedPassword,
      name: 'Sarah Johnson',
      isBuyer: true,
      isWorker: false,
      emailVerified: new Date(),
      buyerProfile: {
        create: {
          businessName: 'Johnson Home Services',
          description: 'Small property management company',
        },
      },
    },
    include: { buyerProfile: true },
  })
  if (!buyer.buyerProfile) {
    await prisma.buyerProfile.create({
      data: {
        userId: buyer.id,
        businessName: 'Johnson Home Services',
        description: 'Small property management company',
      },
    })
  }
  console.log(`✅ Demo buyer: ${DEMO_BUYER_EMAIL}`)

  console.log('Ensuring demo worker...')
  const worker = await prisma.user.upsert({
    where: { email: DEMO_WORKER_EMAIL },
    update: {},
    create: {
      email: DEMO_WORKER_EMAIL,
      password: hashedPassword,
      name: 'Alex Rivera',
      isWorker: true,
      isBuyer: false,
      emailVerified: new Date(),
      workerProfile: {
        create: {
          displayName: 'Alex R.',
          bio: 'Experienced handyman with 10+ years in home repairs.',
          skills: ['TV Mounting', 'Handyman', 'Electrical'],
          tools: ['Truck', 'Ladder', 'Power Tools'],
          publicCity: 'Denver',
          publicZip: '80202',
          travelRadius: 30,
          averageRating: 4.8,
          totalReviews: 15,
          completedJobs: 14,
          acceptedJobs: 15,
          reliability: 0.93,
        },
      },
    },
    include: { workerProfile: true },
  })
  if (!worker.workerProfile) {
    await prisma.workerProfile.create({
      data: {
        userId: worker.id,
        displayName: 'Alex R.',
        bio: 'Experienced handyman with 10+ years in home repairs.',
        skills: ['TV Mounting', 'Handyman', 'Electrical'],
        tools: ['Truck', 'Ladder', 'Power Tools'],
        publicCity: 'Denver',
        publicZip: '80202',
        travelRadius: 30,
        averageRating: 4.8,
        totalReviews: 15,
        completedJobs: 14,
        acceptedJobs: 15,
        reliability: 0.93,
      },
    })
  }
  console.log(`✅ Demo worker: ${DEMO_WORKER_EMAIL}`)

  const existingSmartMatch = await prisma.smartMatch.findUnique({ where: { id: 'demo-smartmatch' } })
  if (!existingSmartMatch) {
    await prisma.smartMatch.create({
      data: {
        id: 'demo-smartmatch',
        workerId: worker.id,
        name: 'All local jobs',
        maxDistance: 30,
        minPay: 50,
        categories: ['TV Mounting', 'Handyman', 'Installation'],
        active: true,
      },
    })
    console.log('✅ Created demo SmartMatch')
  } else {
    console.log('  skip SmartMatch demo-smartmatch (already exists)')
  }

  const existingFees = await prisma.feeSettings.findUnique({ where: { id: 'default' } })
  if (!existingFees) {
    await prisma.feeSettings.create({
      data: {
        id: 'default',
        feeRate: 0.20,
        feeSplitBuyer: 0.80,
        feeSplitWorker: 0.20,
        processingFeePayer: 'PLATFORM',
      },
    })
    console.log('✅ Created default fee settings (labor-only 20% fee, 80/20 split)')
  } else {
    console.log('  skip fee settings (already exist)')
  }

  // Posted amounts are labor only. Role-facing totals (buyer youPay / worker youGet)
  // are computed at read time and never stored as the other side's number.
  console.log('\nEnsuring demo jobs...')

  await ensureJob('job-open', {
    buyer: { connect: { id: buyer.id } },
    title: 'Mount 65" TV on living room wall',
    description:
      'Need help mounting a 65-inch TV on a brick wall. TV and mount bracket already purchased. Must be level and centered above fireplace.',
    categories: ['TV Mounting', 'Installation'],
    locationType: 'ON_SITE',
    address: '123 Main St, Denver CO 80202',
    city: 'Denver',
    scheduleType: 'FIXED',
    fixedTime: daysFromNow(2),
    estimatedDuration: 90,
    payType: 'FIXED',
    fixedPrice: 150,
    expensesAllowed: true,
    expenseBudget: 30,
    status: 'OPEN',
    publishedAt: new Date(),
    taskSections: {
      create: [
        {
          name: 'Prep',
          order: 0,
          steps: {
            create: [
              { order: 0, type: 'CHECK_IN', title: 'Check in on arrival', required: true },
              { order: 1, type: 'PHOTO', title: 'Take photo of wall before work', required: true },
            ],
          },
        },
        {
          name: 'Installation',
          order: 1,
          steps: {
            create: [
              { order: 0, type: 'CHECKBOX', title: 'Locate wall studs', required: true },
              { order: 1, type: 'CHECKBOX', title: 'Install wall bracket (level)', required: true },
              { order: 2, type: 'CHECKBOX', title: 'Mount TV on bracket', required: true },
            ],
          },
        },
        {
          name: 'Closeout',
          order: 2,
          steps: {
            create: [
              { order: 0, type: 'PHOTO', title: 'Take photo of completed installation', required: true },
              { order: 1, type: 'SIGNATURE', title: 'Homeowner signature', required: true },
              { order: 2, type: 'CHECK_OUT', title: 'Check out when complete', required: true },
            ],
          },
        },
      ],
    },
  })

  await ensureOffer('offer-open-request', {
    jobId: 'job-open',
    workerId: worker.id,
    type: 'REQUEST',
    round: 1,
    proposedPay: 150,
    note: "I can do this as posted — I'll bring a stud finder and level.",
    status: 'PENDING',
    expiresAt: daysFromNow(7),
  })

  await ensureJob('job-counter', {
    buyer: { connect: { id: buyer.id } },
    title: 'Assemble IKEA wardrobe and dresser',
    description: 'Two-piece bedroom set, all parts on site. Looking for someone who has assembled PAX/MALM before.',
    categories: ['Handyman', 'Assembly'],
    locationType: 'ON_SITE',
    address: '221 Pine St, Denver CO 80205',
    city: 'Denver',
    scheduleType: 'WINDOW',
    startWindow: daysFromNow(3),
    endWindow: daysFromNow(4),
    estimatedDuration: 180,
    payType: 'FIXED',
    fixedPrice: 200,
    expensesAllowed: false,
    status: 'OPEN',
    publishedAt: daysFromNow(-1),
    taskSections: {
      create: [
        {
          name: 'Assembly',
          order: 0,
          steps: {
            create: [
              { order: 0, type: 'CHECK_IN', title: 'Check in on arrival', required: true },
              { order: 1, type: 'CHECKBOX', title: 'Assemble wardrobe', required: true },
              { order: 2, type: 'CHECKBOX', title: 'Assemble dresser', required: true },
              { order: 3, type: 'PHOTO', title: 'Photo of finished pieces', required: true },
              { order: 4, type: 'CHECK_OUT', title: 'Check out when complete', required: true },
            ],
          },
        },
      ],
    },
  })

  await ensureOffer('offer-counter-request', {
    jobId: 'job-counter',
    workerId: worker.id,
    type: 'REQUEST',
    round: 1,
    proposedPay: 200,
    note: 'I can assemble both pieces this weekend.',
    status: 'DECLINED',
    expiresAt: daysFromNow(6),
    respondedAt: daysFromNow(-0.5),
  })

  await ensureOffer('offer-counter-buyer', {
    jobId: 'job-counter',
    workerId: worker.id,
    type: 'BUYER_COUNTER',
    round: 2,
    proposedPay: 180,
    counterNote: 'Can you do both pieces for $180 labor?',
    note: 'Can you do both pieces for $180 labor?',
    status: 'COUNTER_OFFER',
    expiresAt: daysFromNow(2),
  })

  await ensureJob('job-assigned', {
    buyer: { connect: { id: buyer.id } },
    title: 'Help move furniture to storage',
    description: 'Need help loading couch and dining table into truck and moving 5 miles to storage.',
    categories: ['Moving', 'Delivery'],
    locationType: 'ON_SITE',
    address: '456 Oak Ave, Denver CO 80203',
    city: 'Denver',
    scheduleType: 'FIXED',
    fixedTime: daysFromNow(1),
    estimatedDuration: 120,
    payType: 'HOURLY',
    hourlyRate: 35,
    maxHours: 3,
    expensesAllowed: true,
    status: 'ASSIGNED',
    publishedAt: new Date(),
    taskSections: {
      create: [
        {
          name: 'Loading',
          order: 0,
          steps: {
            create: [
              { order: 0, type: 'CHECK_IN', title: 'Check in at pickup location', required: true },
              { order: 1, type: 'CHECKBOX', title: 'Load couch', required: true },
              { order: 2, type: 'CHECKBOX', title: 'Load dining table', required: true },
            ],
          },
        },
        {
          name: 'Delivery',
          order: 1,
          steps: {
            create: [
              { order: 0, type: 'PHOTO', title: 'Photo of items in storage unit', required: true },
              { order: 1, type: 'CHECK_OUT', title: 'Check out when complete', required: true },
            ],
          },
        },
      ],
    },
  })

  await ensureAssignment('assignment-1', {
    jobId: 'job-assigned',
    workerId: worker.id,
    agreedPay: 105,
    agreedHours: 3,
    feeRate: 0.20,
    feeSplitBuyer: 0.80,
    feeSplitWorker: 0.20,
    status: 'UPCOMING',
  })

  await ensureThread({
    id: 'thread-1',
    jobId: 'job-assigned',
    participantIds: [buyer.id, worker.id],
    messages: [
      {
        id: 'msg-assigned-1',
        senderId: buyer.id,
        text: 'Hi Alex! Looking forward to having you help with the move. Labor is $35/hr, up to 3 hours.',
      },
      {
        id: 'msg-assigned-2',
        senderId: worker.id,
        text: "Great — I'll be there tomorrow at the scheduled time. I'll bring straps and blankets.",
      },
      {
        id: 'msg-assigned-3',
        senderId: buyer.id,
        text: 'Perfect. The storage unit is #214; I will text the gate code when you are en route.',
      },
    ],
  })

  await ensureJob('job-in-progress', {
    buyer: { connect: { id: buyer.id } },
    title: 'Install ceiling fan in bedroom',
    description: 'Replace a light fixture with a ceiling fan. Fan is already purchased and in the room.',
    categories: ['Electrical', 'Installation'],
    locationType: 'ON_SITE',
    address: '88 Grant St, Denver CO 80203',
    city: 'Denver',
    scheduleType: 'FIXED',
    fixedTime: daysFromNow(-0.1),
    estimatedDuration: 90,
    payType: 'FIXED',
    fixedPrice: 140,
    expensesAllowed: true,
    expenseBudget: 20,
    status: 'IN_PROGRESS',
    publishedAt: daysFromNow(-3),
    taskSections: {
      create: [
        {
          name: 'Install',
          order: 0,
          steps: {
            create: [
              { order: 0, type: 'CHECK_IN', title: 'Check in and confirm power is off', required: true },
              { order: 1, type: 'PHOTO', title: 'Photo of old fixture removed', required: true },
              { order: 2, type: 'CHECKBOX', title: 'Mount fan and restore power', required: true },
              { order: 3, type: 'CHECK_OUT', title: 'Check out when complete', required: true },
            ],
          },
        },
      ],
    },
  })

  await ensureAssignment('assignment-in-progress', {
    jobId: 'job-in-progress',
    workerId: worker.id,
    agreedPay: 140,
    feeRate: 0.20,
    feeSplitBuyer: 0.80,
    feeSplitWorker: 0.20,
    status: 'IN_PROGRESS',
    checkInAt: daysFromNow(-0.05),
  })

  await ensureThread({
    id: 'thread-in-progress',
    jobId: 'job-in-progress',
    participantIds: [buyer.id, worker.id],
    messages: [
      {
        id: 'msg-progress-1',
        senderId: worker.id,
        text: "I'm on site and the breaker is off. Starting the swap now.",
      },
      {
        id: 'msg-progress-2',
        senderId: buyer.id,
        text: 'Thanks — spare brackets are in the closet if you need them.',
      },
    ],
  })

  await ensureJob('job-submitted', {
    buyer: { connect: { id: buyer.id } },
    title: 'Count inventory in warehouse',
    description: 'Count boxes on shelving units and record in spreadsheet.',
    categories: ['Inventory', 'Data Entry'],
    locationType: 'ON_SITE',
    address: '789 Industrial Way, Denver CO 80204',
    city: 'Denver',
    scheduleType: 'ANYTIME',
    deadline: daysFromNow(5),
    estimatedDuration: 180,
    payType: 'FIXED',
    fixedPrice: 120,
    expensesAllowed: true,
    expenseBudget: 40,
    status: 'SUBMITTED',
    publishedAt: daysFromNow(-2),
  })

  const submittedAssignment = await ensureAssignment('assignment-submitted', {
    jobId: 'job-submitted',
    workerId: worker.id,
    agreedPay: 120,
    feeRate: 0.20,
    feeSplitBuyer: 0.80,
    feeSplitWorker: 0.20,
    status: 'SUBMITTED',
    submittedAt: new Date(),
    autoApproveAt: daysFromNow(3),
  })

  await ensureExpense(
    'expense-submitted-parking',
    {
      assignmentId: submittedAssignment.id,
      type: 'PARKING',
      amount: 12.5,
      note: 'Warehouse lot parking',
      status: 'PENDING',
    },
    'job-submitted'
  )

  await ensureExpense(
    'expense-submitted-materials',
    {
      assignmentId: submittedAssignment.id,
      type: 'MATERIALS',
      amount: 8,
      note: 'Clipboard and pens',
      status: 'PENDING',
    },
    'job-submitted'
  )

  await ensureThread({
    id: 'thread-submitted',
    jobId: 'job-submitted',
    participantIds: [buyer.id, worker.id],
    messages: [
      {
        id: 'msg-submitted-1',
        senderId: worker.id,
        text: 'Inventory count is done and submitted. Spreadsheet is attached on the job.',
      },
      {
        id: 'msg-submitted-2',
        senderId: buyer.id,
        text: "Got it — I'll review the counts this afternoon.",
      },
    ],
  })

  console.log('\n🎉 Seeding complete!\n')
  console.log('📧 Demo Login Credentials:')
  console.log(`  Buyer: ${DEMO_BUYER_EMAIL}`)
  console.log(`  Worker: ${DEMO_WORKER_EMAIL}`)
  console.log(`  Password: ${DEMO_PASSWORD}`)
  console.log('')
}

main()
  .catch((e) => {
    console.error('❌ Seed error (continuing so the app can start):', e)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
