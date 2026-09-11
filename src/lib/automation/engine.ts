import prisma from '@/lib/prisma'
import { dispatchOutboundMessage } from '@/lib/execution/dispatch'
import { incrementUsage, checkAndFailUsageLimit } from '@/lib/usage'
import { createAuditLog } from '@/lib/audit'
import { runChatbotById } from '@/lib/chatbot/engine'
import type { Automation, Contact } from '@prisma/client'
import type { ExecutionContext } from '@/lib/execution/types'

export interface TriggerContext {
  type: string
  contact?: Contact | null
  messageText?: string | null
  campaignId?: string | null
  tagName?: string | null
  variables?: Record<string, string | number | boolean | null>
}

export function renderTemplateVar(
  text: string,
  ctx: ExecutionContext
): string {
  const tokens: Record<string, string | number | boolean | null | undefined> = {
    'contact.name': ctx.contact.name,
    'contact.phone': ctx.contact.phone,
    'contact.email': ctx.contact.email,
    'contact.source': ctx.contact.source,
    'last_message': ctx.messageText ?? '',
    ...ctx.variables,
  }
  return text.replace(/\{\{\s*([^}]+)\s*\}\}/g, (_m, key: string) => {
    const value = tokens[key.trim()] as string | number | boolean | null | undefined
    return value === null || value === undefined ? '' : String(value)
  })
}

export function evaluateConditions(
  groups: Array<{ logic: 'AND' | 'OR'; conditions: Array<{ field: string; operator: string; value: string }> }> | null | undefined,
  ctx: ExecutionContext
): boolean {
  if (!groups || groups.length === 0) return true

  let previousMatches = true
  for (let gi = 0; gi < groups.length; gi++) {
    const group = groups[gi]
    const mats = group.conditions.map((cond) =>
      evaluateCondition(cond.field, cond.operator, cond.value, ctx)
    )
    const groupResult = group.logic === 'OR' ? mats.some(Boolean) : mats.every(Boolean)

    if (gi === 0) {
      previousMatches = groupResult
    } else {
      const prevGroupLogic = groups[gi - 1]?.logic ?? 'AND'
      previousMatches = prevGroupLogic === 'OR' ? previousMatches || groupResult : previousMatches && groupResult
    }
  }
  return previousMatches
}

function getFieldValue(field: string, ctx: ExecutionContext): string | number | boolean | null {
  if (field === 'contact.name') return ctx.contact.name ?? null
  if (field === 'contact.phone') return ctx.contact.phone
  if (field === 'contact.email') return ctx.contact.email ?? null
  if (field === 'contact.source') return ctx.contact.source ?? null
  if (field === 'message.text') return ctx.messageText ?? ''
  if (field === 'message.type') return ctx.message?.type ?? null
  if (field === 'conversation.status') return ctx.conversation?.status ?? null
  if (field === 'variable') return ctx.variables.user_input ?? null
  if (field.startsWith('contact.tags')) return ''
  if (field in ctx.variables) return ctx.variables[field] ?? null
  return null
}

function evaluateCondition(
  field: string,
  operator: string,
  expected: string,
  ctx: ExecutionContext
): boolean {
  if (field === 'contact.tags') {
    const hasTag =
      !!ctx.contact.id &&
      ctx.variables.contactTags !== undefined &&
      ctx.variables.contactTags === expected
    const tagAdded = ctx.trigger?.tagName
    const tagsClean = (tagAdded || '').toLowerCase().split(',').map((s) => s.trim())
    const actual = tagsClean.includes(expected.toLowerCase())
    switch (operator) {
      case 'equals':
        return actual || hasTag
      case 'not_equals':
        return !(actual || hasTag)
      case 'contains':
        return tagsClean.some((t) => t.includes(expected.toLowerCase()))
      default:
        return false
    }
  }

  const actual = getFieldValue(field, ctx)
  const a = actual === null || actual === undefined ? '' : String(actual)
  const e = expected ?? ''

  switch (operator) {
    case 'equals':
      return a.toLowerCase() === e.toLowerCase()
    case 'not_equals':
      return a.toLowerCase() !== e.toLowerCase()
    case 'contains':
      return a.toLowerCase().includes(e.toLowerCase())
    case 'not_contains':
      return !a.toLowerCase().includes(e.toLowerCase())
    case 'starts_with':
      return a.toLowerCase().startsWith(e.toLowerCase())
    case 'ends_with':
      return a.toLowerCase().endsWith(e.toLowerCase())
    case 'greater_than':
      return Number(a) > Number(e)
    case 'less_than':
      return Number(a) < Number(e)
    case 'is_empty':
      return a.trim() === ''
    case 'is_not_empty':
      return a.trim() !== ''
    default:
      return false
  }
}

export interface AutomationAction {
  id: string
  type: string
  config: Record<string, unknown>
  delay?: number
}

