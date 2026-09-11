'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Sparkles } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default function NewChatbotPage() {
  const router = useRouter()
  const [name, setName] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [creating, setCreating] = React.useState(false)

  const handleCreate = async () => {
    if (!name.trim()) {
      alert('Name is required')
      return
    }

    setCreating(true)
    try {
      const res = await fetch('/api/chatbots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
        }),
      })
      const body = await res.json()
      if (body.success) {
        router.push(`/chatbot/${body.data.id}`)
      } else {
        alert(body.error?.message || 'Failed to create chatbot')
      }
    } catch {
      alert('Failed to create chatbot')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.push('/chatbot')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New Chatbot</h1>
          <p className="text-sm text-muted-foreground">
            Start with a name. You can build the flow in the visual editor next.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>Give your chatbot a name and description.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate()
              }}
              placeholder="e.g. Customer Support Bot"
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this chatbot for?"
              rows={3}
            />
          </div>
          <Button onClick={handleCreate} disabled={creating} className="w-full">
            {creating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Create and Open Editor
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}