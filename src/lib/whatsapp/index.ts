import { WhatsAppProvider } from './types'
import { MetaProvider } from './meta-provider'
import { MockProvider } from './mock-provider'

export function createWhatsAppProvider(): WhatsAppProvider {
  if (process.env.WHATSAPP_PROVIDER === 'mock') {
    return new MockProvider()
  }
  return new MetaProvider()
}

export type { WhatsAppProvider } from './types'
export { MetaProvider } from './meta-provider'
export { MockProvider } from './mock-provider'
