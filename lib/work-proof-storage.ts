import { readFile, stat } from 'fs/promises'
import {
  resolveUploadPath,
  validateExpensePhotoBuffer,
} from './expense-photo-storage'

export function workProofStoragePrefix(jobId: string, userId: string): string {
  return `work-proof/${jobId}/${userId}/`
}

export function isOwnedWorkProofPath(filePath: string, jobId: string, userId: string): boolean {
  const prefix = workProofStoragePrefix(jobId, userId)
  if (!filePath.startsWith(prefix)) return false
  if (filePath.includes('..') || filePath.includes('\\') || filePath.includes('\0')) return false
  const rest = filePath.slice(prefix.length)
  if (!rest || rest.includes('/') || rest.includes('\\')) return false
  return true
}

export async function readOwnedWorkProofFile(opts: {
  relativePath: string
  jobId: string
  userId: string
}): Promise<{ buffer: Buffer; contentType: string; size: number } | { error: string }> {
  if (!isOwnedWorkProofPath(opts.relativePath, opts.jobId, opts.userId)) {
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
