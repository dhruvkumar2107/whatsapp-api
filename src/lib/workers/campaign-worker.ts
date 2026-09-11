import prisma from '@/lib/prisma'
import { enqueueJob, createWorker } from '@/lib/queue'
import { createWhatsAppProvider } from '@/lib/whatsapp'
import { dispatchWebhook } from '@/lib/webhooks/dispatcher'
import type { Campaign, CampaignRecipient, Contact, Template } from '@prisma/client'
import type { TemplateComponentParam } from '@/lib/whatsapp/types'
import type { Job } from 'bullmq'

export interface CampaignJob {
  campaignId: string
}

const RATE_LIMIT_MS = Number(process.env.CAMPAIGN_RATE_LIMIT_MS) || 250
const BATCH_SIZE = Number(process.env.CAMPAIGN_BATCH_SIZE) || 10

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

interface CampaignWithTemplate extends Campaign {
  template: Template | null
}

interface RecipientWithContact extends CampaignRecipient {
  contact: Contact
}

export async function processCampaign(job: CampaignJob): Promise<void> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: job.campaignId },
    include: { template: true },
  })

  if (!campaign) return
  if (campaign.status !== 'RUNNING' && campaign.status !== 'SCHEDULED') return

  if (campaign.status === 'SCHEDULED') {
    if (campaign.scheduledAt && campaign.scheduledAt > new Date()) {
      return
    }
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { status: 'RUNNING', startedAt: new Date() },
    })
    void dispatchWebhook(campaign.workspaceId, 'campaign.started', {
      campaign: { id: campaign.id, name: campaign.name },
      workspaceId: campaign.workspaceId,
    }).catch(() => {})
  }

  for (;;) {
    const fresh = await prisma.campaign.findUnique({
      where: { id: campaign.id },
      select: { status: true },
    })
    if (fresh && fresh.status === 'PAUSED') {
      return
    }
    if (fresh && fresh.status !== 'RUNNING' && fresh.status !== 'SCHEDULED') {
      return
    }

    const recipients = await prisma.campaignRecipient.findMany({
      where: { campaignId: campaign.id, status: 'QUEUED' },
      take: BATCH_SIZE,
      include: { contact: true },
    })

    if (recipients.length === 0) break

    for (const recipient of recipients) {
      await sendCampaignRecipient(campaign as CampaignWithTemplate, recipient as RecipientWithContact)
      if (RATE_LIMIT_MS > 0) await sleep(RATE_LIMIT_MS)
    }
  }

  const [sent, failed] = await Promise.all([
    prisma.campaignRecipient.count({
      where: { campaignId: campaign.id, status: { in: ['SENT', 'DELIVERED', 'READ'] } },
    }),
    prisma.campaignRecipient.count({
      where: { campaignId: campaign.id, status: 'FAILED' },
    }),
  ])

  await prisma.campaign.update({
    where: { id: campaign.id },
    data: {
      status: 'COMPLETED',
      completedAt: new Date(),
      sent,
      failed,
    },
  })

  void dispatchWebhook(campaign.workspaceId, 'campaign.completed', {
    campaign: { id: campaign.id, name: campaign.name, sent, failed },
    workspaceId: campaign.workspaceId,
  }).catch(() => {})
}

