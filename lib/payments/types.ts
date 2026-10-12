export interface PaymentProvider {
  name: string
  hold(amount: number, buyerId: string): Promise<PaymentHold>
  release(holdId: string, amount: number): Promise<void>
  refund(holdId: string, amount: number): Promise<void>
  payout(workerId: string, amount: number): Promise<void>
  setupWorkerAccount(workerId: string): Promise<string>
}

export interface PaymentHold {
  id: string
  amount: number
  status: 'held' | 'released' | 'refunded'
}
