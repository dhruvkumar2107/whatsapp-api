'use client'

import * as React from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  ArrowLeft,
  Save,
  Globe,
  GlobeOff,
  Loader2,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { NodePalette, type NodeType } from '@/components/chatbot/node-palette'
import { Canvas, type CanvasNode, type CanvasEdge } from '@/components/chatbot/canvas'
import { NodeEditor } from '@/components/chatbot/node-editor'

interface ChatbotData {
  id: string
  name: string
  description: string | null
  isActive: boolean
  isPublished: boolean
  version: number
  nodes: Array<{
    id: string
    type: string
    position: { x: number; y: number } | null
    data: Record<string, unknown> | null
  }>
  edges: Array<{
    id: string
    sourceNodeId: string
    targetNodeId: string
    label: string | null
    sourceHandle: string | null
    targetHandle: string | null
  }>
}

export default function ChatbotEditorPage() {
  const router = useRouter()
  const params = useParams()
  const chatbotId = params.id as string

  const [chatbot, setChatbot] = React.useState<ChatbotData | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [publishing, setPublishing] = React.useState(false)
  const [selectedNodeId, setSelectedNodeId] = React.useState<string | null>(null)
  const [selectedEdgeId, setSelectedEdgeId] = React.useState<string | null>(null)
  const [nameDialogOpen, setNameDialogOpen] = React.useState(false)
  const [newName, setNewName] = React.useState('')
  const [hasChanges, setHasChanges] = React.useState(false)

  React.useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/chatbots/${chatbotId}`)
        const body = await res.json()
        if (body.success && body.data) {
          setChatbot(body.data)
          setNewName(body.data.name)
        }
      } catch {
        console.error('Failed to load chatbot')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [chatbotId])

  const nodes: CanvasNode[] = React.useMemo(() => {
    if (!chatbot) return []
    return chatbot.nodes.map((n) => ({
      id: n.id,
      type: n.type as NodeType,
      position: n.position || { x: 0, y: 0 },
      data: n.data || {},
    }))
  }, [chatbot])

  const edges: CanvasEdge[] = React.useMemo(() => {
    if (!chatbot) return []
    return chatbot.edges.map((e) => ({
      id: e.id,
      sourceNodeId: e.sourceNodeId,
      targetNodeId: e.targetNodeId,
      label: e.label,
    }))
  }, [chatbot])

  const selectedNode = selectedNodeId
    ? chatbot?.nodes.find((n) => n.id === selectedNodeId)
    : null

  const handleDropNode = async (type: NodeType, position: { x: number; y: number }) => {
    try {
      const res = await fetch(`/api/chatbots/${chatbotId}/nodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, position, data: {} }),
      })
      const body = await res.json()
      if (body.success && chatbot) {
        setChatbot({
          ...chatbot,
          nodes: [...chatbot.nodes, body.data],
        })
        setHasChanges(true)
      }
    } catch {
      console.error('Failed to add node')
    }
  }

  const handleAddNodeFromPalette = (type: NodeType) => {
    const x = 100 + Math.random() * 400
    const y = 100 + Math.random() * 300
    handleDropNode(type, { x, y })
  }

  const handleMoveNode = (nodeId: string, position: { x: number; y: number }) => {
    if (!chatbot) return
    setChatbot({
      ...chatbot,
      nodes: chatbot.nodes.map((n) =>
        n.id === nodeId ? { ...n, position } : n
      ),
    })
    setHasChanges(true)
  }

  const handleSelectNode = (nodeId: string | null) => {
    setSelectedNodeId(nodeId)
    setSelectedEdgeId(null)
  }

  const handleSelectEdge = (edgeId: string | null) => {
    setSelectedEdgeId(edgeId)
    setSelectedNodeId(null)
  }

  const handleUpdateNodeData = async (data: Record<string, unknown>) => {
    if (!selectedNodeId || !chatbot) return
    setChatbot({
      ...chatbot,
      nodes: chatbot.nodes.map((n) =>
        n.id === selectedNodeId ? { ...n, data } : n
      ),
    })
    setHasChanges(true)
  }

  const handleDeleteNode = async () => {
    if (!selectedNodeId || !chatbot) return
    try {
      await fetch(`/api/chatbots/${chatbotId}/nodes/${selectedNodeId}`, {
        method: 'DELETE',
      })
      setChatbot({
        ...chatbot,
        nodes: chatbot.nodes.filter((n) => n.id !== selectedNodeId),
        edges: chatbot.edges.filter(
          (e) => e.sourceNodeId !== selectedNodeId && e.targetNodeId !== selectedNodeId
        ),
      })
      setSelectedNodeId(null)
      setHasChanges(true)
    } catch {
      console.error('Failed to delete node')
    }
  }

  const handleDeleteEdge = async () => {
    if (!selectedEdgeId || !chatbot) return
    try {
      await fetch(`/api/chatbots/${chatbotId}/edges/${selectedEdgeId}`, {
        method: 'DELETE',
      })
      setChatbot({
        ...chatbot,
        edges: chatbot.edges.filter((e) => e.id !== selectedEdgeId),
      })
      setSelectedEdgeId(null)
      setHasChanges(true)
    } catch {
      console.error('Failed to delete edge')
    }
  }

  const handleDeleteSelected = () => {
    if (selectedNodeId) handleDeleteNode()
    else if (selectedEdgeId) handleDeleteEdge()
  }

  const handleConnect = async (sourceId: string, targetId: string) => {
    if (!chatbot) return
    const exists = chatbot.edges.some(
      (e) => e.sourceNodeId === sourceId && e.targetNodeId === targetId
    )
    if (exists) return

    try {
      const res = await fetch(`/api/chatbots/${chatbotId}/edges`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceNodeId: sourceId, targetNodeId: targetId }),
      })
      const body = await res.json()
      if (body.success && chatbot) {
        setChatbot({
          ...chatbot,
          edges: [...chatbot.edges, body.data],
        })
        setHasChanges(true)
      }
    } catch {
      console.error('Failed to add edge')
    }
  }

  const handleSave = async () => {
    if (!chatbot) return
    setSaving(true)
    try {
      for (const node of chatbot.nodes) {
        await fetch(`/api/chatbots/${chatbotId}/nodes/${node.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ position: node.position, data: node.data }),
        })
      }
      if (chatbot.name !== newName) {
        await fetch(`/api/chatbots/${chatbotId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newName }),
        })
        setChatbot({ ...chatbot, name: newName })
      }
      setHasChanges(false)
    } catch {
      console.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handlePublish = async () => {
    setPublishing(true)
    try {
      const res = await fetch(`/api/chatbots/${chatbotId}/publish`, {
        method: 'POST',
      })
      const body = await res.json()
      if (body.success && chatbot) {
        setChatbot({
          ...chatbot,
          isPublished: true,
          isActive: true,
          version: body.data.version,
        })
      } else {
        alert(body.error?.message || 'Failed to publish')
      }
    } catch {
      console.error('Failed to publish')
    } finally {
      setPublishing(false)
    }
  }

  const handleUnpublish = async () => {
    setPublishing(true)
    try {
      const res = await fetch(`/api/chatbots/${chatbotId}/unpublish`, {
        method: 'POST',
      })
      const body = await res.json()
      if (body.success && chatbot) {
        setChatbot({
          ...chatbot,
          isPublished: false,
          isActive: false,
        })
      }
    } catch {
      console.error('Failed to unpublish')
    } finally {
      setPublishing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!chatbot) {
    return (
      <div className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center gap-4">
        <p className="text-lg font-semibold">Chatbot not found</p>
        <Button variant="outline" onClick={() => router.push('/chatbot')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Chatbots
        </Button>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <div className="flex items-center gap-3 border-b bg-background px-4 py-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => router.push('/chatbot')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2">
          <h1
            className="cursor-pointer text-sm font-semibold hover:underline"
            onClick={() => setNameDialogOpen(true)}
          >
            {chatbot.name}
          </h1>
          <Badge variant={chatbot.isPublished ? 'default' : 'secondary'}>
            {chatbot.isPublished ? 'Published' : 'Draft'}
          </Badge>
          <Badge variant={chatbot.isActive ? 'success' : 'outline'}>
            {chatbot.isActive ? 'Active' : 'Inactive'}
          </Badge>
          <span className="text-xs text-muted-foreground">v{chatbot.version}</span>
        </div>

        <div className="flex-1" />

        {hasChanges && (
          <Badge variant="warning" className="text-xs">
            Unsaved changes
          </Badge>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
          Save
        </Button>

        {chatbot.isPublished ? (
          <Button
            variant="outline"
            size="sm"
            onClick={handleUnpublish}
            disabled={publishing}
          >
            {publishing ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <GlobeOff className="mr-1.5 h-3.5 w-3.5" />}
            Unpublish
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={handlePublish}
            disabled={publishing}
          >
            {publishing ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Globe className="mr-1.5 h-3.5 w-3.5" />}
            Publish
          </Button>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        <NodePalette onAddNode={handleAddNodeFromPalette} />

        <Canvas
          nodes={nodes}
          edges={edges}
          selectedNodeId={selectedNodeId}
          selectedEdgeId={selectedEdgeId}
          onSelectNode={handleSelectNode}
          onSelectEdge={handleSelectEdge}
          onMoveNode={handleMoveNode}
          onDropNode={handleDropNode}
          onDeleteSelected={handleDeleteSelected}
          onConnect={handleConnect}
        />

        {selectedNode && (
          <NodeEditor
            nodeType={selectedNode.type as NodeType}
            data={(selectedNode.data as Record<string, unknown>) || {}}
            onUpdate={handleUpdateNodeData}
            onClose={() => setSelectedNodeId(null)}
            onDelete={handleDeleteNode}
          />
        )}
      </div>

      <Dialog open={nameDialogOpen} onOpenChange={setNameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Chatbot</DialogTitle>
          </DialogHeader>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Chatbot name"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNameDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setNameDialogOpen(false)
                setHasChanges(true)
              }}
            >
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
