import { calculateFees, type FeeCalculation, type FeeSettings } from './fees'

export type MoneyRole = 'buyer' | 'worker'

export type BuyerFeeView = {
  role: 'buyer'
  laborValue: number
  expensesTotal: number
  yourFee: number
  youPay: number
}

export type WorkerFeeView = {
  role: 'worker'
  laborValue: number
  expensesTotal: number
  yourFee: number
  youGet: number
}

export type RoleFeeView = BuyerFeeView | WorkerFeeView

/** Keys that must never appear in a worker-facing payload. */
export const WORKER_FORBIDDEN_MONEY_KEYS = [
  'buyerFee',
  'buyerPays',
  'buyerTotal',
  'youPay',
  'feeSplitBuyer',
  'splitBuyer',
] as const

/** Keys that must never appear in a buyer-facing payload. */
export const BUYER_FORBIDDEN_MONEY_KEYS = [
  'workerFee',
  'workerGets',
  'workerPayout',
  'youGet',
  'feeSplitWorker',
  'splitWorker',
] as const

/** Combined platform totals leak the other side once you know your own fee. */
const SHARED_OMIT_KEYS = [
  'platformFee',
  'platformKeeps',
  'platformFeeTotal',
] as const

export function feeSettingsFromEnv(): FeeSettings {
  return {
    feeRate: parseFloat(process.env.FEE_RATE || '0.20'),
    feeSplitBuyer: parseFloat(process.env.FEE_SPLIT_BUYER || '0.80'),
    feeSplitWorker: parseFloat(process.env.FEE_SPLIT_WORKER || '0.20'),
  }
}

export function laborValueForJob(job: {
  status?: string
  fixedPrice?: number | null
  hourlyRate?: number | null
  maxHours?: number | null
  assignment?: { agreedPay?: number | null; status?: string } | null
}): number {
  const assignment = job.assignment
  const assignmentIsCurrent =
    assignment &&
    assignment.status !== 'CANCELLED' &&
    !(job.status === 'OPEN' && assignment.status === 'CANCELLED')
  if (assignmentIsCurrent && assignment.agreedPay != null) return assignment.agreedPay
  if (job.fixedPrice != null) return job.fixedPrice
  return (job.hourlyRate || 0) * (job.maxHours || 0)
}

export function feeViewForRole(calc: FeeCalculation, role: MoneyRole): RoleFeeView {
  if (role === 'buyer') {
    return {
      role: 'buyer',
      laborValue: calc.laborValue,
      expensesTotal: calc.expensesTotal,
      yourFee: calc.buyerFee,
      youPay: calc.buyerPays,
    }
  }
  return {
    role: 'worker',
    laborValue: calc.laborValue,
    expensesTotal: calc.expensesTotal,
    yourFee: calc.workerFee,
    youGet: calc.workerGets,
  }
}

export function feesForJob(
  job: {
    fixedPrice?: number | null
    hourlyRate?: number | null
    maxHours?: number | null
    assignment?: {
      agreedPay?: number | null
      expenses?: { amount: number; status?: string }[] | null
    } | null
  },
  role: MoneyRole,
  expensesTotal?: number
): RoleFeeView {
  const labor = laborValueForJob(job)
  const expenses =
    expensesTotal ??
    job.assignment?.expenses
      ?.filter((e) => !e.status || e.status === 'APPROVED' || e.status === 'PENDING')
      .reduce((sum, e) => sum + e.amount, 0) ??
    0
  return feeViewForRole(calculateFees(labor, expenses, feeSettingsFromEnv()), role)
}

export function formatBuyerFeeView(view: BuyerFeeView): string {
  if (view.expensesTotal > 0) {
    return `You'll pay: $${view.youPay.toFixed(2)} ($${view.laborValue.toFixed(2)} labor + $${view.yourFee.toFixed(2)} fee + $${view.expensesTotal.toFixed(2)} expenses)`
  }
  return `You'll pay: $${view.youPay.toFixed(2)} ($${view.laborValue.toFixed(2)} labor + $${view.yourFee.toFixed(2)} fee)`
}

export function formatWorkerFeeView(view: WorkerFeeView): string {
  if (view.expensesTotal > 0) {
    return `You'll get: $${view.youGet.toFixed(2)} ($${view.laborValue.toFixed(2)} − $${view.yourFee.toFixed(2)} fee + $${view.expensesTotal.toFixed(2)} expenses)`
  }
  return `You'll get: $${view.youGet.toFixed(2)} ($${view.laborValue.toFixed(2)} − $${view.yourFee.toFixed(2)} fee)`
}

export function forbiddenMoneyKeysFor(role: MoneyRole): readonly string[] {
  return role === 'worker' ? WORKER_FORBIDDEN_MONEY_KEYS : BUYER_FORBIDDEN_MONEY_KEYS
}

export function collectForbiddenMoneyKeys(value: unknown, role: MoneyRole): string[] {
  const forbidden = new Set<string>([...forbiddenMoneyKeysFor(role), ...SHARED_OMIT_KEYS])
  const found = new Set<string>()

  const walk = (node: unknown) => {
    if (!node || typeof node !== 'object') return
    if (node instanceof Date) return
    if (Array.isArray(node)) {
      node.forEach(walk)
      return
    }
    for (const [key, child] of Object.entries(node as Record<string, unknown>)) {
      if (forbidden.has(key)) found.add(key)
      walk(child)
    }
  }

  walk(value)
  return [...found]
}

export function omitCrossSideMoney<T>(value: T, role: MoneyRole): T {
  const forbidden = new Set<string>([...forbiddenMoneyKeysFor(role), ...SHARED_OMIT_KEYS])

  const walk = (node: unknown): unknown => {
    if (!node || typeof node !== 'object') return node
    if (node instanceof Date) return node
    if (Array.isArray(node)) return node.map(walk)
    const out: Record<string, unknown> = {}
    for (const [key, child] of Object.entries(node as Record<string, unknown>)) {
      if (forbidden.has(key)) continue
      out[key] = walk(child)
    }
    return out
  }

  return walk(value) as T
}

export function moneyRoleForUser(
  user: { id: string; isWorker?: boolean; isBuyer?: boolean },
  job: { buyerId: string; assignment?: { workerId?: string } | null }
): MoneyRole {
  if (job.buyerId === user.id) return 'buyer'
  return 'worker'
}
