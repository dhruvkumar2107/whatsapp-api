import prisma from '@/lib/prisma'
import { dispatchOutboundMessage } from '@/lib/execution/dispatch'
import { incrementUsage } from '@/lib/usage'
import { renderTemplateVar } from '@/lib/automation/engine'
import type { Chatbot, ChatbotNode, ChatbotEdge, Contact, Conversation } from '@prisma/client'
import type { ExecutionContext } from '@/lib/execution/types'
import { Prisma } from '@prisma/client'

interface ChatbotFlow {
  chatbot: Chatbot
  nodes: ChatbotNode[]
  edges: ChatbotEdge[]
}

function getOutgoingEdges(node: ChatbotNode, edges: ChatbotEdge[]): ChatbotEdge[] {
  return edges.filter((e) => e.sourceNodeId === node.id)
}

function getIncomingText(ctx: { messageText?: string | null; message?: unknown }): string {
  if (ctx.messageText) return ctx.messageText
  if (ctx.message && typeof ctx.message === 'object') {
    const m = ctx.message as { content?: unknown }
    if (typeof m.content === 'string') return m.content
    if (m.content && typeof m.content === 'object') {
      const c = m.content as { text?: string }
      if (typeof c.text === 'string') return c.text
    }
  }
  return ''
}

async function handleNode(
  node: ChatbotNode,
  edges: ChatbotEdge[],
  ctx: ExecutionContext
): Promise<ChatbotNode | null> {
  const data = (node.data ?? {}) as Record<string, unknown>
  const outgoing = getOutgoingEdges(node, edges)

  switch (node.type) {
    case 'START': {
      return null
    }

    case 'END': {
      if (data.endMessage) {
        await dispatchOutboundMessage(
          ctx,
          { type: 'TEXT', text: renderTemplateVar(String(data.endMessage), ctx) },
          { skipUsage: true }
        )
      }
      await prisma.contact.update({
        where: { id: ctx.contact.id },
        data: { pendingChatbotState: Prisma.DbNull },
      }).catch(() => {})
      return null
    }

    case 'MESSAGE':
    case 'TEXT': {
      const text = renderTemplateVar(String(data.content ?? data.text ?? ''), ctx)
      if (text.trim()) {
        await dispatchOutboundMessage(ctx, { type: 'TEXT', text }, { skipUsage: true })
      }
      break
    }

    case 'IMAGE':
    case 'VIDEO':
    case 'DOCUMENT': {
      const url = String(data.url ?? '')
      if (url) {
        await dispatchOutboundMessage(
          ctx,
          {
            type: node.type as 'IMAGE' | 'VIDEO' | 'DOCUMENT',
            mediaUrl: url,
            caption: data.caption ? renderTemplateVar(String(data.caption), ctx) : undefined,
            filename: data.filename ? String(data.filename) : undefined,
          },
          { skipUsage: true }
        )
      }
      break
    }

    case 'BUTTON': {
      const bodyText = renderTemplateVar(String(data.text ?? data.content ?? ''), ctx)
      const buttons = (data.buttons ?? []) as Array<{ text: string }>
      if (buttons.length > 0) {
        await dispatchOutboundMessage(
          ctx,
          {
            type: 'INTERACTIVE',
            text: bodyText,
            interactive: {
              type: 'button',
              body: { text: bodyText },
              action: {
                buttons: buttons.slice(0, 3).map((b: { text: string }, i: number) => ({
                  type: 'reply',
                  reply: { id: `btn_${node.id}_${i}`, title: b.text },
                })),
              },
            },
          },
          { skipUsage: true }
        )
      } else if (bodyText.trim()) {
        await dispatchOutboundMessage(ctx, { type: 'TEXT', text: bodyText }, { skipUsage: true })
      }
      break
    }

    case 'LIST': {
      const bodyText = renderTemplateVar(String(data.text ?? data.content ?? ''), ctx)
      const items = (data.items ?? data.buttons ?? []) as Array<{ text: string }>
      if (items.length > 0) {
        await dispatchOutboundMessage(
          ctx,
          {
            type: 'INTERACTIVE',
            text: bodyText,
            interactive: {
              type: 'list',
              body: { text: bodyText },
              action: {
                button: 'View Options',
                sections: [
                  {
                    title: 'Options',
                    rows: items.map((item: { text: string }, i: number) => ({
                      id: `list_${node.id}_${i}`,
                      title: item.text,
                    })),
                  },
                ],
              },
            },
          },
          { skipUsage: true }
        )
      } else if (bodyText.trim()) {
        await dispatchOutboundMessage(ctx, { type: 'TEXT', text: bodyText }, { skipUsage: true })
      }
      break
    }

    case 'QUESTION': {
      const text = renderTemplateVar(String(data.text ?? ''), ctx)
      if (text.trim()) {
        await dispatchOutboundMessage(ctx, { type: 'TEXT', text }, { skipUsage: true })
      }
      const variable = String(data.variable ?? '').trim()
      await prisma.contact.update({
        where: { id: ctx.contact.id },
        data: {
          pendingChatbotState: {
            chatbotId: ctx.chatbotId,
            currentNodeId: node.id,
            variable: variable || 'user_input',
          },
        },
      })
      return null
    }

    case 'CONDITION': {
      const conditionType = String(data.conditionType ?? 'variable')
      const operator = String(data.operator ?? 'equals')
      const expected = String(data.conditionValue ?? '')
      const incoming = getIncomingText(ctx)
      const variables = ctx.variables

      let actual: string | number | boolean | null = null
      if (conditionType === 'keyword') {
        actual = incoming
      } else if (conditionType === 'tag') {
        const tag = String(data.tagName ?? data.conditionValue ?? '')
        if (tag) {
          const contactTag = await prisma.contactTag.findFirst({
            where: { contactId: ctx.contact.id, tag: { name: tag } },
          })
          actual = contactTag ? 'true' : 'false'
        }
      } else if (conditionType === 'time') {
        actual = new Date().getHours()
      } else {
        const varName = String(data.variable ?? data.variableName ?? data.conditionValue ?? '').trim()
        actual = variables[varName] ?? null
      }

      const a = actual === null || actual === undefined ? '' : String(actual).toLowerCase()
      const e = expected.toLowerCase()
      let result = false
      switch (operator) {
        case 'equals':
          result = a === e
          break
        case 'not_equals':
          result = a !== e
          break
        case 'contains':
          result = a.includes(e)
          break
        case 'not_contains':
          result = !a.includes(e)
          break
        case 'starts_with':
          result = a.startsWith(e)
          break
        case 'greater_than':
          result = Number(a) > Number(e)
          break
        case 'less_than':
          result = Number(a) < Number(e)
          break
      }

      const trueHandle = String(data.trueLabel ?? 'true')
      const falseHandle = String(data.falseLabel ?? 'false')
      const edge = outgoing.find(
        (e) =>
          (result && e.sourceHandle === trueHandle) ||
          (!result && e.sourceHandle === falseHandle) ||
          (result && !e.label)
      ) ?? (result ? outgoing[0] : outgoing[1])

      if (edge) {
        const target = ctx.flowNodes?.find((n) => n.id === edge.targetNodeId)
        return target ?? null
      }
      return null
    }

    case 'DELAY': {
      const value = Number(data.delayValue ?? 0)
      const unit = String(data.delayUnit ?? 'seconds')
      const ms =
        unit === 'minutes'
          ? value * 60 * 1000
          : unit === 'hours'
            ? value * 60 * 60 * 1000
            : unit === 'days'
              ? value * 24 * 60 * 60 * 1000
              : value * 1000
      await new Promise((resolve) => setTimeout(resolve, Math.min(ms, 5 * 60 * 1000)))
      break
    }

    case 'API_CALL': {
      const url = String(data.url ?? '')
      if (url) {
        let headers: Record<string, string> = {}
        try {
          headers = JSON.parse(String(data.headers ?? '{}'))
        } catch {
          headers = {}
        }
        const method = String(data.method ?? 'GET').toUpperCase()
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), 10000)
        try {
          const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json', ...headers },
            body: ['GET', 'HEAD'].includes(method) ? undefined : String(data.body ?? '{}'),
            signal: controller.signal,
          })
          const text = await res.text()
          const responseVar = String(data.responseVariable ?? '').trim()
          if (responseVar) ctx.variables[responseVar] = text.slice(0, 1000)
        } catch {
          /* API call failure continues flow */
        } finally {
          clearTimeout(timer)
        }
      }
      break
    }

    case 'ASSIGN_AGENT': {
      if (ctx.conversation) {
        const method = String(data.assignMethod ?? 'round_robin')
        let agentId: string | null = null
        if (method === 'specific' && data.agentId) {
          const member = await prisma.workspaceMember.findUnique({
            where: {
              workspaceId_userId: { workspaceId: ctx.workspaceId, userId: String(data.agentId) },
            },
          })
          agentId = member ? String(data.agentId) : null
        } else {
          const members = await prisma.workspaceMember.findMany({
            where: { workspaceId: ctx.workspaceId, role: { in: ['OWNER', 'ADMIN', 'MANAGER', 'AGENT'] } },
            include: { user: { select: { id: true } } },
          })
          if (members.length > 0) {
            if (method === 'least_load') {
              const counts = await Promise.all(
                members.map(async (m) => ({
                  m,
                  count: await prisma.conversation.count({ where: { assignedAgentId: m.user.id, status: 'OPEN' } }),
                }))
              )
              counts.sort((a, b) => a.count - b.count)
              agentId = counts[0]?.m.user.id ?? null
            } else {
              const total = await prisma.conversation.count({ where: { assignedAgentId: { not: null } } })
              agentId = members[total % members.length]?.user.id ?? null
            }
          }
        }
        if (agentId) {
          await prisma.conversation.update({
            where: { id: ctx.conversation.id },
            data: { assignedAgentId: agentId, assignedAt: new Date() },
          })
        }
        const transferMessage = String(data.transferMessage ?? '').trim()
        if (transferMessage) {
          await dispatchOutboundMessage(
            ctx,
            { type: 'TEXT', text: renderTemplateVar(transferMessage, ctx) },
            { skipUsage: true }
          )
        }
      }
      break
    }

    case 'ADD_TAG':
    case 'REMOVE_TAG': {
      const tagName = String(data.tagName ?? '').trim().toLowerCase()
      if (tagName) {
        const tag = await prisma.tag.findFirst({ where: { workspaceId: ctx.workspaceId, name: tagName } })
        if (tag) {
          if (node.type === 'ADD_TAG') {
            await prisma.contactTag.upsert({
              where: { contactId_tagId: { contactId: ctx.contact.id, tagId: tag.id } },
              create: { contactId: ctx.contact.id, tagId: tag.id },
              update: {},
            })
            ctx.variables.contactTags = tagName
          } else {
            await prisma.contactTag.deleteMany({ where: { contactId: ctx.contact.id, tagId: tag.id } })
          }
        }
      }
      break
    }

    case 'WEBHOOK': {
      const url = String(data.url ?? '')
      if (url) {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), 10000)
        try {
          await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: String(data.payload ?? '{}'),
            signal: controller.signal,
          })
        } catch {
          /* webhook failure continues flow */
        } finally {
          clearTimeout(timer)
        }
      }
      break
    }

    case 'AI_AGENT': {
      const fallback = String(data.fallbackMessage ?? '')
      if (fallback) {
        await dispatchOutboundMessage(
          ctx,
          { type: 'TEXT', text: renderTemplateVar(fallback, ctx) },
          { skipUsage: true }
        )
      }
      break
    }

    default:
      break
  }

  const edge = outgoing[0]
  if (edge) {
    const target = ctx.flowNodes?.find((n) => n.id === edge.targetNodeId)
    return target ?? null
  }
  return null
}

