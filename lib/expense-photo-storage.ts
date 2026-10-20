import { EXPENSE_PHOTO_MAX_BYTES } from './expense-photos'

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
