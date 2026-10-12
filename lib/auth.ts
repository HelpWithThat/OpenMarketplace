import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { prisma } from './prisma'
import { getSessionOptions } from './session'
import bcrypt from 'bcrypt'

export interface SessionData {
  userId: string
  email: string
  name: string
  isWorker: boolean
  isBuyer: boolean
  isLoggedIn: boolean
}

export async function getSession() {
  const cookieStore = await cookies()
  return getIronSession<SessionData>(cookieStore, getSessionOptions())
}

export async function getCurrentUser() {
  const session = await getSession()
  
  if (!session.isLoggedIn || !session.userId) {
    return null
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      workerProfile: true,
      buyerProfile: true,
    },
  })

  return user
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
  })

  if (!user || !user.password) {
    return { error: 'Invalid email or password' }
  }

  const isValid = await bcrypt.compare(password, user.password)
  if (!isValid) {
    return { error: 'Invalid email or password' }
  }

  if (user.status !== 'ACTIVE') {
    return { error: 'Account suspended' }
  }

  const session = await getSession()
  session.userId = user.id
  session.email = user.email
  session.name = user.name || ''
  session.isWorker = user.isWorker
  session.isBuyer = user.isBuyer
  session.isLoggedIn = true
  await session.save()

  return { success: true, user }
}

export async function logout() {
  const session = await getSession()
  session.destroy()
}

export async function signup(data: {
  email: string
  password: string
  name: string
  isWorker: boolean
  isBuyer: boolean
}) {
  const existing = await prisma.user.findUnique({
    where: { email: data.email },
  })

  if (existing) {
    return { error: 'Email already registered' }
  }

  const hashedPassword = await bcrypt.hash(data.password, 10)

  const user = await prisma.user.create({
    data: {
      email: data.email,
      password: hashedPassword,
      name: data.name,
      isWorker: data.isWorker,
      isBuyer: data.isBuyer,
      status: 'ACTIVE',
    },
  })

  const session = await getSession()
  session.userId = user.id
  session.email = user.email
  session.name = user.name || ''
  session.isWorker = user.isWorker
  session.isBuyer = user.isBuyer
  session.isLoggedIn = true
  await session.save()

  return { success: true, user }
}