export async function runChatbotFlow(
  chatbot: ChatbotFlow,
  contact: Contact,
  conversation: Conversation | null,
  message: unknown,
  opts: { startNodeId?: string; initialVariables?: Record<string, string> } = {}
): Promise<void> {
  const startNode = opts.startNodeId
    ? chatbot.nodes.find((n) => n.id === opts.startNodeId) ?? chatbot.nodes.find((n) => n.type === 'START')
    : chatbot.nodes.find((n) => n.type === 'START')
  if (!startNode) return

  const ctx: ExecutionContext = {
    workspaceId: chatbot.chatbot.workspaceId,
    contact,
    conversation,
    messageText: getIncomingText({ message }),
    variables: opts.initialVariables ?? {},
    flowNodes: chatbot.nodes,
    chatbotId: chatbot.chatbot.id,
  }

  await incrementUsage(chatbot.chatbot.workspaceId, { automationsUsed: 1 }).catch(() => {})

  let current: ChatbotNode | null = startNode
  let visited = 0
  const MAX_NODES = 50

  while (current && visited < MAX_NODES) {
    visited++
    const next = await handleNode(current, chatbot.edges, ctx)
    if (!next) break
    if (visited >= MAX_NODES) break
    current = next
  }
}

export async function runChatbotById(
  chatbotId: string,
  workspaceId: string,
  contact: Contact,
  conversation: Conversation | null,
  messageText?: string | null
): Promise<boolean> {
  const chatbotData = await prisma.chatbot.findFirst({
    where: { id: chatbotId, workspaceId, isPublished: true, isActive: true },
    include: { nodes: true, edges: true },
  })
  if (!chatbotData) return false

  await runChatbotFlow(
    {
      chatbot: chatbotData,
      nodes: chatbotData.nodes,
      edges: chatbotData.edges,
    },
    contact,
    conversation,
    messageText
  )
  return true
}

