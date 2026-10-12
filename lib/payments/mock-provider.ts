import { PaymentProvider, PaymentHold } from './types'

export class MockPaymentProvider implements PaymentProvider {
  name = 'Mock Provider (Dev Mode)'
  private holds = new Map<string, PaymentHold>()

  async hold(amount: number, buyerId: string): Promise<PaymentHold> {
    const hold: PaymentHold = {
      id: `mock_hold_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      amount,
      status: 'held',
    }
    this.holds.set(hold.id, hold)
    console.log(`[Mock] Held $${amount.toFixed(2)} from buyer ${buyerId}`)
    return hold
  }

  async release(holdId: string, amount: number): Promise<void> {
    const hold = this.holds.get(holdId)
    if (hold) {
      hold.status = 'released'
      console.log(`[Mock] Released $${amount.toFixed(2)} from hold ${holdId}`)
    }
  }

  async refund(holdId: string, amount: number): Promise<void> {
    const hold = this.holds.get(holdId)
    if (hold) {
      hold.status = 'refunded'
      console.log(`[Mock] Refunded $${amount.toFixed(2)} from hold ${holdId}`)
    }
  }

  async payout(workerId: string, amount: number): Promise<void> {
    console.log(`[Mock] Paid out $${amount.toFixed(2)} to worker ${workerId}`)
  }

  async setupWorkerAccount(workerId: string): Promise<string> {
    const accountId = `mock_acct_${workerId}_${Date.now()}`
    console.log(`[Mock] Set up worker account ${accountId} for ${workerId}`)
    return accountId
  }
}
