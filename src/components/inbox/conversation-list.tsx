'use client'

import { Search, MessageSquare } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn, formatRelativeTime, formatPhoneNumber } from '@/lib/utils'

interface ConversationContact {
  id: string
  name: string | null
  phone: string
  email: string | null
}

interface ConversationAgent {
  id: string
  name: string | null
  email: string | null
  image: string | null
}

export interface ConversationListItem {
  id: string
  status: string
  lastMessageAt: string | null
  lastMessagePreview: string | null
  unreadCount: number
  assignedAgentId: string | null
  contact: ConversationContact
  assignedAgent: ConversationAgent | null
}

interface ConversationListProps {
  conversations: ConversationListItem[]
  selectedId: string | null
  search: string
  onSearchChange: (value: string) => void
  filter: string
  onFilterChange: (value: string) => void
  onSelect: (id: string) => void
  loading: boolean
}

function getInitials(name: string | null, phone: string): string {
  if (name) {
    return name
      .split(' ')
      .map((p) => p.charAt(0))
      .slice(0, 2)
      .join('')
      .toUpperCase()
  }
  return phone.replace(/\D/g, '').slice(-2)
}

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'unassigned', label: 'Unassigned' },
  { value: 'mine', label: 'Mine' },
]

export function ConversationList({
  conversations,
  selectedId,
  search,
  onSearchChange,
  filter,
  onFilterChange,
  onSelect,
  loading,
}: ConversationListProps) {
  return (
    <div className="flex h-full w-full flex-col border-r bg-background">
      <div className="space-y-3 border-b p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => onFilterChange(f.value)}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                filter === f.value
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                  : 'text-muted-foreground hover:bg-muted'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <ScrollArea className="flex-1">
        {loading && conversations.length === 0 ? (
          <div className="space-y-3 p-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg p-3">
                <div className="size-10 animate-pulse rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-24 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-32 animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-muted">
              <MessageSquare className="size-6 text-muted-foreground" />
            </div>
            <p className="mt-3 text-sm font-medium">No conversations</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {search ? 'No results match your search.' : 'Conversations will appear here.'}
            </p>
          </div>
        ) : (
          <div className="p-1">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => onSelect(conv.id)}
                className={cn(
                  'flex w-full items-start gap-3 rounded-lg p-3 text-left transition-colors',
                  selectedId === conv.id
                    ? 'bg-emerald-500/10'
                    : 'hover:bg-muted/50'
                )}
              >
                <Avatar className="size-10 shrink-0 border">
                  <AvatarFallback className="bg-emerald-500/10 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                    {getInitials(conv.contact.name, conv.contact.phone)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold">
                      {conv.contact.name || formatPhoneNumber(conv.contact.phone)}
                    </span>
                    {conv.lastMessageAt && (
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {formatRelativeTime(conv.lastMessageAt)}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {conv.contact.name ? formatPhoneNumber(conv.contact.phone) : ''}
                  </p>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                      {conv.lastMessagePreview || 'No messages yet'}
                    </p>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {conv.assignedAgent && (
                        <Avatar className="size-4 border">
                          <AvatarFallback className="text-[7px] font-bold">
                            {conv.assignedAgent.name?.charAt(0)?.toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      {conv.unreadCount > 0 && (
                        <Badge className="size-5 min-w-5 items-center justify-center rounded-full p-0 text-[10px]">
                          {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
