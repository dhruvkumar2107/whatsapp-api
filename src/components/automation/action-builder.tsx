'use client'

import * as React from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export interface ActionItem {
  id: string
  type: string
  config: Record<string, unknown>
  delay?: number
}

interface ActionBuilderProps {
  value: ActionItem[]
  onChange: (actions: ActionItem[]) => void
}

const ACTION_TYPES = [
  { value: 'send_message', label: 'Send Message', category: 'Messages' },
  { value: 'send_template', label: 'Send Template', category: 'Messages' },
  { value: 'add_tag', label: 'Add Tag', category: 'Tags' },
  { value: 'remove_tag', label: 'Remove Tag', category: 'Tags' },
  { value: 'update_field', label: 'Update Contact Field', category: 'Contact' },
  { value: 'assign_agent', label: 'Assign Agent', category: 'Assignment' },
  { value: 'webhook_call', label: 'Webhook Call', category: 'Integration' },
  { value: 'api_call', label: 'API Call', category: 'Integration' },
  { value: 'wait', label: 'Wait / Delay', category: 'Flow' },
  { value: 'start_chatbot', label: 'Start Chatbot', category: 'Flow' },
]

function genId(): string {
  return Math.random().toString(36).slice(2, 10)
}

export function ActionBuilder({ value, onChange }: ActionBuilderProps) {
  const addAction = (type: string) => {
    const defaults: Record<string, Record<string, unknown>> = {
      send_message: { content: '', messageType: 'TEXT' },
      send_template: { templateName: '', language: 'en' },
      add_tag: { tagName: '' },
      remove_tag: { tagName: '' },
      update_field: { field: '', value: '' },
      assign_agent: { method: 'round_robin' },
      webhook_call: { url: '', method: 'POST', payload: '{}' },
      api_call: { url: '', method: 'GET', headers: '{}', body: '{}' },
      wait: { duration: 5, unit: 'minutes' },
      start_chatbot: { chatbotId: '' },
    }

    onChange([
      ...value,
      { id: genId(), type, config: defaults[type] || {}, delay: 0 },
    ])
  }

  const removeAction = (id: string) => {
    onChange(value.filter((a) => a.id !== id))
  }

  const updateConfig = (id: string, key: string, val: unknown) => {
    onChange(
      value.map((a) =>
        a.id === id ? { ...a, config: { ...a.config, [key]: val } } : a
      )
    )
  }

  const categories = ACTION_TYPES.reduce<Record<string, typeof ACTION_TYPES>>((acc, at) => {
    if (!acc[at.category]) acc[at.category] = []
    acc[at.category].push(at)
    return acc
  }, {})

  return (
    <div className="space-y-3">
      {value.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No actions configured. Add actions to define what happens when the automation runs.
        </p>
      )}

      {value.map((action, index) => (
        <div key={action.id} className="rounded-lg border">
          <div className="flex items-center gap-2 border-b bg-muted/30 px-3 py-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {index + 1}
            </span>
            <span className="flex-1 text-xs font-medium">
              {ACTION_TYPES.find((at) => at.value === action.type)?.label || action.type}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-destructive"
              onClick={() => removeAction(action.id)}
            >
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </Button>
          </div>

          <div className="space-y-3 p-3">
            {(action.type === 'send_message') && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs">Message Content</Label>
                  <Textarea
                    value={String(action.config.content || '')}
                    onChange={(e) => updateConfig(action.id, 'content', e.target.value)}
                    placeholder="Type your message. Use {{variable}} for dynamic content."
                    rows={3}
                  />
                </div>
              </>
            )}

            {action.type === 'send_template' && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs">Template Name</Label>
                  <Input
                    value={String(action.config.templateName || '')}
                    onChange={(e) => updateConfig(action.id, 'templateName', e.target.value)}
                    placeholder="template_name"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Language</Label>
                  <Input
                    value={String(action.config.language || 'en')}
                    onChange={(e) => updateConfig(action.id, 'language', e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </>
            )}

            {(action.type === 'add_tag' || action.type === 'remove_tag') && (
              <div className="space-y-1.5">
                <Label className="text-xs">Tag Name</Label>
                <Input
                  value={String(action.config.tagName || '')}
                  onChange={(e) => updateConfig(action.id, 'tagName', e.target.value)}
                  placeholder="e.g. vip-customer"
                  className="h-8 text-xs"
                />
              </div>
            )}

            {action.type === 'update_field' && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs">Field</Label>
                  <Select
                    value={String(action.config.field || '')}
                    onValueChange={(v) => updateConfig(action.id, 'field', v)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select field" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name">Name</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="notes">Notes</SelectItem>
                      <SelectItem value="source">Source</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Value</Label>
                  <Input
                    value={String(action.config.value || '')}
                    onChange={(e) => updateConfig(action.id, 'value', e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </>
            )}

            {action.type === 'assign_agent' && (
              <div className="space-y-1.5">
                <Label className="text-xs">Method</Label>
                <Select
                  value={String(action.config.method || 'round_robin')}
                  onValueChange={(v) => updateConfig(action.id, 'method', v)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="round_robin">Round Robin</SelectItem>
                    <SelectItem value="least_load">Least Load</SelectItem>
                    <SelectItem value="specific">Specific Agent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {(action.type === 'webhook_call' || action.type === 'api_call') && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs">URL</Label>
                  <Input
                    value={String(action.config.url || '')}
                    onChange={(e) => updateConfig(action.id, 'url', e.target.value)}
                    placeholder="https://..."
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Method</Label>
                  <Select
                    value={String(action.config.method || 'POST')}
                    onValueChange={(v) => updateConfig(action.id, 'method', v)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GET">GET</SelectItem>
                      <SelectItem value="POST">POST</SelectItem>
                      <SelectItem value="PUT">PUT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {action.type === 'api_call' && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Headers (JSON)</Label>
                    <Textarea
                      value={String(action.config.headers || '{}')}
                      onChange={(e) => updateConfig(action.id, 'headers', e.target.value)}
                      rows={2}
                    />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label className="text-xs">Body (JSON)</Label>
                  <Textarea
                    value={String(action.config.payload || action.config.body || '{}')}
                    onChange={(e) => updateConfig(action.id, action.type === 'webhook_call' ? 'payload' : 'body', e.target.value)}
                    rows={2}
                  />
                </div>
              </>
            )}

            {action.type === 'wait' && (
              <div className="flex items-end gap-2">
                <div className="flex-1 space-y-1.5">
                  <Label className="text-xs">Duration</Label>
                  <Input
                    type="number"
                    value={String(action.config.duration || 5)}
                    onChange={(e) => updateConfig(action.id, 'duration', Number(e.target.value))}
                    min={1}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="flex-1 space-y-1.5">
                  <Label className="text-xs">Unit</Label>
                  <Select
                    value={String(action.config.unit || 'minutes')}
                    onValueChange={(v) => updateConfig(action.id, 'unit', v)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="seconds">Seconds</SelectItem>
                      <SelectItem value="minutes">Minutes</SelectItem>
                      <SelectItem value="hours">Hours</SelectItem>
                      <SelectItem value="days">Days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {action.type === 'start_chatbot' && (
              <div className="space-y-1.5">
                <Label className="text-xs">Chatbot ID</Label>
                <Input
                  value={String(action.config.chatbotId || '')}
                  onChange={(e) => updateConfig(action.id, 'chatbotId', e.target.value)}
                  placeholder="Chatbot UUID"
                  className="h-8 text-xs"
                />
              </div>
            )}
          </div>
        </div>
      ))}

      <div className="rounded-lg border border-dashed p-3">
        <p className="mb-2 text-xs font-medium text-muted-foreground">Add Action</p>
        {Object.entries(categories).map(([cat, actions]) => (
          <div key={cat} className="mb-2">
            <p className="mb-1 text-[10px] font-medium uppercase text-muted-foreground">{cat}</p>
            <div className="flex flex-wrap gap-1">
              {actions.map((at) => (
                <Button
                  key={at.value}
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => addAction(at.value)}
                >
                  {at.label}
                </Button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
