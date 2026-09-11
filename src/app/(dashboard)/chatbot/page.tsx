'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Bot,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Globe,
  GlobeOff,
  Loader2,
} from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface ChatbotItem {
  id: string
  name: string
  description: string | null
  isActive: boolean
  isPublished: boolean
  version: number
  createdAt: string
  nodes: { id: string }[]
  edges: { id: string }[]
}

export default function ChatbotListPage() {
  const router = useRouter()
  const [chatbots, setChatbots] = React.useState<ChatbotItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [deleteId, setDeleteId] = React.useState<string | null>(null)
  const [deleting, setDeleting] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false

    fetch('/api/chatbots')
      .then((res) => res.json())
      .then((body: { success: boolean; data?: ChatbotItem[] }) => {
        if (!cancelled && body.success) {
          setChatbots(body.data || [])
        }
      })
      .catch(() => {
        console.error('Failed to fetch chatbots')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const toggleActive = async (id: string, current: boolean) => {
    try {
      await fetch(`/api/chatbots/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !current }),
      })
      setChatbots((prev) =>
        prev.map((c) => (c.id === id ? { ...c, isActive: !c.isActive } : c))
      )
    } catch {
      console.error('Failed to toggle')
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      await fetch(`/api/chatbots/${deleteId}`, { method: 'DELETE' })
      setChatbots((prev) => prev.filter((c) => c.id !== deleteId))
      setDeleteId(null)
    } catch {
      console.error('Failed to delete')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Chatbots</h1>
          <p className="text-sm text-muted-foreground">
            Build and manage visual chatbot flows for WhatsApp.
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/chatbot/new">
            <Plus className="mr-1.5 h-4 w-4" />
            Create Chatbot
          </Link>
        </Button>
      </div>

      {loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                  <Skeleton className="h-3 w-48" />
                  <div className="flex gap-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <Skeleton className="h-3 w-24" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && chatbots.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Bot className="h-6 w-6" />
            </div>
            <div>
              <p className="font-semibold">No chatbots yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Create your first chatbot to automate conversations.
              </p>
            </div>
            <Button asChild size="sm">
              <Link href="/chatbot/new">
                <Plus className="mr-1.5 h-4 w-4" />
                Create Chatbot
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {!loading && chatbots.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {chatbots.map((chatbot) => (
            <Card key={chatbot.id} className="group relative transition-shadow hover:shadow-md">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Bot className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold leading-tight">
                        {chatbot.name}
                      </h3>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {chatbot.description || 'No description'}
                      </p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => router.push(`/chatbot/${chatbot.id}`)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toggleActive(chatbot.id, chatbot.isActive)}>
                        {chatbot.isActive ? (
                          <>
                            <GlobeOff className="mr-2 h-4 w-4" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <Globe className="mr-2 h-4 w-4" />
                            Activate
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => setDeleteId(chatbot.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Badge variant={chatbot.isPublished ? 'default' : 'secondary'}>
                    {chatbot.isPublished ? 'Published' : 'Draft'}
                  </Badge>
                  <Badge variant={chatbot.isActive ? 'success' : 'outline'}>
                    {chatbot.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    v{chatbot.version}
                  </span>
                </div>

                <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{chatbot.nodes.length} nodes</span>
                  <span>{chatbot.edges.length} edges</span>
                  <span>{new Date(chatbot.createdAt).toLocaleDateString()}</span>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 w-full"
                  onClick={() => router.push(`/chatbot/${chatbot.id}`)}
                >
                  Open Editor
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Chatbot</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this chatbot and all its nodes and edges.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
