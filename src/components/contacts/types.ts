export interface ContactTag {
  id: string
  name: string
  color?: string | null
}

export interface ContactListItem {
  id: string
  name: string | null
  phone: string
  email: string | null
  country: string | null
  source: string | null
  optIn: boolean
  lastMessageAt: string | null
  createdAt: string
  updatedAt?: string | null
  tags: ContactTag[]
}

export interface CustomField {
  id: string
  fieldName: string
  fieldValue: string
}

export interface NoteItem {
  id: string
  content: string
  createdAt: string
  user?: {
    id: string
    name?: string | null
    email?: string | null
  } | null
}

export interface ConversationSummary {
  id: string
  status: string
  lastMessagePreview?: string | null
  lastMessageAt?: string | null
  unreadCount?: number
  createdAt: string
  whatsappAccount?: {
    id: string
    phoneNumber: string
    businessName: string
  } | null
}

export interface ContactDetail extends ContactListItem {
  customFields: CustomField[]
  notes: NoteItem[]
  conversations: ConversationSummary[]
  conversationCount: number
  noteCount: number
}

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export interface ContactListResponse {
  success: boolean
  data: ContactListItem[]
  pagination?: PaginationMeta
  error?: { message?: string; code?: string }
}

export function getInitials(name: string | null | undefined): string {
  if (!name || !name.trim()) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

export function isValidE164(phone: string): boolean {
  return /^\+[1-9]\d{1,14}$/.test(phone)
}