import crypto from 'crypto'
import { encrypt, decrypt } from '@/lib/encryption'
import { cacheSet } from '@/lib/redis'
import prisma from '@/lib/prisma'
import {
  WhatsAppProvider,
  ConnectParams,
  ConnectResult,
  SendMessageParams,
  SendMessageResult,
  SendTemplateParams,
  SendMediaParams,
  SendInteractiveParams,
  TemplateResult,
  CreateTemplateParams,
  CreateTemplateResult,
  AccountStatus,
  WebhookParams,
  WebhookEvent,
  MetaApiResponse,
} from './types'

const GRAPH_API_VERSION = 'v18.0'
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`

export class MetaProvider implements WhatsAppProvider {
  private getAccessToken(): string {
    const token = process.env.META_ACCESS_TOKEN
    if (!token) {
      throw new Error('META_ACCESS_TOKEN environment variable is not set')
    }
    return token
  }

  private getAppId(): string {
    const appId = process.env.META_APP_ID
    if (!appId) {
      throw new Error('META_APP_ID environment variable is not set')
    }
    return appId
  }

  private getAppSecret(): string {
    const secret = process.env.META_APP_SECRET
    if (!secret) {
      throw new Error('META_APP_SECRET environment variable is not set')
    }
    return secret
  }

  private getWebhookSecret(): string | null {
    return process.env.META_WEBHOOK_SECRET || null
  }

  private async graphApiRequest<T>(
    path: string,
    options: {
      method?: 'GET' | 'POST' | 'DELETE' | 'PUT'
      accessToken?: string
      body?: Record<string, unknown>
      params?: Record<string, string>
    } = {}
  ): Promise<MetaApiResponse<T>> {
    const { method = 'GET', accessToken, body, params } = options
    const token = accessToken || this.getAccessToken()

    let url = `${GRAPH_API_BASE}/${path}`
    if (params) {
      const searchParams = new URLSearchParams(params)
      searchParams.append('access_token', token)
      url += `?${searchParams.toString()}`
    } else {
      url += `?access_token=${token}`
    }

    const fetchOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    }

    if (body && (method === 'POST' || method === 'PUT')) {
      fetchOptions.body = JSON.stringify(body)
    }

    const response = await fetch(url, fetchOptions)
    const data = await response.json()

    if (!response.ok) {
      return {
        error: {
          message: data?.error?.message || `HTTP ${response.status}`,
          type: 'OAuthException',
          code: response.status,
          error_subcode: data?.error?.error_subcode,
          fbtrace_id: data?.error?.fbtrace_id,
        },
      }
    }

    return { data: data as T }
  }

  private parseGraphError(error: { message: string; code: number } | undefined): Error {
    if (!error) {
      return new Error('Meta Graph API Error: Unknown error')
    }

    const messageMap: Record<number, string> = {
      190: 'Invalid or expired access token',
      200: 'Permissions error - check app permissions',
      368: 'Rate limit exceeded - slow down requests',
      100: 'Invalid parameter provided',
      32: 'Page access token required',
      195: 'Account not connected to WhatsApp Business',
      299: 'Access token mismatch for the given resource',
    }

    const friendlyMessage = messageMap[error.code] || error.message
    return new Error(`Meta Graph API Error (${error.code}): ${friendlyMessage}`)
  }

  async connect(params: ConnectParams): Promise<ConnectResult> {
    if (params.code) {
      const tokenResult = await this.exchangeCodeForToken(params.code, params.redirectUri)
      if ('error' in tokenResult) {
        throw this.parseGraphError(tokenResult.error)
      }

      const longLivedToken = await this.getLongLivedToken(tokenResult.data!.access_token)
      if ('error' in longLivedToken) {
        throw this.parseGraphError(longLivedToken.error)
      }

      const businessInfo = await this.fetchBusinessInfo(longLivedToken.data!.access_token)
      if ('error' in businessInfo) {
        throw this.parseGraphError(businessInfo.error)
      }

      const waba = businessInfo.data!.data?.[0]
      if (!waba) {
        throw new Error('No WhatsApp Business Account found for this user')
      }

      const phoneInfo = await this.getPhoneNumbers(
        waba.id,
        longLivedToken.data!.access_token
      )
      if ('error' in phoneInfo) {
        throw this.parseGraphError(phoneInfo.error)
      }

      const phone = phoneInfo.data?.data?.[0]
      if (!phone) {
        throw new Error('No phone number found on this WhatsApp Business Account')
      }

      const account = await prisma.whatsAppAccount.create({
        data: {
          workspaceId: params.workspaceId,
          businessName: waba.name || 'WhatsApp Business',
          wabaId: waba.id,
          phoneNumberId: phone.id,
          phoneNumber: phone.display_phone_number,
          accessToken: encrypt(longLivedToken.data!.access_token),
          appId: this.getAppId(),
          status: 'CONNECTED',
          qualityRating: phone.quality_rating || null,
          messagingLimit: phone.messaging_limit || null,
          connectedAt: new Date(),
        },
      })

      return {
        accountId: account.id,
        status: 'CONNECTED',
      }
    }

    const baseUrl = params.redirectUri || `${process.env.NEXT_PUBLIC_APP_URL}/api/whatsapp/callback`
    const state = crypto.randomBytes(16).toString('hex')

    // Store state for CSRF verification (valid for 10 minutes)
    await cacheSet(`whatsapp_oauth_state:${state}`, params.workspaceId, 600)

    const scopes = [
      'whatsapp_business_management',
      'whatsapp_business_messaging',
      'business_management',
    ].join(',')

    const url = new URL('https://www.facebook.com/v18.0/dialog/oauth')
    url.searchParams.set('client_id', this.getAppId())
    url.searchParams.set('redirect_uri', baseUrl)
    url.searchParams.set('state', state)
    url.searchParams.set('scope', scopes)
    url.searchParams.set('response_type', 'code')
    url.searchParams.set('display', 'popup')

    return {
      url: url.toString(),
      accountId: '',
      status: 'CONNECTING',
    }
  }

  async disconnect(accountId: string): Promise<void> {
    await prisma.whatsAppAccount.update({
      where: { id: accountId },
      data: {
        status: 'DISCONNECTED',
        disconnectedAt: new Date(),
      },
    })
  }

  async sendMessage(params: SendMessageParams): Promise<SendMessageResult> {
    const account = await prisma.whatsAppAccount.findFirst({
      where: { phoneNumberId: params.phoneNumberId },
    })

    if (!account) {
      throw new Error('WhatsApp account not found')
    }

    if (account.status !== 'CONNECTED') {
      throw new Error('WhatsApp account is not connected')
    }

    const decryptedToken = decrypt(account.accessToken)

    const result = await this.graphApiRequest<{ messages: Array<{ id: string; wa_id: string }> }>(
      `${params.phoneNumberId}/messages`,
      {
        method: 'POST',
        accessToken: decryptedToken,
        body: {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: params.to,
          type: 'text',
          text: {
            preview_url: params.previewUrl || false,
            body: params.text,
          },
        },
      }
    )

    if ('error' in result) {
      throw this.parseGraphError(result.error)
    }

    const message = result.data!.messages[0]

    return {
      messagingProduct: 'whatsapp',
      whatsappMessageId: message.id,
      status: 'SENT',
      timestamp: Math.floor(Date.now() / 1000).toString(),
    }
  }

  async sendTemplate(params: SendTemplateParams): Promise<SendMessageResult> {
    const account = await prisma.whatsAppAccount.findFirst({
      where: { phoneNumberId: params.phoneNumberId },
    })

    if (!account) {
      throw new Error('WhatsApp account not found')
    }

    if (account.status !== 'CONNECTED') {
      throw new Error('WhatsApp account is not connected')
    }

    const decryptedToken = decrypt(account.accessToken)

    const templatePayload: Record<string, unknown> = {
      name: params.templateName,
      language: {
        code: params.language,
      },
    }

    if (params.components && params.components.length > 0) {
      templatePayload.components = params.components.map((comp) => {
        const component: Record<string, unknown> = { type: comp.type }
        if (comp.sub_type) component.sub_type = comp.sub_type
        if (comp.index !== undefined) component.index = comp.index
        if (comp.parameters) {
          component.parameters = comp.parameters.map((param) => {
            const p: Record<string, unknown> = { type: param.type }
            if (param.text) p.text = param.text
            if (param.image) p.image = param.image
            if (param.video) p.video = param.video
            if (param.document) p.document = param.document
            return p
          })
        }
        return component
      })
    }

    const result = await this.graphApiRequest<{ messages: Array<{ id: string; wa_id: string }> }>(
      `${params.phoneNumberId}/messages`,
      {
        method: 'POST',
        accessToken: decryptedToken,
        body: {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: params.to,
          type: 'template',
          template: templatePayload,
        },
      }
    )

    if ('error' in result) {
      throw this.parseGraphError(result.error)
    }

    const message = result.data!.messages[0]

    return {
      messagingProduct: 'whatsapp',
      whatsappMessageId: message.id,
      status: 'SENT',
      timestamp: Math.floor(Date.now() / 1000).toString(),
    }
  }

  async sendMedia(params: SendMediaParams): Promise<SendMessageResult> {
    const account = await prisma.whatsAppAccount.findFirst({
      where: { phoneNumberId: params.phoneNumberId },
    })

    if (!account) {
      throw new Error('WhatsApp account not found')
    }

    if (account.status !== 'CONNECTED') {
      throw new Error('WhatsApp account is not connected')
    }

    const decryptedToken = decrypt(account.accessToken)

    const mediaObject: Record<string, unknown> = { link: params.mediaUrl }
    if (params.caption) mediaObject.caption = params.caption
    if (params.filename) mediaObject.filename = params.filename

    const result = await this.graphApiRequest<{ messages: Array<{ id: string; wa_id: string }> }>(
      `${params.phoneNumberId}/messages`,
      {
        method: 'POST',
        accessToken: decryptedToken,
        body: {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: params.to,
          type: params.mediaType,
          [params.mediaType]: mediaObject,
        },
      }
    )

    if ('error' in result) {
      throw this.parseGraphError(result.error)
    }

    const message = result.data!.messages[0]

    return {
      messagingProduct: 'whatsapp',
      whatsappMessageId: message.id,
      status: 'SENT',
      timestamp: Math.floor(Date.now() / 1000).toString(),
    }
  }

  async sendInteractive(params: SendInteractiveParams): Promise<SendMessageResult> {
    const account = await prisma.whatsAppAccount.findFirst({
      where: { phoneNumberId: params.phoneNumberId },
    })

    if (!account) {
      throw new Error('WhatsApp account not found')
    }

    if (account.status !== 'CONNECTED') {
      throw new Error('WhatsApp account is not connected')
    }

    const decryptedToken = decrypt(account.accessToken)

    const result = await this.graphApiRequest<{ messages: Array<{ id: string; wa_id: string }> }>(
      `${params.phoneNumberId}/messages`,
      {
        method: 'POST',
        accessToken: decryptedToken,
        body: {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: params.to,
          type: 'interactive',
          interactive: params.interactive,
        },
      }
    )

    if ('error' in result) {
      throw this.parseGraphError(result.error)
    }

    const message = result.data!.messages[0]

    return {
      messagingProduct: 'whatsapp',
      whatsappMessageId: message.id,
      status: 'SENT',
      timestamp: Math.floor(Date.now() / 1000).toString(),
    }
  }

  async getTemplates(wabaId: string): Promise<TemplateResult[]> {
    const result = await this.graphApiRequest<{
      data: Array<{
        id: string
        name: string
        language: string
        status: string
        category: string
        components: Array<{
          type: string
          text?: string
          format?: string
          example?: unknown
        }>
        created_at: string
        updated_at: string
      }>
    }>(`${wabaId}/message_templates`, {
      params: { fields: 'id,name,language,status,category,components,created_at,updated_at' },
    })

    if ('error' in result) {
      throw this.parseGraphError(result.error)
    }

    return (result.data?.data || []).map((tpl) => ({
      id: tpl.id,
      name: tpl.name,
      language: tpl.language,
      status: tpl.status.toUpperCase() as TemplateResult['status'],
      category: tpl.category.toUpperCase() as TemplateResult['category'],
      components: tpl.components || [],
      createdAt: tpl.created_at,
      updatedAt: tpl.updated_at,
    }))
  }

  async createTemplate(params: CreateTemplateParams): Promise<CreateTemplateResult> {
    const components = params.components.map((comp) => ({
      type: comp.type,
      ...(comp.text ? { text: comp.text } : {}),
      ...(comp.parameters ? { parameters: comp.parameters } : {}),
    }))

    const result = await this.graphApiRequest<{ id: string; status: string }>(
      `${params.wabaId}/message_templates`,
      {
        method: 'POST',
        body: {
          name: params.name,
          language: params.language,
          category: params.category,
          components,
        },
      }
    )

    if ('error' in result) {
      throw this.parseGraphError(result.error)
    }

    return {
      id: result.data!.id,
      status: result.data!.status || 'PENDING',
      name: params.name,
    }
  }

  async getAccountStatus(phoneNumberId: string): Promise<AccountStatus> {
    const account = await prisma.whatsAppAccount.findFirst({
      where: { phoneNumberId },
    })

    if (!account) {
      throw new Error('WhatsApp account not found')
    }

    const decryptedToken = decrypt(account.accessToken)

    const result = await this.graphApiRequest<{
      verified_name: string
      quality_rating: string
      messaging_limit: number
      status: string
      display_phone_number: string
      throughput: { level: string }
    }>(phoneNumberId, {
      params: {
        fields: 'verified_name,quality_rating,messaging_limit,status,display_phone_number,throughput',
      },
      accessToken: decryptedToken,
    })

    if ('error' in result) {
      return {
        phoneNumberId,
        phoneNumber: account.phoneNumber,
        businessName: account.businessName,
        verifiedName: account.businessName,
        qualityRating: account.qualityRating || 'UNKNOWN',
        messagingLimit: account.messagingLimit || 0,
        status: account.status,
        displayPhoneNumber: account.phoneNumber,
        throughputLevel: 'STANDARD',
      }
    }

    const data = result.data!
    const statusMap: Record<string, AccountStatus['status']> = {
      CONNECTED: 'CONNECTED',
      CONNECTING: 'CONNECTING',
      UNVERIFIED: 'NEEDS_VERIFICATION',
    }

    return {
      phoneNumberId,
      phoneNumber: data.display_phone_number || account.phoneNumber,
      businessName: account.businessName,
      verifiedName: data.verified_name || account.businessName,
      qualityRating: data.quality_rating || 'UNKNOWN',
      messagingLimit: data.messaging_limit || 0,
      status: statusMap[data.status] || account.status,
      displayPhoneNumber: data.display_phone_number || account.phoneNumber,
      throughputLevel: data.throughput?.level || 'STANDARD',
    }
  }

  async registerWebhook(params: WebhookParams): Promise<void> {
    const object = params.object || 'whatsapp_business_account'
    const fields = params.fields || ['messages', 'message_template_status_update']

    const result = await this.graphApiRequest<{ success: boolean }>(
      `${this.getAppId()}/subscriptions`,
      {
        method: 'POST',
        body: {
          object,
          callback_url: params.callbackUrl,
          verify_token: params.verifyToken,
          fields: fields.join(','),
          included_values: ['messages', 'message_template_status_update'],
        },
      }
    )

    if ('error' in result) {
      throw this.parseGraphError(result.error)
    }
  }

  async processWebhook(
    body: unknown,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _headers: Record<string, string>
  ): Promise<WebhookEvent> {
    const payload = body as {
      object?: string
      entry?: Array<{
        id: string
        changes?: Array<{
          value: {
            messaging_product: string
            metadata?: {
              display_phone_number: string
              phone_number_id: string
            }
            messages?: Array<{
              from: string
              id: string
              timestamp: string
              type: string
              text?: { body: string }
              image?: { id: string; mime_type: string }
              video?: { id: string; mime_type: string }
              audio?: { id: string; mime_type: string }
              document?: { id: string; mime_type: string; filename: string }
              interactive?: { type: string; button?: { id: string; title: string }; list_reply?: { id: string; title: string; description: string } }
              contacts?: Array<{ name: { formatted_name: string } }>
            }>
            statuses?: Array<{
              id: string
              status: string
              timestamp: string
              recipient_id: string
              errors?: Array<{ code: number; title: string; message: string; error_data?: { details: string } }>
            }>
            message_template_status_update?: {
              event: string
              message_template_id: string
              template_name: string
              template_language: string
              status: string
            }
          }
          field: string
        }>
      }>
    }

    if (!payload.entry || payload.entry.length === 0) {
      return {
        type: 'verification',
        payload,
        timestamp: new Date().toISOString(),
      }
    }

    const entry = payload.entry[0]
    const change = entry.changes?.[0]

    if (!change) {
      return {
        type: 'verification',
        payload,
        timestamp: new Date().toISOString(),
      }
    }

    const value = change.value
    const phoneNumberId = value.metadata?.phone_number_id

    if (value.messages && value.messages.length > 0) {
      return {
        type: 'message',
        payload: {
          messages: value.messages,
          metadata: value.metadata,
        },
        timestamp: new Date().toISOString(),
        phoneNumberId,
      }
    }

    if (value.statuses && value.statuses.length > 0) {
      return {
        type: 'status',
        payload: {
          statuses: value.statuses,
          metadata: value.metadata,
        },
        timestamp: new Date().toISOString(),
        phoneNumberId,
      }
    }

    if (value.message_template_status_update) {
      return {
        type: 'template_status',
        payload: {
          template_update: value.message_template_status_update,
        },
        timestamp: new Date().toISOString(),
        phoneNumberId,
      }
    }

    return {
      type: 'verification',
      payload,
      timestamp: new Date().toISOString(),
    }
  }

  private async exchangeCodeForToken(
    code: string,
    redirectUri?: string
  ): Promise<MetaApiResponse<{ access_token: string; token_type: string; expires_in: number }>> {
    return this.graphApiRequest('oauth/access_token', {
      params: {
        client_id: this.getAppId(),
        client_secret: this.getAppSecret(),
        code,
        redirect_uri: redirectUri || `${process.env.NEXT_PUBLIC_APP_URL}/api/whatsapp/callback`,
      },
    })
  }

  private async getLongLivedToken(
    shortLivedToken: string
  ): Promise<MetaApiResponse<{ access_token: string; token_type: string; expires_in: number }>> {
    return this.graphApiRequest('oauth/access_token', {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: this.getAppId(),
        client_secret: this.getAppSecret(),
        fb_exchange_token: shortLivedToken,
      },
    })
  }

  private async fetchBusinessInfo(
    accessToken: string
  ): Promise<
    MetaApiResponse<{
      data: Array<{ id: string; name: string; name_localized?: Record<string, string> }>
    }>
  > {
    return this.graphApiRequest('me/whatsapp_business_accounts', {
      params: {
        fields: 'id,name,name_localized',
        access_token: accessToken,
      },
      accessToken,
    })
  }

  private async getPhoneNumbers(
    wabaId: string,
    accessToken: string
  ): Promise<
    MetaApiResponse<{
      data: Array<{
        id: string
        display_phone_number: string
        quality_rating: string
        messaging_limit: number
        status: string
        throughput: { level: string }
      }>
    }>
  > {
    return this.graphApiRequest(`${wabaId}/phone_numbers`, {
      params: {
        fields: 'id,display_phone_number,quality_rating,messaging_limit,status,throughput',
        access_token: accessToken,
      },
      accessToken,
    })
  }

  verifyWebhookSignature(
    body: string,
    signature: string | null,
    secret: string
  ): boolean {
    if (!signature) return false

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex')

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )
  }
}
