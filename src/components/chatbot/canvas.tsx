'use client'

import * as React from 'react'
import { getNodeColor, type NodeType } from './node-palette'
import { cn } from '@/lib/utils'

export interface CanvasNode {
  id: string
  type: NodeType
  position: { x: number; y: number }
  data: Record<string, unknown>
  label?: string
}

export interface CanvasEdge {
  id: string
  sourceNodeId: string
  targetNodeId: string
  label?: string | null
}

interface CanvasProps {
  nodes: CanvasNode[]
  edges: CanvasEdge[]
  selectedNodeId: string | null
  selectedEdgeId: string | null
  onSelectNode: (nodeId: string | null) => void
  onSelectEdge: (edgeId: string | null) => void
  onMoveNode: (nodeId: string, position: { x: number; y: number }) => void
  onDropNode?: (type: NodeType, position: { x: number; y: number }) => void
  onDeleteSelected?: () => void
  onConnect?: (sourceId: string, targetId: string) => void
}

const NODE_WIDTH = 180
const NODE_HEIGHT = 60

function getNodeLabel(type: NodeType, data: Record<string, unknown>): string {
  const d = data as { label?: string; content?: string; text?: string; name?: string }
  if (d.label) return d.label
  if (d.content) return String(d.content).slice(0, 30)
  if (d.text) return String(d.text).slice(0, 30)
  if (d.name) return String(d.name).slice(0, 30)
  return type.replace(/_/g, ' ')
}

