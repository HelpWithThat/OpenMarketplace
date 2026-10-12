import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import bcrypt from 'bcrypt'

let connectionString = process.env.DATABASE_URL!

if (!connectionString) {
  console.error('❌ DATABASE_URL not found')
  process.exit(1)
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
  } catch (e) {
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

async function main() {
  console.log('🌱 Seeding database...\n')

  // Check connection
  try {
    await prisma.$queryRaw`SELECT 1`
    console.log('✅ Database connection successful\n')
  } catch (error) {
    console.error('❌ Database connection failed:', error)
    throw error
  }

  const existingDemoUsers = await prisma.user.findMany({
    where: { email: { in: ['buyer@demo.com', 'worker@demo.com'] } },
    select: { email: true },
  })
  if (existingDemoUsers.length >= 2) {
    console.log('Demo users already exist; skipping seed.')
    return
  }

  const hashedPassword = await bcrypt.hash('password123', 10)

  // Create demo buyer
  console.log('Creating/updating demo buyer...')
  const buyer = await prisma.user.upsert({
    where: { email: 'buyer@demo.com' },
    update: {
      password: hashedPassword,
      name: 'Sarah Johnson',
      isBuyer: true,
      isWorker: false,
      emailVerified: new Date(),
    },
    create: {
      email: 'buyer@demo.com',
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
  })
  console.log('✅ Created buyer: buyer@demo.com')

  // Create demo worker
  console.log('Creating/updating demo worker...')
  const worker = await prisma.user.upsert({
    where: { email: 'worker@demo.com' },
    update: {
      password: hashedPassword,
      name: 'Alex Rivera',
      isWorker: true,
      isBuyer: false,
      emailVerified: new Date(),
    },
    create: {
      email: 'worker@demo.com',
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
  })
  console.log('✅ Created worker: worker@demo.com')

  // Create SmartMatch for worker
  await prisma.smartMatch.upsert({
    where: { id: 'demo-smartmatch' },
    update: {
      workerId: worker.id,
      name: 'All local jobs',
      maxDistance: 30,
      minPay: 50,
      categories: ['TV Mounting', 'Handyman', 'Installation'],
      active: true,
    },
    create: {
      id: 'demo-smartmatch',
      workerId: worker.id,
      name: 'All local jobs',
      maxDistance: 30,
      minPay: 50,
      categories: ['TV Mounting', 'Handyman', 'Installation'],
      active: true,
    },
  })

  // Fee settings
  await prisma.feeSettings.upsert({
    where: { id: 'default' },
    update: {
      feeRate: 0.20,
      feeSplitBuyer: 0.80,
      feeSplitWorker: 0.20,
      processingFeePayer: 'PLATFORM',
    },
    create: {
      id: 'default',
      feeRate: 0.20,
      feeSplitBuyer: 0.80,
      feeSplitWorker: 0.20,
      processingFeePayer: 'PLATFORM',
    },
  })

  // Job 1: OPEN status with multi-section checklist
  console.log('Creating/updating job 1 (OPEN)...')
  
  // Delete existing to recreate with fresh task structure
  await prisma.assignment.deleteMany({ where: { jobId: 'job-open' } })
  await prisma.offer.deleteMany({ where: { jobId: 'job-open' } })
  await prisma.job.deleteMany({ where: { id: 'job-open' } })
  
  await prisma.job.create({
    data: {
      id: 'job-open',
      buyerId: buyer.id,
      title: 'Mount 65" TV on living room wall',
      description: 'Need help mounting a 65-inch TV on a brick wall. TV and mount bracket already purchased. Must be level and centered above fireplace.',
      categories: ['TV Mounting', 'Installation'],
      locationType: 'ON_SITE',
      address: '123 Main St, Denver CO 80202',
      city: 'Denver',
      scheduleType: 'FIXED',
      fixedTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
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
                {
                  order: 0,
                  type: 'CHECK_IN',
                  title: 'Check in on arrival',
                  required: true,
                },
                {
                  order: 1,
                  type: 'PHOTO',
                  title: 'Take photo of wall before work',
                  required: true,
                },
              ],
            },
          },
          {
            name: 'Installation',
            order: 1,
            steps: {
              create: [
                {
                  order: 0,
                  type: 'CHECKBOX',
                  title: 'Locate wall studs',
                  required: true,
                },
                {
                  order: 1,
                  type: 'CHECKBOX',
                  title: 'Install wall bracket (level)',
                  required: true,
                },
                {
                  order: 2,
                  type: 'CHECKBOX',
                  title: 'Mount TV on bracket',
                  required: true,
                },
              ],
            },
          },
          {
            name: 'Closeout',
            order: 2,
            steps: {
              create: [
                {
                  order: 0,
                  type: 'PHOTO',
                  title: 'Take photo of completed installation',
                  required: true,
                },
                {
                  order: 1,
                  type: 'SIGNATURE',
                  title: 'Homeowner signature',
                  required: true,
                },
                {
                  order: 2,
                  type: 'CHECK_OUT',
                  title: 'Check out when complete',
                  required: true,
                },
              ],
            },
          },
        ],
      },
    },
  })
  console.log('✅ Created OPEN job')

  // Job 2: ASSIGNED status (worker assigned)
  console.log('Creating/updating job 2 (ASSIGNED)...')
  
  // Delete existing to recreate with fresh structure
  await prisma.messageThread.deleteMany({ where: { jobId: 'job-assigned' } })
  await prisma.assignment.deleteMany({ where: { jobId: 'job-assigned' } })
  await prisma.offer.deleteMany({ where: { jobId: 'job-assigned' } })
  await prisma.job.deleteMany({ where: { id: 'job-assigned' } })
  
  const assignedJob = await prisma.job.create({
    data: {
      id: 'job-assigned',
      buyerId: buyer.id,
      title: 'Help move furniture to storage',
      description: 'Need help loading couch and dining table into truck and moving 5 miles to storage.',
      categories: ['Moving', 'Delivery'],
      locationType: 'ON_SITE',
      address: '456 Oak Ave, Denver CO 80203',
      city: 'Denver',
      scheduleType: 'FIXED',
      fixedTime: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
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
                {
                  order: 0,
                  type: 'CHECK_IN',
                  title: 'Check in at pickup location',
                  required: true,
                },
                {
                  order: 1,
                  type: 'CHECKBOX',
                  title: 'Load couch',
                  required: true,
                },
                {
                  order: 2,
                  type: 'CHECKBOX',
                  title: 'Load dining table',
                  required: true,
                },
              ],
            },
          },
          {
            name: 'Delivery',
            order: 1,
            steps: {
              create: [
                {
                  order: 0,
                  type: 'PHOTO',
                  title: 'Photo of items in storage unit',
                  required: true,
                },
                {
                  order: 1,
                  type: 'CHECK_OUT',
                  title: 'Check out when complete',
                  required: true,
                },
              ],
            },
          },
        ],
      },
    },
  })

  await prisma.assignment.upsert({
    where: { id: 'assignment-1' },
    update: {},
    create: {
      id: 'assignment-1',
      jobId: assignedJob.id,
      workerId: worker.id,
      agreedPay: 105,
      agreedHours: 3,
      feeRate: 0.20,
      feeSplitBuyer: 0.80,
      feeSplitWorker: 0.20,
      status: 'UPCOMING',
    },
  })

  // Create message thread
  await prisma.messageThread.upsert({
    where: { id: 'thread-1' },
    update: {},
    create: {
      id: 'thread-1',
      jobId: assignedJob.id,
      participants: {
        create: [
          { userId: buyer.id },
          { userId: worker.id },
        ],
      },
      messages: {
        create: [
          {
            senderId: buyer.id,
            text: 'Hi Alex! Looking forward to having you help with the move.',
          },
          {
            senderId: worker.id,
            text: 'Great! I\'ll be there tomorrow at the scheduled time.',
          },
        ],
      },
    },
  })
  console.log('✅ Created ASSIGNED job with assignment and messages')

  // Job 3: SUBMITTED status
  console.log('Creating/updating job 3 (SUBMITTED)...')
  
  // Delete existing to recreate
  await prisma.assignment.deleteMany({ where: { jobId: 'job-submitted' } })
  await prisma.offer.deleteMany({ where: { jobId: 'job-submitted' } })
  await prisma.job.deleteMany({ where: { id: 'job-submitted' } })
  
  const submittedJob = await prisma.job.create({
    data: {
      id: 'job-submitted',
      buyerId: buyer.id,
      title: 'Count inventory in warehouse',
      description: 'Count boxes on shelving units and record in spreadsheet.',
      categories: ['Inventory', 'Data Entry'],
      locationType: 'ON_SITE',
      address: '789 Industrial Way, Denver CO 80204',
      city: 'Denver',
      scheduleType: 'ANYTIME',
      deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      estimatedDuration: 180,
      payType: 'FIXED',
      fixedPrice: 120,
      expensesAllowed: false,
      status: 'SUBMITTED',
      publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
  })

  const submittedAssignment = await prisma.assignment.create({
    data: {
      jobId: submittedJob.id,
      workerId: worker.id,
      agreedPay: 120,
      feeRate: 0.20,
      feeSplitBuyer: 0.80,
      feeSplitWorker: 0.20,
      status: 'SUBMITTED',
      submittedAt: new Date(),
      autoApproveAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    },
  })
  console.log('✅ Created SUBMITTED job')

  console.log('\n🎉 Seeding complete!\n')
  console.log('📧 Demo Login Credentials:')
  console.log('  Buyer: buyer@demo.com')
  console.log('  Worker: worker@demo.com')
  console.log('  Password: password123')
  console.log('')
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
