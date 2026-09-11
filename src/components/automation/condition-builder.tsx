'use client'

import * as React from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export interface Condition {
  id: string
  field: string
  operator: string
  value: string
}

export interface ConditionGroup {
  id: string
  logic: 'AND' | 'OR'
  conditions: Condition[]
}

interface ConditionBuilderProps {
  value: ConditionGroup[]
  onChange: (groups: ConditionGroup[]) => void
}

const FIELDS = [
  { value: 'contact.name', label: 'Contact Name' },
  { value: 'contact.phone', label: 'Contact Phone' },
  { value: 'contact.email', label: 'Contact Email' },
  { value: 'contact.tags', label: 'Contact Tags' },
  { value: 'contact.source', label: 'Contact Source' },
  { value: 'message.text', label: 'Message Text' },
  { value: 'message.type', label: 'Message Type' },
  { value: 'conversation.status', label: 'Conversation Status' },
  { value: 'automation.step', label: 'Automation Step' },
  { value: 'variable', label: 'Custom Variable' },
]

const OPERATORS = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not Equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'not_contains', label: 'Does Not Contain' },
  { value: 'starts_with', label: 'Starts With' },
  { value: 'ends_with', label: 'Ends With' },
  { value: 'greater_than', label: 'Greater Than' },
  { value: 'less_than', label: 'Less Than' },
  { value: 'is_empty', label: 'Is Empty' },
  { value: 'is_not_empty', label: 'Is Not Empty' },
]

function genId(): string {
  return Math.random().toString(36).slice(2, 10)
}

export function ConditionBuilder({ value, onChange }: ConditionBuilderProps) {
  const addGroup = () => {
    onChange([
      ...value,
      {
        id: genId(),
        logic: 'AND',
        conditions: [{ id: genId(), field: '', operator: 'equals', value: '' }],
      },
    ])
  }

  const removeGroup = (groupId: string) => {
    onChange(value.filter((g) => g.id !== groupId))
  }

  const updateGroup = (groupId: string, updates: Partial<ConditionGroup>) => {
    onChange(value.map((g) => (g.id === groupId ? { ...g, ...updates } : g)))
  }

  const addCondition = (groupId: string) => {
    onChange(
      value.map((g) =>
        g.id === groupId
          ? {
              ...g,
              conditions: [
                ...g.conditions,
                { id: genId(), field: '', operator: 'equals', value: '' },
              ],
            }
          : g
      )
    )
  }

  const removeCondition = (groupId: string, condId: string) => {
    onChange(
      value.map((g) =>
        g.id === groupId
          ? { ...g, conditions: g.conditions.filter((c) => c.id !== condId) }
          : g
      )
    )
  }

  const updateCondition = (groupId: string, condId: string, updates: Partial<Condition>) => {
    onChange(
      value.map((g) =>
        g.id === groupId
          ? {
              ...g,
              conditions: g.conditions.map((c) =>
                c.id === condId ? { ...c, ...updates } : c
              ),
            }
          : g
      )
    )
  }

  return (
    <div className="space-y-3">
      {value.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No conditions. The automation will always proceed.
        </p>
      )}

      {value.map((group, gi) => (
        <div key={group.id} className="rounded-lg border p-3">
          <div className="mb-2 flex items-center gap-2">
            {gi > 0 && (
              <div className="flex items-center gap-1">
                <Select
                  value={group.logic}
                  onValueChange={(v: 'AND' | 'OR') => updateGroup(group.id, { logic: v })}
                >
                  <SelectTrigger className="h-7 w-16 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AND">AND</SelectItem>
                    <SelectItem value="OR">OR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {gi === 0 && <span className="text-xs font-medium text-muted-foreground">IF</span>}
            <div className="flex-1" />
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-destructive"
              onClick={() => removeGroup(group.id)}
            >
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </Button>
          </div>

          <div className="space-y-2">
            {group.conditions.map((cond, ci) => (
              <div key={cond.id} className="flex items-start gap-1.5">
                {ci > 0 && (
                  <span className="mt-2 text-[10px] font-medium text-muted-foreground">
                    {group.logic}
                  </span>
                )}
                <Select
                  value={cond.field}
                  onValueChange={(v) => updateCondition(group.id, cond.id, { field: v })}
                >
                  <SelectTrigger className="h-8 flex-1 text-xs">
                    <SelectValue placeholder="Field" />
                  </SelectTrigger>
                  <SelectContent>
                    {FIELDS.map((f) => (
                      <SelectItem key={f.value} value={f.value}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={cond.operator}
                  onValueChange={(v) => updateCondition(group.id, cond.id, { operator: v })}
                >
                  <SelectTrigger className="h-8 w-32 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OPERATORS.map((op) => (
                      <SelectItem key={op.value} value={op.value}>
                        {op.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!['is_empty', 'is_not_empty'].includes(cond.operator) && (
                  <Input
                    value={cond.value}
                    onChange={(e) => updateCondition(group.id, cond.id, { value: e.target.value })}
                    className="h-8 flex-1 text-xs"
                    placeholder="Value"
                  />
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-destructive"
                  onClick={() => removeCondition(group.id, cond.id)}
                >
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </Button>
              </div>
            ))}
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="mt-2 h-7 text-xs"
            onClick={() => addCondition(group.id)}
          >
            + Add Condition
          </Button>
        </div>
      ))}

      <Button variant="outline" size="sm" className="w-full" onClick={addGroup}>
        + Add Condition Group
      </Button>
    </div>
  )
}
