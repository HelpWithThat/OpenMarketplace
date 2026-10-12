import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await req.json()
    const userId = user.id

    const profile = await prisma.buyerProfile.create({
      data: {
        userId,
        businessName: data.businessName || null,
        description: data.description || null,
      },
    })

    return NextResponse.json(profile)
  } catch (error) {
    console.error('Buyer profile creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create profile' },
      { status: 500 }
    )
  }
}