async function executeAction(
  action: AutomationAction,
  ctx: ExecutionContext,
  automation: Automation
): Promise<void> {
  const cfg = action.config ?? {}

  switch (action.type) {
    case 'send_message': {
      const content = renderTemplateVar(String(cfg.content ?? ''), ctx)
      if (content.trim()) {
        await dispatchOutboundMessage(ctx, { type: 'TEXT', text: content }, { externalRef: `automation:${automation.id}` })
      }
      break
    }

    case 'send_template': {
      const name = String(cfg.templateName ?? '')
      if (!name) break
      const template = await prisma.template.findFirst({
        where: { workspaceId: ctx.workspaceId, name, status: 'APPROVED' },
      })
      if (!template) break
      await dispatchOutboundMessage(
        ctx,
        {
          type: 'TEMPLATE',
          templateName: name,
          language: String(cfg.language ?? 'en'),
        },
        { externalRef: `automation:${automation.id}` }
      )
      break
    }

    case 'add_tag':
    case 'remove_tag': {
      const tagName = String(cfg.tagName ?? '').trim().toLowerCase()
      if (!tagName) break
      const tag = await prisma.tag.findFirst({
        where: { workspaceId: ctx.workspaceId, name: tagName },
      })
      if (tag) {
        if (action.type === 'add_tag') {
          await prisma.contactTag.upsert({
            where: { contactId_tagId: { contactId: ctx.contact.id, tagId: tag.id } },
            create: { contactId: ctx.contact.id, tagId: tag.id },
            update: {},
          })
        } else {
          await prisma.contactTag.deleteMany({
            where: { contactId: ctx.contact.id, tagId: tag.id },
          })
        }
      }
      break
    }

    case 'update_field': {
      const field = String(cfg.field ?? '')
      const value = String(cfg.value ?? '')
      const data: Record<string, string> = {}
      if (field === 'name') data.name = value
      else if (field === 'email') data.email = value
      else if (field === 'source') data.source = value
      else if (field === 'notes') {
        await prisma.note.create({
          data: { contactId: ctx.contact.id, userId: ctx.trigger?.type ? ctx.contact.id : ctx.contact.id, content: value },
        })
        break
      }
      if (Object.keys(data).length > 0) {
        await prisma.contact.update({ where: { id: ctx.contact.id }, data })
      }
      break
    }

    case 'assign_agent': {
      const method = String(cfg.method ?? 'round_robin')
      conversation: {
        if (!ctx.conversation) break conversation
        let agentId: string | null = null

        if (method === 'specific' && cfg.agentId) {
          const member = await prisma.workspaceMember.findUnique({
            where: {
              workspaceId_userId: { workspaceId: ctx.workspaceId, userId: String(cfg.agentId) },
            },
          })
          agentId = member ? String(cfg.agentId) : null
        } else {
          const members = await prisma.workspaceMember.findMany({
            where: { workspaceId: ctx.workspaceId, role: { in: ['OWNER', 'ADMIN', 'MANAGER', 'AGENT'] } },
            include: { user: { select: { id: true } } },
          })
          if (members.length > 0) {
            if (method === 'least_load') {
              const counts = await Promise.all(
                members.map(async (m) => ({
                  member: m,
                  count: await prisma.conversation.count({
                    where: { assignedAgentId: m.user.id, status: 'OPEN' },
                  }),
                }))
              )
              counts.sort((a, b) => a.count - b.count)
              agentId = counts[0]?.member.user.id ?? null
            } else {
              const roundRobin = await prisma.conversation.aggregate({
                _count: { _all: true },
                where: { assignedAgentId: { not: null } },
              })
              agentId = members[(Number(roundRobin._count._all) || 0) % members.length]?.user.id ?? null
            }
          }
        }

        if (agentId) {
          await prisma.conversation.update({
            where: { id: ctx.conversation.id },
            data: { assignedAgentId: agentId, assignedAt: new Date() },
          })
        }
      }
      break
    }

    case 'webhook_call':
    case 'api_call': {
      const url = String(cfg.url ?? '')
      if (!url) break
      const headersRaw = String(cfg.headers ?? '{}')
      const bodyRaw = String(cfg.payload ?? cfg.body ?? '{}')
      let headers: Record<string, string> = {}
      try {
        headers = JSON.parse(headersRaw || '{}')
      } catch {
        headers = {}
      }
      const method = String(cfg.method ?? 'POST').toUpperCase()
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 10000)
      try {
        await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json', ...headers },
          body: ['GET', 'HEAD'].includes(method) ? undefined : bodyRaw || '{}',
          signal: controller.signal,
        })
      } catch (err) {
        console.error('[Automation] Webhook/API call failed:', err)
      } finally {
        clearTimeout(timer)
      }
      break
    }

    case 'wait': {
      const duration = Number(cfg.duration ?? 5)
      const unit = String(cfg.unit ?? 'minutes')
      const ms =
        unit === 'seconds'
          ? duration * 1000
          : unit === 'hours'
            ? duration * 60 * 60 * 1000
            : unit === 'days'
              ? duration * 24 * 60 * 60 * 1000
              : duration * 60 * 1000
      await new Promise((resolve) => setTimeout(resolve, Math.min(ms, 5 * 60 * 1000)))
      break
    }

    case 'start_chatbot': {
      const chatbotId = String(cfg.chatbotId ?? '')
      if (!chatbotId) break
      await runChatbotById(chatbotId, ctx.workspaceId, ctx.contact, ctx.conversation ?? null, ctx.messageText ?? null)
      break
    }

    default:
      break
  }
}

