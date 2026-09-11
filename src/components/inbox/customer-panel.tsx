'use client'

import { useState } from 'react'
import {
  Phone,
  Mail,
  X,
  Plus,
  Loader2,
} from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { formatRelativeTime, formatPhoneNumber } from '@/lib/utils'

interface TagItem {
  id: string
  tag: { id: string; name: string; color: string | null }
}

interface CustomField {
  id: string
  fieldName: string
  fieldValue: string
}

interface NoteItem {
  id: string
  content: string
  createdAt: string
  user: { id: string; name: string | null }
}

interface ContactInfo {
  id: string
  name: string | null
  phone: string
  email: string | null
  tags: TagItem[]
  customFields: CustomField[]
  notes: NoteItem[]
}

interface CustomerPanelProps {
  contact: ContactInfo
  onAddTag: (name: string) => void
  onRemoveTag: (tagId: string) => void
  onAddNote: (content: string) => void
}

export function CustomerPanel({
  contact,
  onAddTag,
  onRemoveTag,
  onAddNote,
}: CustomerPanelProps) {
  const [newTagName, setNewTagName] = useState('')
  const [newNote, setNewNote] = useState('')
  const [showAddTag, setShowAddTag] = useState(false)
  const [showAddNote, setShowAddNote] = useState(false)
  const [addingTag, setAddingTag] = useState(false)
  const [addingNote, setAddingNote] = useState(false)

  const initials = contact.name
    ? contact.name
        .split(' ')
        .map((p) => p.charAt(0))
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : contact.phone.replace(/\D/g, '').slice(-2)

  const handleAddTag = async () => {
    const name = newTagName.trim()
    if (!name) return
    setAddingTag(true)
    try {
      onAddTag(name)
      setNewTagName('')
      setShowAddTag(false)
    } finally {
      setAddingTag(false)
    }
  }

  const handleAddNote = async () => {
    const content = newNote.trim()
    if (!content) return
    setAddingNote(true)
    try {
      onAddNote(content)
      setNewNote('')
      setShowAddNote(false)
    } finally {
      setAddingNote(false)
    }
  }

  return (
    <div className="flex h-full w-full flex-col border-l bg-background">
      <ScrollArea className="flex-1">
        <div className="p-4">
          <div className="flex flex-col items-center text-center">
            <Avatar className="size-16 border-2">
              <AvatarFallback className="bg-emerald-500/10 text-lg font-bold text-emerald-700 dark:text-emerald-400">
                {initials}
              </AvatarFallback>
            </Avatar>
            <h3 className="mt-3 text-sm font-semibold">
              {contact.name || 'Unknown Contact'}
            </h3>
            <p className="text-xs text-muted-foreground">
              {formatPhoneNumber(contact.phone)}
            </p>
          </div>

          <Separator className="my-4" />

          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Phone className="size-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{formatPhoneNumber(contact.phone)}</span>
            </div>
            {contact.email && (
              <div className="flex items-center gap-3 text-sm">
                <Mail className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{contact.email}</span>
              </div>
            )}
          </div>

          <Separator className="my-4" />

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Tags
              </h4>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => setShowAddTag(true)}
              >
                <Plus className="size-3" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {contact.tags.map((t) => (
                <Badge
                  key={t.id}
                  variant="secondary"
                  className="gap-1 pr-1 text-xs"
                >
                  {t.tag.name}
                  <button
                    type="button"
                    onClick={() => onRemoveTag(t.tag.id)}
                    className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20"
                  >
                    <X className="size-2.5" />
                  </button>
                </Badge>
              ))}
              {contact.tags.length === 0 && !showAddTag && (
                <p className="text-xs text-muted-foreground">No tags</p>
              )}
            </div>
            {showAddTag && (
              <div className="mt-2 flex gap-1">
                <Input
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="Tag name"
                  className="h-7 text-xs"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddTag()
                    if (e.key === 'Escape') {
                      setShowAddTag(false)
                      setNewTagName('')
                    }
                  }}
                  autoFocus
                />
                <Button
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={handleAddTag}
                  disabled={addingTag || !newTagName.trim()}
                >
                  {addingTag ? <Loader2 className="size-3 animate-spin" /> : 'Add'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs"
                  onClick={() => {
                    setShowAddTag(false)
                    setNewTagName('')
                  }}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>

          <Separator className="my-4" />

          {contact.customFields.length > 0 && (
            <>
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Custom Fields
                </h4>
                <div className="space-y-2">
                  {contact.customFields.map((f) => (
                    <div
                      key={f.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-muted-foreground">{f.fieldName}</span>
                      <span className="font-medium">{f.fieldValue}</span>
                    </div>
                  ))}
                </div>
              </div>
              <Separator className="my-4" />
            </>
          )}

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Notes
              </h4>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => setShowAddNote(true)}
              >
                <Plus className="size-3" />
              </Button>
            </div>
            {showAddNote && (
              <div className="mb-3 space-y-1.5">
                <Textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add a note..."
                  className="text-xs"
                  rows={2}
                  autoFocus
                />
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    className="h-7 text-xs"
                    onClick={handleAddNote}
                    disabled={addingNote || !newNote.trim()}
                  >
                    {addingNote ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      'Save'
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() => {
                      setShowAddNote(false)
                      setNewNote('')
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
            <div className="space-y-2">
              {contact.notes.map((note) => (
                <div key={note.id} className="rounded-lg border p-2.5">
                  <p className="text-xs whitespace-pre-wrap">{note.content}</p>
                  <div className="mt-1.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span>{note.user.name || 'Unknown'}</span>
                    <span>&middot;</span>
                    <span>{formatRelativeTime(note.createdAt)}</span>
                  </div>
                </div>
              ))}
              {contact.notes.length === 0 && !showAddNote && (
                <p className="text-xs text-muted-foreground">No notes yet</p>
              )}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
