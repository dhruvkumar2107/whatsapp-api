'use client'

import * as React from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { type NodeType } from './node-palette'
import { ScrollArea } from '@/components/ui/scroll-area'

interface NodeEditorProps {
  nodeType: NodeType
  data: Record<string, unknown>
  onUpdate: (data: Record<string, unknown>) => void
  onClose: () => void
  onDelete?: () => void
}

interface ButtonItem {
  id: string
  label: string
  action: string
  targetNodeId?: string
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 10)
}

export function NodeEditor({ nodeType, data, onUpdate, onClose, onDelete }: NodeEditorProps) {
  const update = (key: string, value: unknown) => {
    onUpdate({ ...data, [key]: value })
  }

  return (
    <div className="flex h-full w-72 flex-col border-l bg-background">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold">{nodeType.replace(/_/g, ' ')}</h3>
          <p className="text-xs text-muted-foreground">Node Properties</p>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-4 p-4">
          {(nodeType === 'TEXT' || nodeType === 'MESSAGE') && (
            <>
              <div className="space-y-2">
                <Label>Label</Label>
                <Input
                  value={String(data.label || '')}
                  onChange={(e) => update('label', e.target.value)}
                  placeholder="Node label"
                />
              </div>
              <div className="space-y-2">
                <Label>Content</Label>
                <Textarea
                  value={String(data.content || data.text || '')}
                  onChange={(e) => update('content', e.target.value)}
                  placeholder="Message content. Use {{variable}} for dynamic values."
                  rows={4}
                />
                <p className="text-[10px] text-muted-foreground">
                  Variables: {'{{contact.name}}'}, {'{{contact.phone}}'}, {'{{last_message}}'}
                </p>
              </div>
              {nodeType === 'MESSAGE' && (
                <div className="space-y-2">
                  <Label>Message Type</Label>
                  <Select
                    value={String(data.messageType || 'TEXT')}
                    onValueChange={(v) => update('messageType', v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TEXT">Text</SelectItem>
                      <SelectItem value="IMAGE">Image</SelectItem>
                      <SelectItem value="VIDEO">Video</SelectItem>
                      <SelectItem value="DOCUMENT">Document</SelectItem>
                      <SelectItem value="AUDIO">Audio</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}

          {(nodeType === 'IMAGE' || nodeType === 'VIDEO' || nodeType === 'DOCUMENT') && (
            <>
              <div className="space-y-2">
                <Label>Media URL</Label>
                <Input
                  value={String(data.url || '')}
                  onChange={(e) => update('url', e.target.value)}
                  placeholder="https://example.com/media.png"
                />
              </div>
              <div className="space-y-2">
                <Label>Caption</Label>
                <Textarea
                  value={String(data.caption || '')}
                  onChange={(e) => update('caption', e.target.value)}
                  placeholder="Optional caption"
                  rows={2}
                />
              </div>
              {nodeType === 'DOCUMENT' && (
                <div className="space-y-2">
                  <Label>Filename</Label>
                  <Input
                    value={String(data.filename || '')}
                    onChange={(e) => update('filename', e.target.value)}
                    placeholder="document.pdf"
                  />
                </div>
              )}
            </>
          )}

          {nodeType === 'BUTTON' && (
            <>
              <div className="space-y-2">
                <Label>Body Text</Label>
                <Textarea
                  value={String(data.text || '')}
                  onChange={(e) => update('text', e.target.value)}
                  placeholder="Message body with buttons"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Buttons</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      const buttons = (data.buttons as ButtonItem[]) || []
                      update('buttons', [...buttons, { id: generateId(), label: '', action: 'reply' }])
                    }}
                  >
                    + Add
                  </Button>
                </div>
                {((data.buttons as ButtonItem[]) || []).map((btn, i) => (
                  <div key={btn.id} className="space-y-1 rounded border p-2">
                    <Input
                      value={btn.label}
                      onChange={(e) => {
                        const buttons = [...((data.buttons as ButtonItem[]) || [])]
                        buttons[i] = { ...buttons[i], label: e.target.value }
                        update('buttons', buttons)
                      }}
                      placeholder="Button label"
                    />
                    <Select
                      value={btn.action}
                      onValueChange={(v) => {
                        const buttons = [...((data.buttons as ButtonItem[]) || [])]
                        buttons[i] = { ...buttons[i], action: v }
                        update('buttons', buttons)
                      }}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="reply">Quick Reply</SelectItem>
                        <SelectItem value="url">Open URL</SelectItem>
                        <SelectItem value="phone">Call Phone</SelectItem>
                      </SelectContent>
                    </Select>
                    {btn.action === 'url' && (
                      <Input
                        value={btn.targetNodeId || ''}
                        onChange={(e) => {
                          const buttons = [...((data.buttons as ButtonItem[]) || [])]
                          buttons[i] = { ...buttons[i], targetNodeId: e.target.value }
                          update('buttons', buttons)
                        }}
                        placeholder="https://..."
                      />
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-full text-xs text-destructive"
                      onClick={() => {
                        const buttons = ((data.buttons as ButtonItem[]) || []).filter((_, j) => j !== i)
                        update('buttons', buttons)
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            </>
          )}

          {nodeType === 'LIST' && (
            <>
              <div className="space-y-2">
                <Label>Body Text</Label>
                <Textarea
                  value={String(data.text || '')}
                  onChange={(e) => update('text', e.target.value)}
                  placeholder="List message body"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Button Text</Label>
                <Input
                  value={String(data.buttonText || 'View Options')}
                  onChange={(e) => update('buttonText', e.target.value)}
                  placeholder="View Options"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Sections</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      const sections = (data.sections as Array<{ title: string; rows: Array<{ id: string; title: string; description: string }> }>) || []
                      update('sections', [...sections, { title: '', rows: [{ id: generateId(), title: '', description: '' }] }])
                    }}
                  >
                    + Add
                  </Button>
                </div>
                {((data.sections as Array<{ title: string; rows: Array<{ id: string; title: string; description: string }> }>) || []).map((section, si) => (
                  <div key={si} className="space-y-1 rounded border p-2">
                    <Input
                      value={section.title}
                      onChange={(e) => {
                        const sections = [...((data.sections as Array<{ title: string; rows: Array<{ id: string; title: string; description: string }> }>) || [])]
                        sections[si] = { ...sections[si], title: e.target.value }
                        update('sections', sections)
                      }}
                      placeholder="Section title"
                    />
                    {section.rows.map((row, ri) => (
                      <div key={row.id} className="ml-2 space-y-1 border-l-2 pl-2">
                        <Input
                          value={row.title}
                          onChange={(e) => {
                            const sections = [...((data.sections as Array<{ title: string; rows: Array<{ id: string; title: string; description: string }> }>) || [])]
                            const rows = [...sections[si].rows]
                            rows[ri] = { ...rows[ri], title: e.target.value }
                            sections[si] = { ...sections[si], rows }
                            update('sections', sections)
                          }}
                          placeholder="Row title"
                          className="h-7 text-xs"
                        />
                        <Input
                          value={row.description}
                          onChange={(e) => {
                            const sections = [...((data.sections as Array<{ title: string; rows: Array<{ id: string; title: string; description: string }> }>) || [])]
                            const rows = [...sections[si].rows]
                            rows[ri] = { ...rows[ri], description: e.target.value }
                            sections[si] = { ...sections[si], rows }
                            update('sections', sections)
                          }}
                          placeholder="Description (optional)"
                          className="h-7 text-xs"
                        />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </>
          )}

          {nodeType === 'QUESTION' && (
            <>
              <div className="space-y-2">
                <Label>Question Text</Label>
                <Textarea
                  value={String(data.text || '')}
                  onChange={(e) => update('text', e.target.value)}
                  placeholder="Ask the user a question"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Expected Answer Type</Label>
                <Select
                  value={String(data.answerType || 'text')}
                  onValueChange={(v) => update('answerType', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Free Text</SelectItem>
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="phone">Phone</SelectItem>
                    <SelectItem value="option">Option (Button)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Store Answer in Variable</Label>
                <Input
                  value={String(data.variable || '')}
                  onChange={(e) => update('variable', e.target.value)}
                  placeholder="e.g. user_name"
                />
              </div>
            </>
          )}

          {nodeType === 'CONDITION' && (
            <>
              <div className="space-y-2">
                <Label>Condition Type</Label>
                <Select
                  value={String(data.conditionType || 'variable')}
                  onValueChange={(v) => update('conditionType', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="variable">Variable Check</SelectItem>
                    <SelectItem value="keyword">Keyword Match</SelectItem>
                    <SelectItem value="tag">Has Tag</SelectItem>
                    <SelectItem value="time">Time of Day</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Operator</Label>
                <Select
                  value={String(data.operator || 'equals')}
                  onValueChange={(v) => update('operator', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="equals">Equals</SelectItem>
                    <SelectItem value="not_equals">Not Equals</SelectItem>
                    <SelectItem value="contains">Contains</SelectItem>
                    <SelectItem value="not_contains">Does Not Contain</SelectItem>
                    <SelectItem value="starts_with">Starts With</SelectItem>
                    <SelectItem value="greater_than">Greater Than</SelectItem>
                    <SelectItem value="less_than">Less Than</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Value</Label>
                <Input
                  value={String(data.conditionValue || '')}
                  onChange={(e) => update('conditionValue', e.target.value)}
                  placeholder="Value to compare"
                />
              </div>
              <div className="space-y-2">
                <Label>True Branch Label</Label>
                <Input
                  value={String(data.trueLabel || 'Yes')}
                  onChange={(e) => update('trueLabel', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>False Branch Label</Label>
                <Input
                  value={String(data.falseLabel || 'No')}
                  onChange={(e) => update('falseLabel', e.target.value)}
                />
              </div>
            </>
          )}

          {nodeType === 'DELAY' && (
            <>
              <div className="space-y-2">
                <Label>Delay Duration</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={String(data.delayValue || 5)}
                    onChange={(e) => update('delayValue', Number(e.target.value))}
                    className="flex-1"
                    min={0}
                  />
                  <Select
                    value={String(data.delayUnit || 'seconds')}
                    onValueChange={(v) => update('delayUnit', v)}
                  >
                    <SelectTrigger className="w-28">
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
            </>
          )}

          {nodeType === 'API_CALL' && (
            <>
              <div className="space-y-2">
                <Label>URL</Label>
                <Input
                  value={String(data.url || '')}
                  onChange={(e) => update('url', e.target.value)}
                  placeholder="https://api.example.com/endpoint"
                />
              </div>
              <div className="space-y-2">
                <Label>Method</Label>
                <Select
                  value={String(data.method || 'GET')}
                  onValueChange={(v) => update('method', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GET">GET</SelectItem>
                    <SelectItem value="POST">POST</SelectItem>
                    <SelectItem value="PUT">PUT</SelectItem>
                    <SelectItem value="PATCH">PATCH</SelectItem>
                    <SelectItem value="DELETE">DELETE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Headers (JSON)</Label>
                <Textarea
                  value={String(data.headers || '{}')}
                  onChange={(e) => update('headers', e.target.value)}
                  placeholder='{"Authorization": "Bearer token"}'
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Body (JSON)</Label>
                <Textarea
                  value={String(data.body || '{}')}
                  onChange={(e) => update('body', e.target.value)}
                  placeholder='{"key": "value"}'
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Store Response in Variable</Label>
                <Input
                  value={String(data.responseVariable || '')}
                  onChange={(e) => update('responseVariable', e.target.value)}
                  placeholder="e.g. api_response"
                />
              </div>
            </>
          )}

          {nodeType === 'ASSIGN_AGENT' && (
            <>
              <div className="space-y-2">
                <Label>Assignment Method</Label>
                <Select
                  value={String(data.assignMethod || 'round_robin')}
                  onValueChange={(v) => update('assignMethod', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="round_robin">Round Robin</SelectItem>
                    <SelectItem value="least_load">Least Load</SelectItem>
                    <SelectItem value="specific">Specific Agent</SelectItem>
                    <SelectItem value="skill_based">Skill Based</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {data.assignMethod === 'specific' && (
                <div className="space-y-2">
                  <Label>Agent ID</Label>
                  <Input
                    value={String(data.agentId || '')}
                    onChange={(e) => update('agentId', e.target.value)}
                    placeholder="Agent user ID"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label>Transfer Message</Label>
                <Textarea
                  value={String(data.transferMessage || 'Connecting you to an agent...')}
                  onChange={(e) => update('transferMessage', e.target.value)}
                  rows={2}
                />
              </div>
            </>
          )}

          {(nodeType === 'ADD_TAG' || nodeType === 'REMOVE_TAG') && (
            <>
              <div className="space-y-2">
                <Label>Tag Name</Label>
                <Input
                  value={String(data.tagName || '')}
                  onChange={(e) => update('tagName', e.target.value)}
                  placeholder="e.g. vip-customer"
                />
              </div>
            </>
          )}

          {nodeType === 'WEBHOOK' && (
            <>
              <div className="space-y-2">
                <Label>Webhook URL</Label>
                <Input
                  value={String(data.url || '')}
                  onChange={(e) => update('url', e.target.value)}
                  placeholder="https://hooks.example.com/..."
                />
              </div>
              <div className="space-y-2">
                <Label>Payload (JSON)</Label>
                <Textarea
                  value={String(data.payload || '{}')}
                  onChange={(e) => update('payload', e.target.value)}
                  placeholder='{"event": "chatbot_action"}'
                  rows={4}
                />
              </div>
            </>
          )}

          {nodeType === 'AI_AGENT' && (
            <>
              <div className="space-y-2">
                <Label>System Prompt</Label>
                <Textarea
                  value={String(data.systemPrompt || '')}
                  onChange={(e) => update('systemPrompt', e.target.value)}
                  placeholder="Instructions for the AI agent..."
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label>Model</Label>
                <Select
                  value={String(data.model || 'gpt-4o-mini')}
                  onValueChange={(v) => update('model', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                    <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                    <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Max Tokens</Label>
                <Input
                  type="number"
                  value={String(data.maxTokens || 500)}
                  onChange={(e) => update('maxTokens', Number(e.target.value))}
                  min={50}
                  max={4000}
                />
              </div>
              <div className="space-y-2">
                <Label>Fallback Message</Label>
                <Textarea
                  value={String(data.fallbackMessage || '')}
                  onChange={(e) => update('fallbackMessage', e.target.value)}
                  placeholder="If AI cannot respond..."
                  rows={2}
                />
              </div>
            </>
          )}

          {nodeType === 'START' && (
            <div className="space-y-2">
              <Label>Start Label</Label>
              <Input
                value={String(data.label || 'Entry Point')}
                onChange={(e) => update('label', e.target.value)}
              />
            </div>
          )}

          {nodeType === 'END' && (
            <div className="space-y-2">
              <Label>End Label</Label>
              <Input
                value={String(data.label || 'End')}
                onChange={(e) => update('label', e.target.value)}
              />
              <div className="space-y-2">
                <Label>End Message (optional)</Label>
                <Textarea
                  value={String(data.endMessage || '')}
                  onChange={(e) => update('endMessage', e.target.value)}
                  placeholder="Goodbye message"
                  rows={2}
                />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="border-t p-4">
        {onDelete && (
          <Button variant="destructive" size="sm" className="w-full" onClick={onDelete}>
            Delete Node
          </Button>
        )}
      </div>
    </div>
  )
}
