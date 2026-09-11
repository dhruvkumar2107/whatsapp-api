'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Zap,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Clock,
  Activity,
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

interface AutomationItem {
  id: string
  name: string
  description: string | null
  isActive: boolean
  trigger: { type: string; config: Record<string, unknown> } | null
  executionCount: number
  createdAt: string
}

const TRIGGER_LABELS: Record<string, string> = {
  message_received: 'Incoming Message',
  contact_created: 'Contact Created',
  tag_added: 'Tag Added',
  form_submitted: 'Campaign Completed',
  schedule: 'Scheduled',
}

export default function AutomationListPage() {
  const router = useRouter()
  const [automations, setAutomations] = React.useState<AutomationItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [deleteId, setDeleteId] = React.useState<string | null>(null)
  const [deleting, setDeleting] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false

    fetch('/api/automations')
      .then((res) => res.json())
      .then((body: { success: boolean; data?: AutomationItem[] }) => {
        if (!cancelled && body.success) {
          setAutomations(body.data || [])
        }
      })
      .catch(() => {
        console.error('Failed to fetch automations')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const toggleActive = async (id: string) => {
    try {
      const res = await fetch(`/api/automations/${id}/toggle`, { method: 'POST' })
      const body = await res.json()
      if (body.success) {
        setAutomations((prev) =>
          prev.map((a) =>
            a.id === id ? { ...a, isActive: body.data.isActive } : a
          )
        )
      }
    } catch {
      console.error('Failed to toggle')
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      await fetch(`/api/automations/${deleteId}`, { method: 'DELETE' })
      setAutomations((prev) => prev.filter((a) => a.id !== deleteId))
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
          <h1 className="text-2xl font-bold tracking-tight">Automations</h1>
          <p className="text-sm text-muted-foreground">
            Automate workflows triggered by events and conditions.
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/automation/new">
            <Plus className="mr-1.5 h-4 w-4" />
            Create Automation
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
                  <div className="flex gap-4">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && automations.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600">
              <Zap className="h-6 w-6" />
            </div>
            <div>
              <p className="font-semibold">No automations yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Create your first automation to streamline your workflows.
              </p>
            </div>
            <Button asChild size="sm">
              <Link href="/automation/new">
                <Plus className="mr-1.5 h-4 w-4" />
                Create Automation
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {!loading && automations.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {automations.map((automation) => (
            <Card key={automation.id} className="group relative transition-shadow hover:shadow-md">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
                      <Zap className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold leading-tight">
                        {automation.name}
                      </h3>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {automation.description || 'No description'}
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
                      <DropdownMenuItem
                        onClick={() => router.push(`/automation/${automation.id}`)}
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toggleActive(automation.id)}>
                        {automation.isActive ? 'Deactivate' : 'Activate'}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => setDeleteId(automation.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Badge variant={automation.isActive ? 'success' : 'outline'}>
                    {automation.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                  <Badge variant="secondary">
                    {TRIGGER_LABELS[automation.trigger?.type || ''] || automation.trigger?.type || 'Unknown'}
                  </Badge>
                </div>

                <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Activity className="h-3 w-3" />
                    {automation.executionCount} runs
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(automation.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 w-full"
                  onClick={() => router.push(`/automation/${automation.id}`)}
                >
                  View Details
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Automation</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this automation and its execution history.
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
