'use client'

import * as React from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Loader2, Save, Trash2, Clock, CheckCircle2, XCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import { TriggerBuilder, type TriggerConfig } from '@/components/automation/trigger-builder'
import { ConditionBuilder, type ConditionGroup } from '@/components/automation/condition-builder'
import { ActionBuilder, type ActionItem } from '@/components/automation/action-builder'

interface Execution {
  id: string
  status: string
  startedAt: string
  completedAt: string | null
  currentStep: number | null
  error: string | null
  contact: { id: string; name: string | null; phone: string } | null
}

interface AutomationDetail {
  id: string
  name: string
  description: string | null
  isActive: boolean
  trigger: TriggerConfig | null
  conditions: ConditionGroup[] | null
  actions: ActionItem[] | null
  executionCount: number
  createdAt: string
  updatedAt: string
  stats: {
    totalRuns: number
    successRate: number
    avgStep: number
  }
}

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'success' | 'warning'> = {
  COMPLETED: 'success',
  RUNNING: 'warning',
  FAILED: 'destructive',
  WAITING: 'secondary',
}

export default function AutomationDetailPage() {
  const router = useRouter()
  const params = useParams()
  const automationId = params.id as string

  const [automation, setAutomation] = React.useState<AutomationDetail | null>(null)
  const [executions, setExecutions] = React.useState<Execution[]>([])
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)

  const [name, setName] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [isActive, setIsActive] = React.useState(false)
  const [trigger, setTrigger] = React.useState<TriggerConfig>({ type: '', config: {} })
  const [conditions, setConditions] = React.useState<ConditionGroup[]>([])
  const [actions, setActions] = React.useState<ActionItem[]>([])

  React.useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/automations/${automationId}`)
        const body = await res.json()
        if (body.success && body.data) {
          const data = body.data
          setAutomation(data)
          setName(data.name)
          setDescription(data.description || '')
          setIsActive(data.isActive)
          setTrigger(data.trigger || { type: '', config: {} })
          setConditions(data.conditions || [])
          setActions(data.actions || [])
        }
      } catch {
        console.error('Failed to load automation')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [automationId])

  React.useEffect(() => {
    async function loadExecutions() {
      try {
        const res = await fetch(`/api/automations/${automationId}/executions?page=1&limit=20`)
        const body = await res.json()
        if (body.success) {
          setExecutions(body.data || [])
        }
      } catch {
        console.error('Failed to load executions')
      }
    }
    loadExecutions()
  }, [automationId])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/automations/${automationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          trigger,
          conditions: conditions.length > 0 ? conditions : null,
          actions: actions.map((a) => ({
            type: a.type,
            config: a.config,
            delay: a.delay || 0,
          })),
          isActive,
        }),
      })
      const body = await res.json()
      if (!body.success) {
        alert(body.error?.message || 'Failed to save')
      }
    } catch {
      alert('Failed to save automation')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await fetch(`/api/automations/${automationId}`, { method: 'DELETE' })
      router.push('/automation')
    } catch {
      console.error('Failed to delete')
      setDeleting(false)
    }
  }

  const handleToggle = async () => {
    const next = !isActive
    setIsActive(next)
    try {
      await fetch(`/api/automations/${automationId}/toggle`, { method: 'POST' })
    } catch {
      setIsActive(!next)
    }
  }

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!automation) {
    return (
      <div className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center gap-4">
        <p className="text-lg font-semibold">Automation not found</p>
        <Button variant="outline" onClick={() => router.push('/automation')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Automations
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.push('/automation')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{automation.name}</h1>
          <p className="text-sm text-muted-foreground">
            {automation.description || 'No description'}
          </p>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch checked={isActive} onCheckedChange={handleToggle} />
            <span className="text-sm">
              {isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
            Save
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Runs</p>
            <p className="mt-1 text-2xl font-bold">{automation.stats.totalRuns}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Success Rate</p>
            <p className="mt-1 text-2xl font-bold">
              {automation.stats.successRate.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Avg Step Count</p>
            <p className="mt-1 text-2xl font-bold">{automation.stats.avgStep}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="configure">
        <TabsList>
          <TabsTrigger value="configure">Configure</TabsTrigger>
          <TabsTrigger value="history">
            Execution History
            <span className="ml-2 rounded-full bg-muted px-1.5 text-xs">
              {automation.executionCount}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="configure">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Trigger</CardTitle>
              </CardHeader>
              <CardContent>
                <TriggerBuilder value={trigger} onChange={setTrigger} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Conditions</CardTitle>
              </CardHeader>
              <CardContent>
                <ConditionBuilder value={conditions} onChange={setConditions} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <ActionBuilder value={actions} onChange={setActions} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Step</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {executions.map((execution) => {
                    const startedAt = new Date(execution.startedAt)
                    const completedAt = execution.completedAt
                      ? new Date(execution.completedAt)
                      : null
                    const durationMs = completedAt
                      ? completedAt.getTime() - startedAt.getTime()
                      : null
                    const durationText =
                      durationMs !== null
                        ? durationMs < 1000
                          ? `${durationMs}ms`
                          : `${(durationMs / 1000).toFixed(1)}s`
                        : '...'

                    return (
                      <TableRow key={execution.id}>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium">
                              {execution.contact?.name || 'Unknown'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {execution.contact?.phone || 'No contact'}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={STATUS_VARIANTS[execution.status] || 'secondary'}>
                            {execution.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {execution.currentStep !== null
                            ? execution.currentStep
                            : '-'}
                        </TableCell>
                        <TableCell>{startedAt.toLocaleString()}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1 text-sm">
                            {durationMs !== null &&
                              (execution.status === 'COMPLETED' ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                              ) : execution.status === 'FAILED' ? (
                                <XCircle className="h-3.5 w-3.5 text-red-500" />
                              ) : (
                                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                              ))}
                            {durationText}
                          </span>
                        </TableCell>
                        <TableCell>
                          {execution.error ? (
                            <span className="line-clamp-1 text-xs text-destructive" title={execution.error}>
                              {execution.error}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}

                  {executions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center">
                        <p className="text-sm font-medium">No executions yet</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Executions will appear here when the automation runs.
                        </p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Automation</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this automation and all its execution history.
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