async function runAutomationOnContext(automation: Automation, ctx: ExecutionContext): Promise<void> {
  const usageCheck = await checkAndFailUsageLimit(ctx.workspaceId, 'automationsUsed', 1)
  if (!usageCheck.allowed) {
    throw new Error(usageCheck.message || 'Automation limit reached for your plan')
  }

  const execution = await prisma.automationExecution.create({
    data: {
      automationId: automation.id,
      contactId: ctx.contact.id,
      status: 'RUNNING',
      startedAt: new Date(),
      currentStep: 0,
    },
  })

  try {
    await incrementUsage(ctx.workspaceId, { automationsUsed: 1 }).catch(() => {})
    const actions = (automation.actions as AutomationAction[] | null) ?? []
    for (let i = 0; i < actions.length; i++) {
      await prisma.automationExecution.update({
        where: { id: execution.id },
        data: { currentStep: i + 1 },
      })
      const action = actions[i]
      const delaySeconds = Number(action.delay ?? 0)
      if (delaySeconds > 0) {
        await new Promise((resolve) => setTimeout(resolve, Math.min(delaySeconds * 1000, 5 * 60 * 1000)))
      }
      await executeAction(action, ctx, automation)
    }
    await prisma.automationExecution.update({
      where: { id: execution.id },
      data: { status: 'COMPLETED', completedAt: new Date(), currentStep: actions.length },
    })
    await createAuditLog({
      workspaceId: ctx.workspaceId,
      userId: ctx.contact.id,
      action: 'automation.run',
      resource: 'automation',
      resourceId: automation.id,
      metadata: { executionId: execution.id, contactId: ctx.contact.id },
    }).catch(() => {})
  } catch (err) {
    await prisma.automationExecution.update({
      where: { id: execution.id },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
        error: err instanceof Error ? err.message : 'Unknown automation error',
      },
    }).catch(() => {})
    console.error('[Automation] Execution failed:', automation.id, err)
  }
}

export async function triggerAutomations(trigger: TriggerContext, workspaceId?: string): Promise<void> {
  const contact = trigger.contact
  if (!contact) return

  const activeAutomations = await prisma.automation.findMany({
    where: {
      ...(workspaceId ? { workspaceId } : { workspaceId: contact.workspaceId }),
      isActive: true,
    },
  })

  const matching = activeAutomations.filter((a) => {
    const t = (a.trigger as { type?: string; config?: Record<string, unknown> }) ?? {}
    if (t.type !== trigger.type) return false

    const cfg = t.config ?? {}
    if (trigger.type === 'message_received') {
      const keyword = String(cfg.keyword ?? '').trim()
      const matchType = String(cfg.matchType ?? 'contains')
      const phone = String(cfg.phone ?? '')
      const text = trigger.messageText ?? ''
      if (phone && contact.phone !== phone) return false
      if (!keyword) return true
      if (matchType === 'exact') return text.toLowerCase() === keyword.toLowerCase()
      if (matchType === 'starts_with') return text.toLowerCase().startsWith(keyword.toLowerCase())
      if (matchType === 'regex') {
        try {
          return new RegExp(keyword, 'i').test(text)
        } catch {
          return false
        }
      }
      return text.toLowerCase().includes(keyword.toLowerCase())
    }
    if (trigger.type === 'contact_created') {
      const source = String(cfg.source ?? '').trim()
      if (!source) return true
      return contact.source === source
    }
    if (trigger.type === 'tag_added') {
      const tagName = String(cfg.tagName ?? '')
      return !tagName || trigger.tagName === tagName
    }
    if (trigger.type === 'form_submitted') {
      const campaignId = String(cfg.campaignId ?? '')
      return !campaignId || trigger.campaignId === campaignId
    }
    if (trigger.type === 'schedule') return false // handled by cron, not message events
    return false
  })

  for (const automation of matching) {
    const ctx: ExecutionContext = {
      workspaceId: contact.workspaceId,
      contact,
      messageText: trigger.messageText ?? null,
      variables: trigger.variables ?? {},
      trigger: {
        type: trigger.type,
        campaignId: trigger.campaignId ?? undefined,
        tagName: trigger.tagName ?? undefined,
      },
    }
    void runAutomationOnContext(automation, ctx)
  }
}

export async function runAutomationForContact(automationId: string, contact: Contact, workspaceId: string): Promise<void> {
  const automation = await prisma.automation.findFirst({
    where: { id: automationId, workspaceId, isActive: true },
  })
  if (!automation) return
  const ctx: ExecutionContext = {
    workspaceId,
    contact,
    messageText: null,
    variables: {},
    trigger: { type: 'manual' },
  }
  await runAutomationOnContext(automation, ctx)
}