import { readFile, stat } from 'fs/promises'
import path from 'path'
import { EXPENSE_PHOTO_MAX_BYTES } from './expense-photos'

export const UPLOAD_ROOT = path.resolve(process.cwd(), 'uploads')

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
}

export const ALLOWED_EXPENSE_PHOTO_TYPES = Object.keys(MIME_TO_EXT)

export function extensionForMime(mime: string): string | null {
  return MIME_TO_EXT[mime] || null
}

export function detectImageMime(buffer: Buffer): string | null {
  if (buffer.length < 12) return null
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg'
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return 'image/png'
  }
  if (
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38 &&
    (buffer[4] === 0x37 || buffer[4] === 0x39) &&
    buffer[5] === 0x61
  ) {
    return 'image/gif'
  }
  if (
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp'
  }
  return null
}

export function validateExpensePhotoBuffer(buffer: Buffer): {
  ok: true
  contentType: string
} | { ok: false; error: string } {
  if (buffer.length === 0) {
    return { ok: false, error: 'That photo is empty. Please try another.' }
  }
  if (buffer.length > EXPENSE_PHOTO_MAX_BYTES) {
    return { ok: false, error: 'That photo is too large. Please use a photo under 8 MB.' }
  }
  const detected = detectImageMime(buffer)
  if (!detected) {
    return { ok: false, error: 'Please use a photo (JPEG, PNG, WEBP, or GIF).' }
  }
  return { ok: true, contentType: detected }
}

export function expensePhotoStoragePrefix(jobId: string, userId: string): string {
  return `expenses/${jobId}/${userId}/`
}

export function isOwnedExpensePhotoPath(filePath: string, jobId: string, userId: string): boolean {
  const prefix = expensePhotoStoragePrefix(jobId, userId)
  if (!filePath.startsWith(prefix)) return false
  if (filePath.includes('..') || filePath.includes('\\') || filePath.includes('\0')) return false
  const rest = filePath.slice(prefix.length)
  if (!rest || rest.includes('/') || rest.includes('\\')) return false
  return true
}

export function resolveUploadPath(relativePath: string): string | null {
  if (!relativePath || relativePath.includes('\0')) return null
  const resolved = path.resolve(UPLOAD_ROOT, relativePath)
  if (resolved !== UPLOAD_ROOT && !resolved.startsWith(UPLOAD_ROOT + path.sep)) return null
  return resolved
}

export async function readOwnedExpensePhotoFile(opts: {
  relativePath: string
  jobId: string
  userId: string
}): Promise<{ buffer: Buffer; contentType: string; size: number } | { error: string }> {
  if (!isOwnedExpensePhotoPath(opts.relativePath, opts.jobId, opts.userId)) {
    return { error: 'That photo does not belong to this job' }
  }
  const fullPath = resolveUploadPath(opts.relativePath)
  if (!fullPath) return { error: 'Photo not found' }
  try {
    const info = await stat(fullPath)
    if (!info.isFile()) return { error: 'Photo not found' }
    const buffer = await readFile(fullPath)
    const check = validateExpensePhotoBuffer(buffer)
    if (!check.ok) return { error: check.error }
    return { buffer, contentType: check.contentType, size: buffer.length }
  } catch {
    return { error: 'Photo not found' }
  }
}
