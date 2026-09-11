export interface WhatsAppProvider {
  connect(params: ConnectParams): Promise<ConnectResult>
  disconnect(accountId: string): Promise<void>
  sendMessage(params: SendMessageParams): Promise<SendMessageResult>
  sendTemplate(params: SendTemplateParams): Promise<SendMessageResult>
  sendMedia(params: SendMediaParams): Promise<SendMessageResult>
  getTemplates(wabaId: string): Promise<TemplateResult[]>
  createTemplate(params: CreateTemplateParams): Promise<CreateTemplateResult>
  getAccountStatus(phoneNumberId: string): Promise<AccountStatus>
  registerWebhook(params: WebhookParams): Promise<void>
  processWebhook(body: unknown, headers: Record<string, string>): Promise<WebhookEvent>
}

export interface ConnectParams {
  workspaceId: string
  code?: string
  redirectUri?: string
}

export interface ConnectResult {
  url?: string
  accountId: string
  status: 'CONNECTED' | 'CONNECTING' | 'NEEDS_VERIFICATION'
}

export interface SendMessageParams {
  phoneNumberId: string
  to: string
  text: string
  previewUrl?: boolean
}

export interface SendMessageResult {
  messagingProduct: string
  whatsappMessageId: string
  status: string
  timestamp: string
}

export interface SendTemplateParams {
  phoneNumberId: string
  to: string
  templateName: string
  language: string
  components?: TemplateComponentParam[]
}

export interface TemplateComponentParam {
  type: 'header' | 'body' | 'button'
  sub_type?: 'url' | 'quick_reply'
  index?: number
  parameters?: TemplateParameterParam[]
}

export interface TemplateParameterParam {
  type: 'text' | 'image' | 'video' | 'document'
  text?: string
  image?: { link: string }
  video?: { link: string }
  document?: { link: string; filename?: string }
}

export interface SendMediaParams {
  phoneNumberId: string
  to: string
  mediaType: 'image' | 'video' | 'audio' | 'document'
  mediaUrl: string
  caption?: string
  filename?: string
}

export interface TemplateResult {
  id: string
  name: string
  language: string
  status: 'APPROVED' | 'PENDING' | 'REJECTED' | 'DISABLED'
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION'
  components: TemplateComponentResult[]
  createdAt: string
  updatedAt: string
}

export interface TemplateComponentResult {
  type: string
  text?: string
  format?: string
  example?: unknown
}

export interface CreateTemplateParams {
  wabaId: string
  name: string
  language: string
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION'
  components: CreateTemplateComponentParam[]
}

export interface CreateTemplateComponentParam {
  type: 'HEADER' | 'BODY' | 'BUTTON' | 'FOOTER'
  text?: string
  parameters?: Array<{
    type: string
    example?: string
  }>
}

export interface CreateTemplateResult {
  id: string
  status: string
  name: string
}

export interface AccountStatus {
  phoneNumberId: string
  phoneNumber: string
  businessName: string
  verifiedName: string
  qualityRating: string
  messagingLimit: number
  status: 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING' | 'NEEDS_VERIFICATION' | 'ERROR'
  displayPhoneNumber: string
  throughputLevel: string
}

export interface WebhookParams {
  callbackUrl: string
  verifyToken: string
  object?: string
  fields?: string[]
}

export interface WebhookEvent {
  type: 'message' | 'status' | 'template_status' | 'verification'
  payload: unknown
  timestamp: string
  phoneNumberId?: string
}

export interface MetaGraphError {
  message: string
  type: string
  code: number
  error_subcode?: number
  fbtrace_id?: string
}

export interface MetaApiResponse<T> {
  data?: T
  error?: MetaGraphError
}
