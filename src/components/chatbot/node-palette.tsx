'use client'

import * as React from 'react'

export type NodeType =
  | 'START'
  | 'MESSAGE'
  | 'TEXT'
  | 'IMAGE'
  | 'VIDEO'
  | 'DOCUMENT'
  | 'BUTTON'
  | 'LIST'
  | 'QUESTION'
  | 'CONDITION'
  | 'DELAY'
  | 'API_CALL'
  | 'ASSIGN_AGENT'
  | 'ADD_TAG'
  | 'REMOVE_TAG'
  | 'WEBHOOK'
  | 'AI_AGENT'
  | 'END'

interface NodeCategory {
  label: string
  types: { type: NodeType; label: string; icon: string }[]
}

const NODE_CATEGORIES: NodeCategory[] = [
  {
    label: 'Flow',
    types: [
      { type: 'START', label: 'Start', icon: 'play' },
      { type: 'END', label: 'End', icon: 'stop' },
    ],
  },
  {
    label: 'Messages',
    types: [
      { type: 'MESSAGE', label: 'Message', icon: 'message-square' },
      { type: 'TEXT', label: 'Text', icon: 'type' },
      { type: 'IMAGE', label: 'Image', icon: 'image' },
      { type: 'VIDEO', label: 'Video', icon: 'video' },
      { type: 'DOCUMENT', label: 'Document', icon: 'file-text' },
    ],
  },
  {
    label: 'Interactive',
    types: [
      { type: 'BUTTON', label: 'Button', icon: 'square' },
      { type: 'LIST', label: 'List', icon: 'list' },
      { type: 'QUESTION', label: 'Question', icon: 'help-circle' },
    ],
  },
  {
    label: 'Logic',
    types: [
      { type: 'CONDITION', label: 'Condition', icon: 'git-branch' },
      { type: 'DELAY', label: 'Delay', icon: 'clock' },
    ],
  },
  {
    label: 'Integration',
    types: [
      { type: 'API_CALL', label: 'API Call', icon: 'globe' },
      { type: 'ASSIGN_AGENT', label: 'Assign Agent', icon: 'user-plus' },
      { type: 'WEBHOOK', label: 'Webhook', icon: 'link' },
      { type: 'AI_AGENT', label: 'AI Agent', icon: 'brain' },
    ],
  },
  {
    label: 'Tags',
    types: [
      { type: 'ADD_TAG', label: 'Add Tag', icon: 'tag' },
      { type: 'REMOVE_TAG', label: 'Remove Tag', icon: 'tag-off' },
    ],
  },
]

const ICON_MAP: Record<string, React.ReactNode> = {
  play: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  ),
  stop: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="6" y="6" width="12" height="12" rx="1" />
    </svg>
  ),
  'message-square': (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
  type: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="4 7 4 4 20 4 20 7" /><line x1="9" y1="20" x2="15" y2="20" /><line x1="12" y1="4" x2="12" y2="20" />
    </svg>
  ),
  image: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </svg>
  ),
  video: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" />
    </svg>
  ),
  'file-text': (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  square: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" />
    </svg>
  ),
  list: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  ),
  'help-circle': (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  'git-branch': (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="6" y1="3" x2="6" y2="15" /><circle cx="18" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M18 9a9 9 0 0 1-9 9" />
    </svg>
  ),
  clock: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  globe: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  ),
  'user-plus': (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" />
    </svg>
  ),
  link: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  ),
  brain: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2z" />
      <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2z" />
    </svg>
  ),
  tag: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  ),
  'tag-off': (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2 2l20 20" /><path d="M8.5 8.5l-.9-.9a2 2 0 0 1-2.83 0L2 6V2h4l2.5 2.5" /><path d="M20.59 13.41l-4.18-4.18" /><path d="M15.59 7.59L20 3.18V2h-1.18l-3.23 3.23" />
    </svg>
  ),
}

const NODE_COLORS: Record<NodeType, string> = {
  START: 'bg-emerald-100 border-emerald-300 text-emerald-700',
  END: 'bg-red-100 border-red-300 text-red-700',
  MESSAGE: 'bg-blue-100 border-blue-300 text-blue-700',
  TEXT: 'bg-blue-50 border-blue-200 text-blue-600',
  IMAGE: 'bg-purple-100 border-purple-300 text-purple-700',
  VIDEO: 'bg-pink-100 border-pink-300 text-pink-700',
  DOCUMENT: 'bg-amber-100 border-amber-300 text-amber-700',
  BUTTON: 'bg-indigo-100 border-indigo-300 text-indigo-700',
  LIST: 'bg-violet-100 border-violet-300 text-violet-700',
  QUESTION: 'bg-cyan-100 border-cyan-300 text-cyan-700',
  CONDITION: 'bg-yellow-100 border-yellow-300 text-yellow-700',
  DELAY: 'bg-orange-100 border-orange-300 text-orange-700',
  API_CALL: 'bg-teal-100 border-teal-300 text-teal-700',
  ASSIGN_AGENT: 'bg-sky-100 border-sky-300 text-sky-700',
  ADD_TAG: 'bg-lime-100 border-lime-300 text-lime-700',
  REMOVE_TAG: 'bg-rose-100 border-rose-300 text-rose-700',
  WEBHOOK: 'bg-fuchsia-100 border-fuchsia-300 text-fuchsia-700',
  AI_AGENT: 'bg-gradient-to-br from-violet-100 to-blue-100 border-violet-300 text-violet-700',
}

export function getNodeColor(type: NodeType): string {
  return NODE_COLORS[type] || 'bg-gray-100 border-gray-300 text-gray-700'
}

interface NodePaletteProps {
  onAddNode?: (type: NodeType) => void
}

export function NodePalette({ onAddNode }: NodePaletteProps) {
  const handleDragStart = (e: React.DragEvent, type: NodeType) => {
    e.dataTransfer.setData('application/chatbot-node-type', type)
    e.dataTransfer.effectAllowed = 'copy'
  }

  return (
    <div className="flex h-full w-56 flex-col border-r bg-background">
      <div className="border-b px-4 py-3">
        <h3 className="text-sm font-semibold">Nodes</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">Drag to canvas</p>
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {NODE_CATEGORIES.map((category) => (
          <div key={category.label} className="mb-3">
            <p className="mb-1.5 px-2 text-xs font-medium uppercase text-muted-foreground">
              {category.label}
            </p>
            <div className="space-y-0.5">
              {category.types.map((nodeType) => (
                <div
                  key={nodeType.type}
                  draggable
                  onDragStart={(e) => handleDragStart(e, nodeType.type)}
                  onClick={() => onAddNode?.(nodeType.type)}
                  className={`flex cursor-grab items-center gap-2.5 rounded-md border px-2.5 py-2 text-xs font-medium transition-colors hover:bg-accent active:cursor-grabbing ${NODE_COLORS[nodeType.type] || ''}`}
                >
                  {ICON_MAP[nodeType.icon]}
                  {nodeType.label}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