export async function findAndRunChatbot(
  workspaceId: string,
  contact: Contact,
  conversation: Conversation | null,
  messageText?: string | null
): Promise<boolean> {
  const chatbot = await prisma.chatbot.findFirst({
    where: { workspaceId, isPublished: true, isActive: true },
    orderBy: { updatedAt: 'desc' },
    include: { nodes: true, edges: true },
  })
  if (!chatbot) return false

  void runChatbotFlow(
    { chatbot, nodes: chatbot.nodes, edges: chatbot.edges },
    contact,
    conversation,
    messageText
  )
  return true
}

export async function resumeChatbot(
  workspaceId: string,
  contact: Contact,
  conversation: Conversation | null,
  messageText: string
): Promise<boolean> {
  const state = (contact.pendingChatbotState ?? null) as
    | { chatbotId: string; currentNodeId: string; variable: string }
    | null
  if (!state) return false

  const chatbotData = await prisma.chatbot.findFirst({
    where: { id: state.chatbotId, workspaceId, isPublished: true, isActive: true },
    include: { nodes: true, edges: true },
  })
  if (!chatbotData) return false

  const current = chatbotData.nodes.find((n) => n.id === state.currentNodeId)
  if (!current) return false

  const ctx: ExecutionContext = {
    workspaceId,
    contact,
    conversation,
    messageText,
    variables: { [state.variable]: messageText },
    flowNodes: chatbotData.nodes,
    chatbotId: chatbotData.id,
  }
  await prisma.contact.update({
    where: { id: contact.id },
    data: { pendingChatbotState: Prisma.DbNull },
  })

  let current2: ChatbotNode | null = current
  if (current2.type === 'QUESTION') {
    const nextEdge = getOutgoingEdges(current2, chatbotData.edges)[0]
    current2 = nextEdge
      ? chatbotData.nodes.find((n) => n.id === nextEdge.targetNodeId) ?? null
      : null
  }

  let visited = 0
  const MAX_NODES = 50
  while (current2 && visited < MAX_NODES) {
    visited++
    const next = await handleNode(current2, chatbotData.edges, ctx)
    if (!next) break
    if (visited >= MAX_NODES) break
    current2 = next
  }
  return true
}