async function sendCampaignRecipient(
  campaign: CampaignWithTemplate,
  recipient: RecipientWithContact
): Promise<void> {
  if (!campaign.template) {
    await failRecipient(recipient.id, 'Campaign has no template')
    return
  }

  const whatsappAccount = await prisma.whatsAppAccount.findFirst({
    where: { workspaceId: campaign.workspaceId, status: 'CONNECTED' },
    orderBy: { createdAt: 'desc' },
  })

  if (!whatsappAccount) {
    await failRecipient(recipient.id, 'No connected WhatsApp account')
    return
  }

  const account = whatsappAccount

  let conversation = await prisma.conversation.findFirst({
    where: {
      workspaceId: campaign.workspaceId,
      whatsappAccountId: account.id,
      contactId: recipient.contactId,
    },
  })

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        workspaceId: campaign.workspaceId,
        whatsappAccountId: account.id,
        contactId: recipient.contactId,
      },
    })
  }

  const message = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      type: 'TEMPLATE',
      direction: 'OUTBOUND',
      status: 'SENDING',
      content: {
        name: campaign.template.name,
        language: campaign.template.language,
      },
    },
  })

  try {
    const provider = createWhatsAppProvider()
    const result = await provider.sendTemplate({
      phoneNumberId: account.phoneNumberId,
      to: recipient.contact.phone,
      templateName: campaign.template.name,
      language: campaign.template.language,
      components: resolveTemplateComponents(campaign.template, recipient.contact),
    })

    await prisma.message.update({
      where: { id: message.id },
      data: {
        status: 'SENT',
        externalId: result.whatsappMessageId,
        sentAt: new Date(),
      },
    })

    await prisma.messageEvent.create({
      data: {
        messageId: message.id,
        event: 'SENT',
        timestamp: new Date(),
        metadata: { campaignId: campaign.id },
      },
    })

    await prisma.campaignRecipient.update({
      where: { id: recipient.id },
      data: { status: 'SENT', messageId: message.id, sentAt: new Date() },
    })

    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { sent: { increment: 1 } },
    })

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessageAt: new Date(),
        lastMessagePreview: `Template: ${campaign.template.name}`,
      },
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown campaign send error'

    await prisma.message.update({
      where: { id: message.id },
      data: { status: 'FAILED', errorMessage },
    })

    await prisma.messageEvent.create({
      data: {
        messageId: message.id,
        event: 'FAILED',
        timestamp: new Date(),
        metadata: { campaignId: campaign.id, error: errorMessage },
      },
    })

    await failRecipient(recipient.id, errorMessage)
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { failed: { increment: 1 } },
    })
  }
}

function resolveTemplateComponents(
  template: Template,
  contact: Contact
): TemplateComponentParam[] | undefined {
  const components: TemplateComponentParam[] = []
  const name = contact.name || contact.phone
  const phone = contact.phone
  const email = contact.email ?? ''

  const body = template.body as { body?: Array<{ type: string; text?: string }> } | null
  const bodyText = body?.body?.find((c) => c.type === 'text')?.text ?? ''
  if (bodyText) {
    const substituted = bodyText
      .replace(/\{\{\s*1\s*\}\}/g, () => name)
      .replace(/\{\{\s*2\s*\}\}/g, () => phone)
      .replace(/\{\{\s*3\s*\}\}/g, () => email)
      .replace(/\{\{contact.name\}\}/g, () => name)
      .replace(/\{\{contact.phone\}\}/g, () => phone)
      .replace(/\{\{contact.email\}\}/g, () => email)
    components.push({
      type: 'body',
      parameters: [{ type: 'text', text: substituted }],
    })
  }

  const header = template.header as { header?: Array<{ type: string; format?: string; text?: string }>; mediaUrl?: string } | null
  const headerFormat = header?.header?.some((c) => c.format) ? header.header.find((c) => c.format)?.format : null
  if (headerFormat && header?.mediaUrl) {
    const mediaType = (headerFormat === 'IMAGE' ? 'image' : headerFormat === 'VIDEO' ? 'video' : 'document') as 'image' | 'video' | 'document'
    const param = { type: mediaType, [mediaType]: { link: header.mediaUrl } }
    components.push({ type: 'header', parameters: [param] as never })
  }

  return components.length > 0 ? components : undefined
}

async function failRecipient(recipientId: string, errorMessage: string): Promise<void> {
  await prisma.campaignRecipient.update({
    where: { id: recipientId },
    data: { status: 'FAILED', errorMessage },
  })
}

export function initCampaignWorker(): void {
  createWorker('campaigns', async (job: Job) => {
    const data = job.data as CampaignJob
    await processCampaign(data)
  })
}

export async function enqueueCampaign(campaignId: string): Promise<string> {
  const job = await enqueueJob('campaigns', {
    id: campaignId,
    type: 'process-campaign',
    payload: { campaignId },
  })
  return job.id?.toString() ?? ''
}

export function initWorkers(): void {
  initCampaignWorker()
}
