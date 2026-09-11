'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { ChevronDown, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ConversationList } from '@/components/inbox/conversation-list'
import type { ConversationListItem } from '@/components/inbox/conversation-list'
import { MessageBubble } from '@/components/inbox/message-bubble'
import { ChatComposer } from '@/components/inbox/chat-composer'
import { CustomerPanel } from '@/components/inbox/customer-panel'

interface MessageItem {
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

interface ContactInfo {
  id: string
  name: string | null
  phone: string
  email: string | null
  tags: Array<{ id: string; tag: { id: string; name: string; color: string | null } }>
  customFields: Array<{ id: string; fieldName: string; fieldValue: string }>
  notes: Array<{ id: string; content: string; createdAt: string; user: { id: string; name: string | null } }>
}

interface ConversationDetail {
  id: string
  status: string
  unreadCount: number
  assignedAgentId: string | null
  contact: ContactInfo
  assignedAgent: { id: string; name: string | null; email: string | null; image: string | null } | null
}

const STATUS_OPTIONS = [
  { value: 'OPEN', label: 'Open' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'CLOSED', label: 'Closed' },
]

const EMPTY_CONTACT: ConversationDetail = {
  id: '',
  status: 'OPEN',
  unreadCount: 0,
  assignedAgentId: null,
  contact: { id: '', name: null, phone: '', email: null, tags: [], customFields: [], notes: [] },
  assignedAgent: null,
}

export default function InboxPage() {
  const { data: session } = useSession()
  const [showMobileView, setShowMobileView] = useState<'list' | 'chat' | 'customer'>('list')

  const [conversations, setConversations] = useState<ConversationListItem[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [listLoading, setListLoading] = useState(true)

  const [conversation, setConversation] = useState<ConversationDetail>(EMPTY_CONTACT)
  const [messages, setMessages] = useState<MessageItem[]>([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const scrollAnchorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    let cancelled = false

    async function loadConversations() {
      setListLoading(true)
      const params = new URLSearchParams({ limit: '200' })
      if (debouncedSearch) params.set('search', debouncedSearch)
      if (filter !== 'all') params.set('filter', filter)
      try {
        const res = await fetch(`/api/conversations?${params}`)
        const body = await res.json()
        if (!cancelled && body.data) setConversations(body.data)
      } catch {
      } finally {
        if (!cancelled) setListLoading(false)
      }
    }

    loadConversations()
    return () => {
      cancelled = true
    }
  }, [debouncedSearch, filter])

  const fetchConversation = useCallback(async (id: string) => {
    setDetailLoading(true)
    try {
      const [detailRes, messagesRes] = await Promise.all([
        fetch(`/api/conversations/${id}`),
        fetch(`/api/conversations/${id}/messages?limit=100`),
      ])
      const detailBody = await detailRes.json()
      const messagesBody = await messagesRes.json()
      if (detailBody.data) setConversation(detailBody.data)
      setMessages(messagesBody.data || [])
    } catch {
    } finally {
      setDetailLoading(false)
    }
  }, [])

  const handleSelect = useCallback(
    (id: string) => {
      setSelectedId(id)
      setShowMobileView('chat')
      fetchConversation(id)
    },
    [fetchConversation]
  )

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      scrollAnchorRef.current?.scrollIntoView({ behavior: 'smooth' })
    })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const handleSend = useCallback(
    async (msg: { type: string; text?: string }) => {
      if (!selectedId) return
      setSending(true)
      const optimistic: MessageItem = {
        id: `temp-${Date.now()}`,
        type: msg.type,
        direction: 'OUTBOUND',
        status: 'QUEUED',
        content: { text: msg.text },
        createdAt: new Date().toISOString(),
        sentAt: null,
        deliveredAt: null,
        readAt: null,
        errorMessage: null,
      }
      setMessages((prev) => [...prev, optimistic])
      try {
        const res = await fetch(`/api/conversations/${selectedId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(msg),
        })
        const body = await res.json()
        if (body.data) {
          setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? body.data.message : m)))
        }
      } catch {
      } finally {
        setSending(false)
      }
    },
    [selectedId]
  )

  const handleAssign = useCallback(
    async (agentId: string | null) => {
      if (!selectedId) return
      setActionLoading('assign')
      try {
        const res = await fetch(`/api/conversations/${selectedId}/assign`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agentId }),
        })
        if (res.ok) {
          setConversation((prev) => ({ ...prev, assignedAgentId: agentId }))
          setConversations((prev) =>
            prev.map((c) => (c.id === selectedId ? { ...c, assignedAgentId: agentId } : c))
          )
        }
      } catch {
      } finally {
        setActionLoading(null)
      }
    },
    [selectedId]
  )

  const handleStatus = useCallback(
    async (status: string) => {
      if (!selectedId) return
      setActionLoading('status')
      try {
        const res = await fetch(`/api/conversations/${selectedId}/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        })
        if (res.ok) {
          setConversation((prev) => ({ ...prev, status }))
          setConversations((prev) =>
            prev.map((c) => (c.id === selectedId ? { ...c, status } : c))
          )
        }
      } catch {
      } finally {
        setActionLoading(null)
      }
    },
    [selectedId]
  )

  const handleAddTag = useCallback(
    async (name: string) => {
      if (!selectedId) return
      const res = await fetch(`/api/conversations/${selectedId}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const body = await res.json()
      if (body.data) {
        setConversation((prev) => ({
          ...prev,
          contact: { ...prev.contact, tags: body.data },
        }))
      }
    },
    [selectedId]
  )

  const handleRemoveTag = useCallback(
    async (tagId: string) => {
      if (!selectedId) return
      const res = await fetch(`/api/conversations/${selectedId}/tags`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagId }),
      })
      if (res.ok) {
        setConversation((prev) => ({
          ...prev,
          contact: {
            ...prev.contact,
            tags: prev.contact.tags.filter((t) => t.tag.id !== tagId),
          },
        }))
      }
    },
    [selectedId]
  )

  const handleAddNote = useCallback(
    async (content: string) => {
      if (!selectedId) return
      const res = await fetch(`/api/conversations/${selectedId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      const body = await res.json()
      if (body.data) {
        setConversation((prev) => ({
          ...prev,
          contact: { ...prev.contact, notes: [...prev.contact.notes, body.data] },
        }))
      }
    },
    [selectedId]
  )

  const selectedAgent = conversation.assignedAgent
  const contactName = conversation.contact.name || conversation.contact.phone

  return (
    <div className="flex h-full w-full overflow-hidden">
      <div
        className={`flex h-full w-full lg:flex lg:flex-row ${showMobileView !== 'list' ? 'hidden lg:flex' : ''}`}
      >
        <div className={`flex h-full w-full flex-col lg:w-[320px] lg:shrink-0 lg:flex-row`}>
          <ConversationList
            conversations={conversations}
            selectedId={selectedId}
            search={search}
            onSearchChange={setSearch}
            filter={filter}
            onFilterChange={setFilter}
            onSelect={handleSelect}
            loading={listLoading}
          />
        </div>

        <div
          className={`flex h-full min-w-0 flex-1 flex-col bg-muted/30 ${
            showMobileView !== 'chat' ? 'hidden lg:flex' : ''
          }`}
        >
          {selectedId ? (
            <>
              <div className="flex items-center justify-between border-b bg-background px-4 py-2.5">
                <button
                  className="lg:hidden mr-2 text-sm text-muted-foreground"
                  onClick={() => setShowMobileView('list')}
                >
                  Back
                </button>
                <div className="flex min-w-0 items-center gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{contactName}</p>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`inline-block size-2 rounded-full ${
                          conversation.status === 'OPEN'
                            ? 'bg-emerald-500'
                            : conversation.status === 'PENDING'
                              ? 'bg-amber-500'
                              : 'bg-gray-400'
                        }`}
                      />
                      <span className="text-xs text-muted-foreground">
                        {contactName !== conversation.contact.phone
                          ? conversation.contact.phone
                          : conversation.status.charAt(0) + conversation.status.slice(1).toLowerCase()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    className="lg:hidden mr-1 text-sm text-muted-foreground"
                    onClick={() => setShowMobileView('customer')}
                  >
                    Details
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 gap-1 text-xs">
                        {conversation.status.charAt(0) + conversation.status.slice(1).toLowerCase()}
                        <ChevronDown className="size-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Status</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {STATUS_OPTIONS.map((s) => (
                        <DropdownMenuItem
                          key={s.value}
                          disabled={actionLoading === 'status'}
                          onClick={() => handleStatus(s.value)}
                        >
                          {s.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 gap-1 text-xs">
                        {selectedAgent?.name || 'Unassigned'}
                        <ChevronDown className="size-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Assigned to</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        disabled={actionLoading === 'assign'}
                        onClick={() => handleAssign(null)}
                      >
                        Unassigned
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        disabled
                        className="text-xs text-muted-foreground"
                      >
                        {session?.user?.name ? `Assign to: ${session.user.name}` : 'Assign to yourself'}
                      </DropdownMenuItem>
                      {session && (
                        <DropdownMenuItem
                          disabled={actionLoading === 'assign'}
                          onClick={() => handleAssign(session.user.id)}
                        >
                          {session.user.name || 'Me'}
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto py-4">
                {detailLoading ? (
                  <div className="flex h-full items-center justify-center">
                    <Loader2 className="size-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    {messages.map((m) => (
                      <MessageBubble key={m.id} message={m} />
                    ))}
                  </div>
                )}
                <div ref={scrollAnchorRef} />
              </div>

              <ChatComposer onSend={handleSend} disabled={sending || !selectedId} />
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <p className="text-sm font-medium">Select a conversation</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Choose a conversation from the list to start chatting.
              </p>
            </div>
          )}
        </div>

        <div
          className={`hidden w-[320px] shrink-0 lg:flex ${
            showMobileView === 'customer' ? 'flex' : ''
          }`}
        >
          <CustomerPanel
            contact={conversation.contact}
            onAddTag={handleAddTag}
            onRemoveTag={handleRemoveTag}
            onAddNote={handleAddNote}
          />
        </div>
      </div>
    </div>
  )
}