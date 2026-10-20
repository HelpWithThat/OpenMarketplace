import { canAccessJobExpenses } from './expense-photos'

export const WORK_PROOF_PHOTO_MAX = 8

export const WORK_PROOF_REQUIRED_MESSAGE =
  'Please add a photo of the finished work for this task.'

export const WORK_PROOF_HELP =
  'Show the finished work, and the old item removed if any.'

export const WORK_PROOF_POST_HELP =
  'If you pick Yes, the worker must take a photo of the finished work before this task is done.'

export function workProofHasPhotos(photos: unknown): boolean {
  return Array.isArray(photos) && photos.length > 0
}

export function workProofPhotoUrl(jobId: string, stepId: string, photoId: string): string {
  return `/api/jobs/${jobId}/tasks/${stepId}/photos/${photoId}`
}

export type ClientWorkProofPhoto = {
  id: string
  url: string
}

export function presentWorkProofPhotos(
  jobId: string,
  result: { stepId: string; proofPhotos?: { id: string }[] | null },
  allowed: boolean
): ClientWorkProofPhoto[] {
  if (!allowed || !result.proofPhotos?.length) return []
  return result.proofPhotos.map((photo) => ({
    id: photo.id,
    url: workProofPhotoUrl(jobId, result.stepId, photo.id),
  }))
}

export function presentAssignmentWorkProof<
  T extends { workerId?: string | null; taskResults?: any[] | null } | null | undefined,
>(jobId: string, assignment: T, userId: string, buyerId: string): T {
  if (!assignment?.taskResults) return assignment
  const allowed = canAccessJobExpenses(userId, { buyerId, assignment })
  return {
    ...assignment,
    taskResults: assignment.taskResults.map((result: any) => {
      const { proofPhotos, ...rest } = result
      return {
        ...rest,
        proofPhotos: presentWorkProofPhotos(
          jobId,
          { stepId: result.stepId, proofPhotos },
          allowed
        ),
      }
    }),
  }
}

export { canAccessJobExpenses as canAccessJobWorkProof }
