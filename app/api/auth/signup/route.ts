import { NextRequest, NextResponse } from 'next/server'
import { signup } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const data = await req.json()

    if (!data.email || !data.password || !data.name) {
      return NextResponse.json(
        { error: 'Email, password, and name required' },
        { status: 400 }
      )
    }

    if (data.password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }

    if (!data.isWorker && !data.isBuyer) {
      return NextResponse.json(
        { error: 'Please select at least one role' },
        { status: 400 }
      )
    }

    const result = await signup(data)

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
