export const config = {
  app: {
    name: process.env.APP_NAME || 'HelpWithThat',
    url: process.env.APP_URL || 'http://localhost:43891',
  },
  fees: {
    rate: parseFloat(process.env.FEE_RATE || '0.20'),
    splitBuyer: parseFloat(process.env.FEE_SPLIT_BUYER || '0.80'),
    splitWorker: parseFloat(process.env.FEE_SPLIT_WORKER || '0.20'),
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    enabled: !!process.env.STRIPE_SECRET_KEY,
  },
  auth: {
    secret: process.env.NEXTAUTH_SECRET || 'change-this-in-production',
    url: process.env.NEXTAUTH_URL || 'http://localhost:43891',
  },
} as const
