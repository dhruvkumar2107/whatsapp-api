'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Save } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { TriggerBuilder, type TriggerConfig } from '@/components/automation/trigger-builder'
import { ConditionBuilder, type ConditionGroup } from '@/components/automation/condition-builder'
import { ActionBuilder, type ActionItem } from '@/components/automation/action-builder'

export default function NewAutomationPage() {
  const router = useRouter()
  const [saving, setSaving] = React.useState(false)
  const [name, setName] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [isActive, setIsActive] = React.useState(false)
  const [trigger, setTrigger] = React.useState<TriggerConfig>({ type: '', config: {} })
  const [conditions, setConditions] = React.useState<ConditionGroup[]>([])
  const [actions, setActions] = React.useState<ActionItem[]>([])

  const handleSave = async () => {
    if (!name.trim()) {
      alert('Name is required')
      return
    }
    if (!trigger.type) {
      alert('Please select a trigger type')
      return
    }
    if (actions.length === 0) {
      alert('Please add at least one action')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/automations', {
        method: 'POST',
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
      if (body.success) {
        router.push(`/automation/${body.data.id}`)
      } else {
        alert(body.error?.message || 'Failed to create automation')
      }
    } catch {
      alert('Failed to create automation')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.push('/automation')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New Automation</h1>
          <p className="text-sm text-muted-foreground">
            Create a new automated workflow.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
              <CardDescription>Basic information about this automation.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Welcome New Users"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What does this automation do?"
                  rows={2}
                />
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={isActive} onCheckedChange={setIsActive} />
                <Label>Active on creation</Label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Trigger</CardTitle>
              <CardDescription>What event starts this automation?</CardDescription>
            </CardHeader>
            <CardContent>
              <TriggerBuilder value={trigger} onChange={setTrigger} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Conditions</CardTitle>
              <CardDescription>Optional conditions that must be met.</CardDescription>
            </CardHeader>
            <CardContent>
              <ConditionBuilder value={conditions} onChange={setConditions} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
              <CardDescription>What happens when the automation runs?</CardDescription>
            </CardHeader>
            <CardContent>
              <ActionBuilder value={actions} onChange={setActions} />
            </CardContent>
          </Card>
        </div>

        <div className="xl:col-span-1">
          <div className="sticky top-6">
            <Card>
              <CardHeader>
                <CardTitle>Flow Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="rounded-lg border border-dashed p-3 text-center">
                    <p className="text-xs font-medium uppercase text-muted-foreground">Trigger</p>
                    <p className="mt-1 text-sm">
                      {trigger.type
                        ? trigger.type.replace(/_/g, ' ')
                        : 'Not configured'}
                    </p>
                    {Boolean(trigger.config.keyword) && (
                      <p className="text-xs text-muted-foreground">
                        Keyword: &quot;{String(trigger.config.keyword)}&quot;
                      </p>
                    )}
                  </div>

                  {conditions.length > 0 && (
                    <div className="rounded-lg border border-dashed p-3 text-center">
                      <p className="text-xs font-medium uppercase text-muted-foreground">Conditions</p>
                      <p className="mt-1 text-sm">{conditions.length} group(s)</p>
                    </div>
                  )}

                  <div className="flex justify-center">
                    <div className="h-6 w-px bg-border" />
                  </div>

                  {actions.map((action, i) => (
                    <React.Fragment key={action.id}>
                      <div className="rounded-lg border bg-muted/30 p-3">
                        <p className="text-xs font-medium uppercase text-muted-foreground">
                          Action {i + 1}
                        </p>
                        <p className="mt-1 text-sm">
                          {action.type.replace(/_/g, ' ')}
                        </p>
                      </div>
                      {i < actions.length - 1 && (
                        <div className="flex justify-center">
                          <div className="h-4 w-px bg-border" />
                        </div>
                      )}
                    </React.Fragment>
                  ))}

                  {actions.length === 0 && (
                    <p className="text-center text-xs text-muted-foreground">
                      Add actions to see the flow
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="mt-4 flex flex-col gap-2">
              <Button onClick={handleSave} disabled={saving} className="w-full">
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Create Automation
              </Button>
              <Button variant="outline" onClick={() => router.push('/automation')} className="w-full">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
