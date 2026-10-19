/**
 * Job cancellation policy.
 *
 * ONE penalty rule (no tiers):
 * - Worker cancels after accepting (job assigned, in progress, or similar):
 *   record a fixed $25 Penalty on that assignment ("Worker cancelled after accepting").
 *   The job reopens (OPEN) so someone else can take it.
 *   If a payment is still HELD/PENDING, refund the buyer in full. The worker is not paid.
 *   The $25 penalty is the worker's record (and is deducted from labor if that assignment
 *   were ever paid). It is never shown to the buyer.
 * - Buyer cancels before work starts (OPEN, or ASSIGNED with no check-in):
 *   job is closed (CANCELLED) and does not reopen. Full refund of any HELD/PENDING payment.
 *   No worker penalty.
 * - Buyer cannot cancel after work has started (check-in, IN_PROGRESS, SUBMITTED, or later).
 *   Approve the work or open a dispute instead.
 *
 * Money privacy: each side only sees their own amounts. Notifications never include
 * the other side's fee, payout, or total.
 */

export const WORKER_CANCEL_PENALTY_USD = 25
export const WORKER_CANCEL_PENALTY_RULE = 'Worker cancelled after accepting'

export const CANCELABLE_JOB_STATUSES = [
  'OPEN',
  'ASSIGNED',
  'IN_PROGRESS',
] as const

export const TERMINAL_JOB_STATUSES = [
  'SUBMITTED',
  'APPROVED',
  'PAID',
  'CANCELLED',
  'DISPUTED',
] as const

export type CancelRole = 'buyer' | 'worker'

export type CancelDecision =
  | { ok: true; role: CancelRole; reopen: boolean; applyWorkerPenalty: boolean; refundHeldPayment: boolean }
  | { ok: false; error: string; status: number }

type JobLike = {
  status: string
  buyerId: string
}

type AssignmentLike = {
  workerId: string
  status: string
  checkInAt?: Date | string | null
  payment?: { status: string } | null
} | null | undefined

export function workHasStarted(assignment: AssignmentLike): boolean {
  if (!assignment) return false
  if (assignment.checkInAt) return true
  return assignment.status === 'IN_PROGRESS' || assignment.status === 'SUBMITTED' || assignment.status === 'APPROVED' || assignment.status === 'PAID'
}

export function isActiveAssignment(assignment: AssignmentLike): boolean {
  if (!assignment) return false
  return assignment.status !== 'CANCELLED'
}

export function decideCancel(opts: {
  userId: string
  job: JobLike
  assignment: AssignmentLike
}): CancelDecision {
  const { userId, job, assignment } = opts
  const isBuyer = job.buyerId === userId
  const isAssignedWorker = Boolean(assignment && assignment.workerId === userId)

  if (!isBuyer && !isAssignedWorker) {
    return { ok: false, error: 'You cannot cancel this job', status: 403 }
  }

  if (TERMINAL_JOB_STATUSES.includes(job.status as (typeof TERMINAL_JOB_STATUSES)[number])) {
    if (job.status === 'CANCELLED') {
      return { ok: false, error: 'This job is already cancelled', status: 400 }
    }
    if (job.status === 'SUBMITTED') {
      return { ok: false, error: 'This job is waiting for approval. You cannot cancel it now.', status: 400 }
    }
    return { ok: false, error: 'This job can no longer be cancelled', status: 400 }
  }

  if (isBuyer) {
    if (workHasStarted(assignment)) {
      return {
        ok: false,
        error: 'Work has already started. Approve the job or open a dispute instead of cancelling.',
        status: 400,
      }
    }
    if (job.status !== 'OPEN' && job.status !== 'ASSIGNED') {
      return { ok: false, error: 'You can only cancel a job before work starts', status: 400 }
    }
    return {
      ok: true,
      role: 'buyer',
      reopen: false,
      applyWorkerPenalty: false,
      refundHeldPayment: Boolean(
        assignment?.payment && (assignment.payment.status === 'HELD' || assignment.payment.status === 'PENDING')
      ),
    }
  }

  // Assigned worker
  if (!assignment || !isActiveAssignment(assignment)) {
    return { ok: false, error: 'You are not assigned to this job', status: 400 }
  }
  if (job.status !== 'ASSIGNED' && job.status !== 'IN_PROGRESS') {
    return { ok: false, error: 'You can only cancel after you have been assigned, and before the work is submitted', status: 400 }
  }
  if (assignment.payment && assignment.payment.status === 'PAID_OUT') {
    return { ok: false, error: 'This job has already been paid and cannot be cancelled', status: 400 }
  }

  return {
    ok: true,
    role: 'worker',
    reopen: true,
    applyWorkerPenalty: true,
    refundHeldPayment: Boolean(
      assignment.payment && (assignment.payment.status === 'HELD' || assignment.payment.status === 'PENDING')
    ),
  }
}

export function workerPenaltyAmount(apply: boolean): number {
  return apply ? WORKER_CANCEL_PENALTY_USD : 0
}

export function cancelCopy(role: CancelRole, reopen: boolean): {
  buttonLabel: string
  title: string
  body: string
  confirmLabel: string
  keepLabel: string
} {
  if (role === 'worker') {
    return {
      buttonLabel: "I can't make it",
      title: 'Cancel this job?',
      body: "You won't do this job. We'll tell the buyer and offer it to other people who asked for it.",
      confirmLabel: "Yes, I can't make it",
      keepLabel: 'Keep this job',
    }
  }
  return {
    buttonLabel: "I don't need this anymore",
    title: 'Cancel this job?',
    body: reopen
      ? 'This job will be closed.'
      : "This job will be closed. Anyone who asked to do it will be told they don't need to come.",
    confirmLabel: "Yes, I don't need this anymore",
    keepLabel: 'Keep this job',
  }
}

export function cancelNotificationText(opts: {
  cancelledBy: CancelRole
  jobTitle: string
  workerName?: string
  audience: 'buyer' | 'assigned_worker' | 'other_applicant'
}): { title: string; message: string } {
  const jobTitle = opts.jobTitle
  if (opts.cancelledBy === 'worker') {
    if (opts.audience === 'buyer') {
      const who = opts.workerName || 'The worker'
      return {
        title: "The worker can't make it",
        message: `${who} cancelled "${jobTitle}". The job is open again so someone else can take it.`,
      }
    }
    return {
      title: 'This job is open again',
      message: `"${jobTitle}" is available again. The first worker can't make it.`,
    }
  }
  if (opts.audience === 'assigned_worker') {
    return {
      title: 'This job was cancelled',
      message: `The buyer cancelled "${jobTitle}". You don't need to go.`,
    }
  }
  return {
    title: 'This job was cancelled',
    message: `The buyer cancelled "${jobTitle}".`,
  }
}
