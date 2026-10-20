import { NextResponse } from 'next/server'
import sharp from 'sharp'
import { prisma } from './prisma'
import { EXPENSE_PHOTO_MAX_BYTES, isExpensePhotoKind, type ExpensePhotoKindName } from './expense-photos'
import { validateExpensePhotoBuffer } from './expense-photo-storage'

export const JOB_PHOTO_MAX_EDGE = 1600
export const JOB_PHOTO_JPEG_QUALITY = 80

export const JOB_PHOTO_META_SELECT = {
  id: true,
  kind: true,
  contentType: true,
  size: true,
} as const

export type JobPhotoKindName = ExpensePhotoKindName | 'WORK_PROOF'

export async function prepareJobPhoto(buffer: Buffer): Promise<
  { ok: true; data: Buffer; contentType: string; size: number } | { ok: false; error: string }
> {
  const check = validateExpensePhotoBuffer(buffer)
  if (!check.ok) return check
  try {
    const data = await sharp(buffer)
      .rotate()
      .resize({
        width: JOB_PHOTO_MAX_EDGE,
        height: JOB_PHOTO_MAX_EDGE,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: JOB_PHOTO_JPEG_QUALITY, mozjpeg: true })
      .toBuffer()
    if (data.length > EXPENSE_PHOTO_MAX_BYTES) {
      return { ok: false, error: 'That photo is too large. Please use a photo under 8 MB.' }
    }
    return { ok: true, data, contentType: 'image/jpeg', size: data.length }
  } catch {
    return { ok: false, error: 'Please use a photo (JPEG, PNG, WEBP, or GIF).' }
  }
}

export async function createJobPhoto(opts: {
  jobId: string
  ownerId: string
  kind: JobPhotoKindName
  buffer: Buffer
}) {
  const prepared = await prepareJobPhoto(opts.buffer)
  if (!prepared.ok) return prepared
  const photo = await prisma.jobPhoto.create({
    data: {
      jobId: opts.jobId,
      ownerId: opts.ownerId,
      kind: opts.kind,
      data: prepared.data,
      contentType: prepared.contentType,
      size: prepared.size,
    },
    select: JOB_PHOTO_META_SELECT,
  })
  return { ok: true as const, photo }
}

export async function claimOwnedJobPhotos(opts: {
  ids: string[]
  jobId: string
  ownerId: string
  kinds: JobPhotoKindName[]
  expenseId?: string
  resultId?: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!opts.ids.length) return { ok: true }
  const uniqueIds = Array.from(new Set(opts.ids))
  const photos = await prisma.jobPhoto.findMany({
    where: { id: { in: uniqueIds } },
    select: { id: true, jobId: true, ownerId: true, kind: true, expenseId: true, resultId: true },
  })
  if (photos.length !== uniqueIds.length) {
    return { ok: false, error: 'One of the photos could not be saved' }
  }
  for (const photo of photos) {
    if (photo.jobId !== opts.jobId || photo.ownerId !== opts.ownerId) {
      return { ok: false, error: 'That photo does not belong to this job' }
    }
    if (!opts.kinds.includes(photo.kind as JobPhotoKindName)) {
      return { ok: false, error: 'One of the photos could not be saved' }
    }
    if (opts.expenseId && photo.expenseId && photo.expenseId !== opts.expenseId) {
      return { ok: false, error: 'One of the photos could not be saved' }
    }
    if (opts.resultId && photo.resultId && photo.resultId !== opts.resultId) {
      return { ok: false, error: 'One of the photos could not be saved' }
    }
  }
  await prisma.jobPhoto.updateMany({
    where: { id: { in: uniqueIds }, jobId: opts.jobId, ownerId: opts.ownerId },
    data: {
      ...(opts.expenseId ? { expenseId: opts.expenseId } : {}),
      ...(opts.resultId ? { resultId: opts.resultId } : {}),
    },
  })
  return { ok: true }
}

export function incomingPhotoId(photo: unknown): string | null {
  if (!photo || typeof photo !== 'object') return null
  const record = photo as { id?: unknown; path?: unknown }
  if (typeof record.id === 'string' && record.id) return record.id
  return null
}

export function expenseKindFromIncoming(photo: unknown): ExpensePhotoKindName | null {
  if (!photo || typeof photo !== 'object') return null
  const kind = (photo as { kind?: unknown }).kind
  return isExpensePhotoKind(kind) ? kind : null
}

export function jobPhotoHttpResponse(photo: { data: Buffer | Uint8Array; contentType: string | null }) {
  const buf = Buffer.from(photo.data)
  return new NextResponse(Uint8Array.from(buf), {
    headers: {
      'Content-Type': photo.contentType || 'image/jpeg',
      'Content-Length': String(buf.length),
      'Cache-Control': 'private, max-age=0, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
