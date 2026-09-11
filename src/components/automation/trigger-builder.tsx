'use client'

import * as React from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export interface TriggerConfig {
  type: string
  config: Record<string, unknown>
}

interface TriggerBuilderProps {
  value: TriggerConfig
  onChange: (trigger: TriggerConfig) => void
}

const TRIGGER_TYPES = [
  { value: 'message_received', label: 'Incoming Message', description: 'When a message is received' },
  { value: 'contact_created', label: 'Contact Created', description: 'When a new contact is added' },
  { value: 'tag_added', label: 'Tag Added', description: 'When a tag is added to a contact' },
  { value: 'form_submitted', label: 'Campaign Completed', description: 'When a campaign finishes' },
  { value: 'schedule', label: 'Scheduled Time', description: 'Run on a schedule' },
]

export function TriggerBuilder({ value, onChange }: TriggerBuilderProps) {
  const updateConfig = (key: string, val: unknown) => {
    onChange({
      ...value,
      config: { ...value.config, [key]: val },
    })
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Trigger Type</Label>
        <Select
          value={value.type || ''}
          onValueChange={(v) => onChange({ type: v, config: {} })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a trigger" />
          </SelectTrigger>
          <SelectContent>
            {TRIGGER_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                <div>
                  <p className="text-sm font-medium">{t.label}</p>
                  <p className="text-xs text-muted-foreground">{t.description}</p>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {value.type === 'message_received' && (
        <>
          <div className="space-y-2">
            <Label>Keyword Filter</Label>
            <Input
              value={String(value.config.keyword || '')}
              onChange={(e) => updateConfig('keyword', e.target.value)}
              placeholder="Trigger keyword (leave empty for all messages)"
            />
          </div>
          <div className="space-y-2">
            <Label>Match Type</Label>
            <Select
              value={String(value.config.matchType || 'contains')}
              onValueChange={(v) => updateConfig('matchType', v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="contains">Contains</SelectItem>
                <SelectItem value="exact">Exact Match</SelectItem>
                <SelectItem value="starts_with">Starts With</SelectItem>
                <SelectItem value="regex">Regex Pattern</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>From Phone Number (optional)</Label>
            <Input
              value={String(value.config.phone || '')}
              onChange={(e) => updateConfig('phone', e.target.value)}
              placeholder="+1234567890"
            />
          </div>
        </>
      )}

      {value.type === 'contact_created' && (
        <div className="space-y-2">
          <Label>Source Filter (optional)</Label>
          <Input
            value={String(value.config.source || '')}
            onChange={(e) => updateConfig('source', e.target.value)}
            placeholder="e.g. import, api, manual"
          />
        </div>
      )}

      {value.type === 'tag_added' && (
        <div className="space-y-2">
          <Label>Tag Name</Label>
          <Input
            value={String(value.config.tagName || '')}
            onChange={(e) => updateConfig('tagName', e.target.value)}
            placeholder="e.g. vip-customer"
          />
        </div>
      )}

      {value.type === 'form_submitted' && (
        <div className="space-y-2">
          <Label>Campaign ID (optional)</Label>
          <Input
            value={String(value.config.campaignId || '')}
            onChange={(e) => updateConfig('campaignId', e.target.value)}
            placeholder="Leave empty for all campaigns"
          />
        </div>
      )}

      {value.type === 'schedule' && (
        <>
          <div className="space-y-2">
            <Label>Schedule Type</Label>
            <Select
              value={String(value.config.scheduleType || 'daily')}
              onValueChange={(v) => updateConfig('scheduleType', v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="once">Once</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Time (HH:MM)</Label>
            <Input
              type="time"
              value={String(value.config.time || '09:00')}
              onChange={(e) => updateConfig('time', e.target.value)}
            />
          </div>
          {value.config.scheduleType === 'weekly' && (
            <div className="space-y-2">
              <Label>Day of Week</Label>
              <Select
                value={String(value.config.dayOfWeek || '1')}
                onValueChange={(v) => updateConfig('dayOfWeek', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Monday</SelectItem>
                  <SelectItem value="2">Tuesday</SelectItem>
                  <SelectItem value="3">Wednesday</SelectItem>
                  <SelectItem value="4">Thursday</SelectItem>
                  <SelectItem value="5">Friday</SelectItem>
                  <SelectItem value="6">Saturday</SelectItem>
                  <SelectItem value="0">Sunday</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </>
      )}
    </div>
  )
}
