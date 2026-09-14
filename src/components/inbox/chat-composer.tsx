'use client'

import { useState, useRef, useCallback } from 'react'
import { Send, Smile, Paperclip, FileText, Loader2, Image, Video } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface ChatComposerProps {
  onSend: (message: { type: string; text?: string; media?: { url: string; caption?: string; filename?: string } }) => void
  disabled?: boolean
}

const EMOJI_GRID = [
  '\u{1F60A}', '\u{1F602}', '\u{2764}\u{FE0F}', '\u{1F44D}', '\u{1F64F}', '\u{1F389}',
  '\u{1F525}', '\u{1F4AF}', '\u{1F60D}', '\u{1F923}', '\u{1F618}', '\u{1F60E}',
  '\u{1F914}', '\u{1F44B}', '\u{1F4AA}', '\u{2728}', '\u{1F973}', '\u{1F622}',
  '\u{1F62D}', '\u{1F621}', '\u{1F92F}', '\u{1F634}', '\u{1F917}', '\u{1F60F}',
  '\u{1F91D}', '\u{1F44F}', '\u{1F64C}', '\u{1F495}', '\u{2B50}', '\u{1F31F}',
  '\u{1F4BC}', '\u{1F4F1}',
]

function getMediaType(mime: string): string {
  if (mime.startsWith('image/')) return 'IMAGE'
  if (mime.startsWith('video/')) return 'VIDEO'
  if (mime.startsWith('audio/')) return 'AUDIO'
  return 'DOCUMENT'
}

export function ChatComposer({ onSend, disabled }: ChatComposerProps) {
  const [text, setText] = useState('')
  const [uploading, setUploading] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSend = useCallback(() => {
    const trimmed = text.trim()
    if (!trimmed) return
    onSend({ type: 'TEXT', text: trimmed })
    setText('')
    textareaRef.current?.focus()
  }, [text, onSend])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend]
  )

  const insertEmoji = useCallback((emoji: string) => {
    setText((prev) => prev + emoji)
    textareaRef.current?.focus()
  }, [])

  const uploadAndSend = useCallback(
    async (file: File) => {
      setUploading(true)
      try {
        const formData = new FormData()
        formData.append('file', file)
        const res = await fetch('/api/media/upload', { method: 'POST', body: formData })
        if (!res.ok) throw new Error('Upload failed')
        const body = await res.json()
        const mediaUrl = body.data?.url || body.data?.mediaUrl
        if (!mediaUrl) throw new Error('No URL returned')
        const type = getMediaType(file.type)
        onSend({
          type,
          media: { url: mediaUrl, filename: file.name, caption: type === 'DOCUMENT' ? file.name : undefined },
        })
      } catch {
        // Silently fail — user can retry
      } finally {
        setUploading(false)
      }
    },
    [onSend]
  )

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) uploadAndSend(file)
      e.target.value = ''
    },
    [uploadAndSend]
  )

  return (
    <div className="border-t bg-background p-4">
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={handleFileSelect}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,.pdf,.doc,.docx,.txt,.csv,.xls,.xlsx"
        className="hidden"
        onChange={handleFileSelect}
      />
      <div className="flex items-end gap-2">
        <div className="flex gap-0.5">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-9 shrink-0 text-muted-foreground"
                disabled={disabled || uploading}
              >
                <Smile className="size-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent side="top" className="w-auto p-2">
              <div className="grid grid-cols-8 gap-1">
                {EMOJI_GRID.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => insertEmoji(emoji)}
                    className="flex size-8 items-center justify-center rounded hover:bg-muted text-base"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          <Button
            variant="ghost"
            size="icon"
            className="size-9 shrink-0 text-muted-foreground"
            disabled={disabled || uploading}
            onClick={() => imageInputRef.current?.click()}
            title="Send image or video"
          >
            {uploading ? <Loader2 className="size-5 animate-spin" /> : <Image className="size-5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-9 shrink-0 text-muted-foreground"
            disabled={disabled || uploading}
            onClick={() => fileInputRef.current?.click()}
            title="Send file or document"
          >
            {uploading ? <Loader2 className="size-5 animate-spin" /> : <FileText className="size-5" />}
          </Button>
        </div>
        <Textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          disabled={disabled || uploading}
          className="min-h-[40px] max-h-32 resize-none"
          rows={1}
        />
        <Button
          onClick={handleSend}
          disabled={disabled || uploading || !text.trim()}
          size="icon"
          className="size-9 shrink-0 bg-emerald-600 hover:bg-emerald-700"
        >
          <Send className="size-4" />
        </Button>
      </div>
    </div>
  )
}
