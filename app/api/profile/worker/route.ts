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

    const profile = await prisma.workerProfile.create({
      data: {
        userId,
        displayName: data.displayName,
        bio: data.bio || null,
        skills: data.skills || [],
        tools: data.tools || [],
        publicCity: data.publicCity,
        publicZip: data.publicZip,
        travelRadius: data.travelRadius,
      },
    })

    return NextResponse.json(profile)
  } catch (error) {
    console.error('Worker profile creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create profile' },
      { status: 500 }
    )
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await req.json()

    const profile = await prisma.workerProfile.upsert({
      where: { userId: user.id },
      update: {
        bio: data.bio ?? undefined,
        skills: data.skills ?? undefined,
        tools: data.tools ?? undefined,
        publicCity: data.city ?? data.publicCity ?? undefined,
        publicZip: data.zip ?? data.publicZip ?? undefined,
        travelRadius: data.travelRadius ?? undefined,
      },
      create: {
        userId: user.id,
        displayName: data.displayName || user.name,
        bio: data.bio || null,
        skills: data.skills || [],
        tools: data.tools || [],
        publicCity: data.city ?? data.publicCity,
        publicZip: data.zip ?? data.publicZip,
        travelRadius: data.travelRadius,
      },
    })

    return NextResponse.json(profile)
  } catch (error) {
    console.error('Worker profile update error:', error)
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    )
  }
}
