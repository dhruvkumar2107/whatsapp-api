import { WhatsAppProvider } from './types'
import { MetaProvider } from './meta-provider'
import { MockProvider } from './mock-provider'

if (process.env.WHATSAPP_PROVIDER === 'mock' && process.env.NODE_ENV === 'production') {
  console.error('[WHATSAPP] WARNING: Mock provider is enabled in production!')
}

export function createWhatsAppProvider(): WhatsAppProvider {
  if (process.env.WHATSAPP_PROVIDER === 'mock') {
    return new MockProvider()
  }
  return new MetaProvider()
}

export type { WhatsAppProvider } from './types'
export { MetaProvider } from './meta-provider'
export { MockProvider } from './mock-provider'
