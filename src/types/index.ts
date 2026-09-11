import { DefaultSession } from 'next-auth'
import { Role } from '@/lib/constants'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      workspaceId: string
      role: Role
    } & DefaultSession['user']
  }

  interface User {
    workspaceId?: string
    role?: Role
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    id: string
    workspaceId: string
    role: Role
  }
}

export interface SessionUser {
  id: string
  name?: string | null
  email?: string | null
  image?: string | null
  workspaceId: string
  role: Role
}

export interface WorkspaceSession {
  id: string
  name: string
  slug: string
  plan: string
  status: string
}

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: {
    message: string
    code: string
    errors?: Record<string, string[]>
  }
}

export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  pagination: PaginationMeta
}

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export interface PaginationParams {
  page: number
  limit: number
  search: string
  sortBy: string
  sortOrder: 'asc' | 'desc'
  filters: Record<string, string>
}

export interface DashboardStats {
  totalContacts: number
  contactsGrowth: number
  totalMessages: number
  messagesSentToday: number
  messagesDelivered: number
  messagesRead: number
  messagesFailed: number
  activeCampaigns: number
  completedCampaigns: number
  deliveryRate: number
  readRate: number
  responseRate: number
  recentActivity: ActivityItem[]
}

export interface ActivityItem {
  id: string
  type: string
  message: string
  timestamp: string
  metadata?: Record<string, unknown>
}

export interface WebSocketEvent {
  type: 'message' | 'contact' | 'campaign' | 'typing' | 'status' | 'error'
  payload: unknown
  workspaceId: string
  timestamp: string
}

export interface MessageEvent extends WebSocketEvent {
  type: 'message'
  payload: {
    id: string
    conversationId: string
    direction: 'inbound' | 'outbound'
    content: string
    type: string
    status: string
    contactId: string
    contactName: string
  }
}

export interface ContactEvent extends WebSocketEvent {
  type: 'contact'
  payload: {
    id: string
    action: 'created' | 'updated' | 'deleted'
    name: string
  }
}

export interface CampaignEvent extends WebSocketEvent {
  type: 'campaign'
  payload: {
    id: string
    name: string
    status: string
    progress?: number
  }
}

export interface TypingEvent extends WebSocketEvent {
  type: 'typing'
  payload: {
    conversationId: string
    contactId: string
    isTyping: boolean
  }
}

export interface StatusEvent extends WebSocketEvent {
  type: 'status'
  payload: {
    messageId: string
    status: string
    timestamp: string
  }
}

export interface Contact {
  id: string
  name: string
  phone: string
  email?: string | null
  tags: string[]
  customFields: Record<string, unknown>
  notes?: string | null
  lastActivityAt?: string | null
  createdAt: string
  updatedAt: string
}

export interface Message {
  id: string
  conversationId: string
  contactId: string
  direction: 'inbound' | 'outbound'
  type: string
  content: string
  mediaUrl?: string | null
  status: string
  templateId?: string | null
  errorMessage?: string | null
  metadata?: Record<string, unknown>
  createdAt: string
}

export interface Conversation {
  id: string
  contactId: string
  contact: Contact
  lastMessage?: Message | null
  unreadCount: number
  status: string
  assignedTo?: string | null
  createdAt: string
  updatedAt: string
}

export interface Campaign {
  id: string
  name: string
  description?: string | null
  templateId: string
  status: string
  totalContacts: number
  sentCount: number
  deliveredCount: number
  failedCount: number
  scheduledAt?: string | null
  startedAt?: string | null
  completedAt?: string | null
  createdAt: string
}

export interface Template {
  id: string
  name: string
  language: string
  category: string
  status: string
  components: TemplateComponent[]
  createdAt: string
  updatedAt: string
}

export interface TemplateComponent {
  type: string
  text?: string
  parameters?: TemplateParameter[]
}

export interface TemplateParameter {
  type: string
  text?: string
}

export interface Webhook {
  id: string
  name: string
  url: string
  events: string[]
  secret?: string | null
  isActive: boolean
  lastTriggeredAt?: string | null
  createdAt: string
}

export interface ApiKey {
  id: string
  name: string
  key?: string
  permissions: string[]
  expiresAt?: string | null
  lastUsedAt?: string | null
  revokedAt?: string | null
  createdAt: string
}
