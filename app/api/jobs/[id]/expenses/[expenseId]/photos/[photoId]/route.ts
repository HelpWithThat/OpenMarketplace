import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canAccessJobExpenses } from '@/lib/expense-photos'
import { resolveUploadPath } from '@/lib/expense-photo-storage'
import { readFile } from 'fs/promises'
import { existsSync, statSync } from 'fs'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; expenseId: string; photoId: string }> }
) {
  try {
    const { id: jobId, expenseId, photoId } = await params
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        assignment: {
          include: {
            expenses: {
              where: { id: expenseId },
              include: { photos: { where: { id: photoId } } },
            },
          },
        },
      },
    })
    if (!job) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    if (!canAccessJobExpenses(user.id, job)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const photo = job.assignment?.expenses[0]?.photos[0]
    if (!photo) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const fullPath = resolveUploadPath(photo.path)
    if (!fullPath || !existsSync(fullPath) || !statSync(fullPath).isFile()) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const buf = await readFile(fullPath)
    return new NextResponse(Uint8Array.from(buf), {
      headers: {
        'Content-Type': photo.contentType || 'application/octet-stream',
        'Content-Length': String(buf.length),
        'Cache-Control': 'private, max-age=0, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    console.error('Expense photo read error:', error)
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
