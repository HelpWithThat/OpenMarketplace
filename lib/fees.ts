/**
 * Fee Calculator for Open Marketplace
 * 
 * Based on product plan section 5:
 * - Platform fee is 20% of labor value
 * - Split between buyer and worker (configurable 80/20 or 70/30)
 * - Expenses are passed through at cost with NO fee
 * - Fee is calculated on final approved labor value only
 */

export interface FeeCalculation {
  laborValue: number
  platformFee: number
  buyerFee: number
  workerFee: number
  expensesTotal: number
  buyerPays: number
  workerGets: number
  platformKeeps: number
}

export interface FeeSettings {
  feeRate: number        // e.g., 0.20 for 20%
  feeSplitBuyer: number  // e.g., 0.80 for 80% or 0.70 for 70%
  feeSplitWorker: number // e.g., 0.20 for 20% or 0.30 for 30%
}

/**
 * Calculate fees for a job
 * 
 * @param laborValue - The pay for the work itself (fixed price or hourly rate × hours)
 * @param expensesTotal - Total approved expenses (travel, parking, materials, etc.)
 * @param settings - Fee rate and split configuration
 * @returns Complete fee breakdown
 */
export function calculateFees(
  laborValue: number,
  expensesTotal: number = 0,
  settings: FeeSettings = {
    feeRate: 0.20,
    feeSplitBuyer: 0.80,
    feeSplitWorker: 0.20,
  }
): FeeCalculation {
  // Validate inputs
  if (laborValue < 0) throw new Error('Labor value cannot be negative')
  if (expensesTotal < 0) throw new Error('Expenses total cannot be negative')
  if (settings.feeRate < 0 || settings.feeRate > 1) {
    throw new Error('Fee rate must be between 0 and 1')
  }
  if (settings.feeSplitBuyer < 0 || settings.feeSplitBuyer > 1) {
    throw new Error('Buyer fee split must be between 0 and 1')
  }
  if (settings.feeSplitWorker < 0 || settings.feeSplitWorker > 1) {
    throw new Error('Worker fee split must be between 0 and 1')
  }
  
  // Round to 2 decimal places helper
  const round = (n: number) => Math.round(n * 100) / 100
  
  // Calculate platform fee on labor only
  const platformFee = round(laborValue * settings.feeRate)
  
  // Split the fee between buyer and worker
  const buyerFee = round(platformFee * settings.feeSplitBuyer)
  const workerFee = round(platformFee * settings.feeSplitWorker)
  
  // Calculate totals
  // Buyer pays: labor + buyer's share of fee + expenses
  const buyerPays = round(laborValue + buyerFee + expensesTotal)
  
  // Worker gets: labor - worker's share of fee + expenses
  const workerGets = round(laborValue - workerFee + expensesTotal)
  
  // Platform keeps the total fee (before processing fees)
  const platformKeeps = platformFee
  
  return {
    laborValue: round(laborValue),
    platformFee,
    buyerFee,
    workerFee,
    expensesTotal: round(expensesTotal),
    buyerPays,
    workerGets,
    platformKeeps,
  }
}

/**
 * Format fee display for workers
 * Shows "You'll get: $X (labor - fee) + expenses"
 */
export function formatWorkerPay(calc: FeeCalculation): string {
  const laborAfterFee = calc.laborValue - calc.workerFee
  if (calc.expensesTotal > 0) {
    return `You'll get: $${laborAfterFee.toFixed(2)} ($${calc.laborValue.toFixed(2)} − $${calc.workerFee.toFixed(2)} fee) + approved expenses at cost`
  }
  return `You'll get: $${laborAfterFee.toFixed(2)} ($${calc.laborValue.toFixed(2)} − $${calc.workerFee.toFixed(2)} fee)`
}

/**
 * Format fee display for buyers
 * Shows "You'll pay: $X (labor + fee) + expenses"
 */
export function formatBuyerPay(calc: FeeCalculation, includeExpenses: boolean = true): string {
  const laborWithFee = calc.laborValue + calc.buyerFee
  if (includeExpenses && calc.expensesTotal > 0) {
    return `You'll pay: $${laborWithFee.toFixed(2)} ($${calc.laborValue.toFixed(2)} labor + $${calc.buyerFee.toFixed(2)} fee) + approved expenses at cost`
  }
  return `You'll pay: $${laborWithFee.toFixed(2)} ($${calc.laborValue.toFixed(2)} labor + $${calc.buyerFee.toFixed(2)} fee)`
}

/**
 * Calculate fees for hourly jobs
 * Shows estimate for max hours
 */
export function calculateHourlyFees(
  hourlyRate: number,
  hours: number,
  expensesTotal: number = 0,
  settings?: FeeSettings
): FeeCalculation {
  const laborValue = hourlyRate * hours
  return calculateFees(laborValue, expensesTotal, settings)
}

/**
 * Format hourly pay display for workers
 */
export function formatHourlyWorkerPay(
  hourlyRate: number,
  maxHours: number,
  settings: FeeSettings
): string {
  const calc = calculateHourlyFees(hourlyRate, maxHours, 0, settings)
  const laborAfterFee = calc.laborValue - calc.workerFee
  return `$${hourlyRate.toFixed(2)}/hr × ${maxHours} hrs = $${calc.laborValue.toFixed(2)} labor → you'll get up to $${laborAfterFee.toFixed(2)}`
}
