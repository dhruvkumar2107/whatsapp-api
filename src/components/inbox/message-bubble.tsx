'use client'

import {
  Check,
  CheckCheck,
  Clock,
  XCircle,
  FileText,
  Image as ImageIcon,
  Film,
  Music,
} from 'lucide-react'
import { cn, formatRelativeTime } from '@/lib/utils'

interface Message {
  id: string
  type: string
  direction: 'INBOUND' | 'OUTBOUND'
  status: string
  content: unknown
  createdAt: string
  sentAt: string | null
  deliveredAt: string | null
  readAt: string | null
  errorMessage: string | null
}

interface MessageBubbleProps {
  message: Message
}

function getContentText(content: unknown): string {
  if (typeof content === 'string') return content
  if (typeof content === 'object' && content !== null) {
    const c = content as Record<string, unknown>
    if (typeof c.text === 'string') return c.text
    if (typeof c.name === 'string') return c.name
    if (typeof c.caption === 'string') return c.caption
    if (typeof c.body === 'string') return c.body
  }
  return ''
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'QUEUED':
    case 'SENDING':
      return <Clock className="size-3.5" />
    case 'SENT':
      return <Check className="size-3.5" />
    case 'DELIVERED':
      return <CheckCheck className="size-3.5" />
    case 'READ':
      return <CheckCheck className="size-3.5 text-blue-300" />
    case 'FAILED':
      return <XCircle className="size-3.5 text-red-300" />
    default:
      return null
  }
}

function MediaIndicator({ type }: { type: string }) {
  const iconMap: Record<string, typeof ImageIcon> = {
    IMAGE: ImageIcon,
    VIDEO: Film,
    AUDIO: Music,
    DOCUMENT: FileText,
  }
  const Icon = iconMap[type] || FileText
  const label = type.charAt(0) + type.slice(1).toLowerCase()

  return (
    <div className="mb-1 flex items-center gap-1.5 text-xs opacity-70">
      <Icon className="size-3.5" />
      <span>{label}</span>
    </div>
  )
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isOutbound = message.direction === 'OUTBOUND'
  const text = getContentText(message.content)
  const hasMedia = ['IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT'].includes(message.type)
  const isTemplate = message.type === 'TEMPLATE'

  return (
    <div className={cn('flex px-4', isOutbound ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[75%] rounded-2xl px-4 py-2.5',
          isOutbound
            ? 'bg-emerald-600 text-white'
            : 'bg-muted text-foreground'
        )}
      >
        {hasMedia && <MediaIndicator type={message.type} />}
        {isTemplate && (
          <div className="mb-1 flex items-center gap-1.5 text-xs opacity-70">
            <FileText className="size-3.5" />
            <span>Template</span>
          </div>
        )}
        {text && (
          <p className="text-sm whitespace-pre-wrap break-words">{text}</p>
        )}
        <div
          className={cn(
            'mt-1 flex items-center justify-end gap-1',
            isOutbound ? 'text-white/70' : 'text-muted-foreground'
          )}
        >
          <span className="text-[10px]">
            {formatRelativeTime(message.sentAt || message.createdAt)}
          </span>
          {isOutbound && <StatusIcon status={message.status} />}
        </div>
        {message.errorMessage && (
          <p className="mt-1 text-[10px] text-red-200">{message.errorMessage}</p>
        )}
      </div>
    </div>
  )
}
