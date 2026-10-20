import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canAccessJobWorkProof } from '@/lib/work-proof'
import { jobPhotoHttpResponse } from '@/lib/job-photos'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string; photoId: string }> }
) {
  try {
    const { id: jobId, stepId, photoId } = await params
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: { assignment: true },
    })
    if (!job) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    if (!canAccessJobWorkProof(user.id, job)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const photo = await prisma.jobPhoto.findUnique({
      where: { id: photoId },
      include: { result: true },
    })
    if (!photo || photo.jobId !== jobId || photo.kind !== 'WORK_PROOF' || photo.result?.stepId !== stepId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return jobPhotoHttpResponse(photo)
  } catch (error) {
    console.error('Work proof photo read error:', error)
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