export function Canvas({
  nodes,
  edges,
  selectedNodeId,
  selectedEdgeId,
  onSelectNode,
  onSelectEdge,
  onMoveNode,
  onDropNode,
  onDeleteSelected,
  onConnect,
}: CanvasProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = React.useState(1)
  const [pan, setPan] = React.useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = React.useState(false)
  const [panStart, setPanStart] = React.useState({ x: 0, y: 0 })
  const [draggingNodeId, setDraggingNodeId] = React.useState<string | null>(null)
  const [dragOffset, setDragOffset] = React.useState({ x: 0, y: 0 })
  const [connectingFrom, setConnectingFrom] = React.useState<string | null>(null)
  const [mousePos, setMousePos] = React.useState({ x: 0, y: 0 })

  const screenToCanvas = React.useCallback(
    (sx: number, sy: number) => {
      return {
        x: (sx - pan.x) / zoom,
        y: (sy - pan.y) / zoom,
      }
    },
    [zoom, pan]
  )

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.target === containerRef.current || (e.target as HTMLElement).tagName === 'svg') {
      onSelectNode(null)
      onSelectEdge(null)
      if (e.button === 0) {
        setIsPanning(true)
        setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
      }
    }
  }

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      })
    }

    if (draggingNodeId) {
      const canvasPos = screenToCanvas(e.clientX, e.clientY)
      onMoveNode(draggingNodeId, {
        x: canvasPos.x - dragOffset.x,
        y: canvasPos.y - dragOffset.y,
      })
    }

    if (connectingFrom) {
      const rect = containerRef.current?.getBoundingClientRect()
      if (rect) {
        setMousePos({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        })
      }
    }
  }

  const handleCanvasMouseUp = () => {
    setIsPanning(false)
    setDraggingNodeId(null)
    setConnectingFrom(null)
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    const newZoom = Math.min(3, Math.max(0.1, zoom * delta))

    const rect = containerRef.current?.getBoundingClientRect()
    if (rect) {
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      setPan({
        x: mx - (mx - pan.x) * (newZoom / zoom),
        y: my - (my - pan.y) * (newZoom / zoom),
      })
    }

    setZoom(newZoom)
  }

  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation()
    onSelectNode(nodeId)
    onSelectEdge(null)

    const canvasPos = screenToCanvas(e.clientX, e.clientY)
    const node = nodes.find((n) => n.id === nodeId)
    if (node) {
      setDragOffset({
        x: canvasPos.x - node.position.x,
        y: canvasPos.y - node.position.y,
      })
      setDraggingNodeId(nodeId)
    }
  }

  const handlePortMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation()
    setConnectingFrom(nodeId)
  }

  const handlePortMouseUp = (e: React.MouseEvent, targetId: string) => {
    e.stopPropagation()
    if (connectingFrom && connectingFrom !== targetId) {
      onConnect?.(connectingFrom, targetId)
    }
    setConnectingFrom(null)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const type = e.dataTransfer.getData('application/chatbot-node-type') as NodeType
    if (!type || !onDropNode) return

    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return

    const canvasPos = screenToCanvas(e.clientX - rect.left, e.clientY - rect.top)
    onDropNode(type, {
      x: canvasPos.x - NODE_WIDTH / 2,
      y: canvasPos.y - NODE_HEIGHT / 2,
    })
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && (selectedNodeId || selectedEdgeId)) {
        if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') {
          return
        }
        onDeleteSelected?.()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedNodeId, selectedEdgeId, onDeleteSelected])

  const getNodePortPosition = (nodeId: string, side: 'top' | 'bottom' | 'left' | 'right') => {
    const node = nodes.find((n) => n.id === nodeId)
    if (!node) return { x: 0, y: 0 }

    switch (side) {
      case 'top':
        return { x: node.position.x + NODE_WIDTH / 2, y: node.position.y }
      case 'bottom':
        return { x: node.position.x + NODE_WIDTH / 2, y: node.position.y + NODE_HEIGHT }
      case 'left':
        return { x: node.position.x, y: node.position.y + NODE_HEIGHT / 2 }
      case 'right':
        return { x: node.position.x + NODE_WIDTH, y: node.position.y + NODE_HEIGHT / 2 }
    }
  }

  return (
    <div
      ref={containerRef}
      className="relative flex-1 overflow-hidden bg-zinc-50 dark:bg-zinc-950"
      style={{ cursor: isPanning ? 'grabbing' : connectingFrom ? 'crosshair' : 'default' }}
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleCanvasMouseMove}
      onMouseUp={handleCanvasMouseUp}
      onWheel={handleWheel}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <svg className="pointer-events-none absolute inset-0 z-10 h-full w-full">
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" className="fill-zinc-400" />
          </marker>
        </defs>
        <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
          {edges.map((edge) => {
            const sourcePos = getNodePortPosition(edge.sourceNodeId, 'bottom')
            const targetPos = getNodePortPosition(edge.targetNodeId, 'top')
            const midY = (sourcePos.y + targetPos.y) / 2

            const isSelected = selectedEdgeId === edge.id
            const cx1 = sourcePos.x
            const cy1 = sourcePos.y + Math.abs(midY - sourcePos.y) * 0.5
            const cx2 = targetPos.x
            const cy2 = targetPos.y - Math.abs(targetPos.y - midY) * 0.5

            return (
              <g key={edge.id}>
                <path
                  d={`M ${sourcePos.x} ${sourcePos.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${targetPos.x} ${targetPos.y}`}
                  fill="none"
                  stroke={isSelected ? '#3b82f6' : '#a1a1aa'}
                  strokeWidth={isSelected ? 3 : 2}
                  className="pointer-events-auto cursor-pointer transition-colors"
                  markerEnd="url(#arrowhead)"
                  onClick={(e) => {
                    e.stopPropagation()
                    onSelectEdge(edge.id)
                    onSelectNode(null)
                  }}
                />
                {edge.label && (
                  <text
                    x={(sourcePos.x + targetPos.x) / 2}
                    y={(sourcePos.y + targetPos.y) / 2 - 8}
                    textAnchor="middle"
                    className="pointer-events-none fill-zinc-500 text-[10px]"
                  >
                    {edge.label}
                  </text>
                )}
              </g>
            )
          })}

          {connectingFrom && (
            <line
              x1={getNodePortPosition(connectingFrom, 'bottom').x}
              y1={getNodePortPosition(connectingFrom, 'bottom').y}
              x2={(mousePos.x - pan.x) / zoom}
              y2={(mousePos.y - pan.y) / zoom}
              stroke="#3b82f6"
              strokeWidth={2}
              strokeDasharray="6 3"
            />
          )}
        </g>
      </svg>

      <div
        className="pointer-events-none absolute inset-0 z-20"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
        }}
      >
        {nodes.map((node) => {
          const isSelected = selectedNodeId === node.id
          const colorClass = getNodeColor(node.type)

          return (
            <div
              key={node.id}
              className={cn(
                'pointer-events-auto absolute flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 shadow-sm transition-shadow',
                colorClass,
                isSelected && 'ring-2 ring-blue-500 ring-offset-2',
                'hover:shadow-md'
              )}
              style={{
                left: node.position.x,
                top: node.position.y,
                width: NODE_WIDTH,
                height: NODE_HEIGHT,
              }}
              onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">
                {node.type.replace(/_/g, ' ')}
              </span>
              <span className="mt-0.5 max-w-[160px] truncate text-xs font-medium">
                {getNodeLabel(node.type, (node.data as Record<string, unknown>) || {})}
              </span>

              {node.type !== 'START' && (
                <div
                  className="absolute -top-2 left-1/2 h-4 w-4 -translate-x-1/2 cursor-crosshair rounded-full border-2 border-current bg-white transition-colors hover:bg-blue-100"
                  onMouseDown={(e) => handlePortMouseDown(e, node.id)}
                  onMouseUp={(e) => handlePortMouseUp(e, node.id)}
                  title="Connect to another node"
                />
              )}

              {node.type !== 'END' && (
                <div
                  className="absolute -bottom-2 left-1/2 h-4 w-4 -translate-x-1/2 rounded-full border-2 border-current bg-white"
                />
              )}
            </div>
          )
        })}
      </div>

      <div className="absolute bottom-4 left-4 z-30 flex items-center gap-2 rounded-lg border bg-background p-1 shadow-sm">
        <button
          className="flex h-7 w-7 items-center justify-center rounded text-xs font-bold hover:bg-accent"
          onClick={() => setZoom((z) => Math.min(3, z * 1.2))}
        >
          +
        </button>
        <span className="min-w-[40px] text-center text-xs text-muted-foreground">
          {Math.round(zoom * 100)}%
        </span>
        <button
          className="flex h-7 w-7 items-center justify-center rounded text-xs font-bold hover:bg-accent"
          onClick={() => setZoom((z) => Math.max(0.1, z * 0.8))}
        >
          -
        </button>
        <div className="mx-1 h-4 w-px bg-border" />
        <button
          className="flex h-7 items-center rounded px-2 text-xs text-muted-foreground hover:bg-accent"
          onClick={() => {
            setZoom(1)
            setPan({ x: 0, y: 0 })
          }}
        >
          Reset
        </button>
      </div>

      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <p className="text-sm font-medium text-muted-foreground">
              Drop nodes here to build your chatbot flow
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Drag from the palette or click a node type to add it
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
