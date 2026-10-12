import { PaymentProvider } from './types'
import { MockPaymentProvider } from './mock-provider'
import { config } from '../config'

export * from './types'

export function getPaymentProvider(): PaymentProvider {
  if (config.stripe.enabled) {
    console.log('Stripe is configured but not implemented yet, falling back to mock provider')
  }
  
  return new MockPaymentProvider()
}
