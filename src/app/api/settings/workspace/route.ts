import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { PERMISSIONS } from '@/lib/constants'
import { successResponse, errorResponse } from '@/lib/api-utils'
import { UnauthorizedError, ForbiddenError } from '@/lib/errors'

export async function DELETE() {
  try {
    const session = await auth()
    const workspaceId = session?.user?.workspaceId
    if (!workspaceId) throw new UnauthorizedError()
    requirePermission(session?.user?.role, PERMISSIONS.SETTINGS_MANAGE)

    // Only OWNER can delete workspace
    const member = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId: session.user.id, role: 'OWNER' },
    })
    if (!member) throw new ForbiddenError('Only the workspace owner can delete the workspace')

    // Hard delete all workspace data in correct order
    await prisma.$transaction([
      prisma.auditLog.deleteMany({ where: { workspaceId } }),
      prisma.webhookDelivery.deleteMany({ where: { webhook: { workspaceId } } }),
      prisma.webhook.deleteMany({ where: { workspaceId } }),
      prisma.notification.deleteMany({ where: { workspaceId } }),
      prisma.notificationPreference.deleteMany({ where: { workspaceId } }),
      prisma.supportTicketReply.deleteMany({ where: { ticket: { workspaceId } } }),
      prisma.supportTicket.deleteMany({ where: { workspaceId } }),
      prisma.invoice.deleteMany({ where: { subscription: { workspaceId } } }),
      prisma.usage.deleteMany({ where: { workspaceId } }),
      prisma.subscription.deleteMany({ where: { workspaceId } }),
      prisma.apiKey.deleteMany({ where: { workspaceId } }),
      prisma.automationExecution.deleteMany({ where: { automation: { workspaceId } } }),
      prisma.automation.deleteMany({ where: { workspaceId } }),
      prisma.chatbotEdge.deleteMany({ where: { chatbot: { workspaceId } } }),
      prisma.chatbotNode.deleteMany({ where: { chatbot: { workspaceId } } }),
      prisma.chatbot.deleteMany({ where: { workspaceId } }),
      prisma.campaignRecipient.deleteMany({ where: { campaign: { workspaceId } } }),
      prisma.campaign.deleteMany({ where: { workspaceId } }),
      prisma.template.deleteMany({ where: { workspaceId } }),
      prisma.messageEvent.deleteMany({ where: { message: { conversation: { workspaceId } } } }),
      prisma.message.deleteMany({ where: { conversation: { workspaceId } } }),
      prisma.conversation.deleteMany({ where: { workspaceId } }),
      prisma.contactTag.deleteMany({ where: { contact: { workspaceId } } }),
      prisma.customFieldValue.deleteMany({ where: { contact: { workspaceId } } }),
      prisma.note.deleteMany({ where: { contact: { workspaceId } } }),
      prisma.contact.deleteMany({ where: { workspaceId } }),
      prisma.tag.deleteMany({ where: { workspaceId } }),
      prisma.whatsAppAccount.deleteMany({ where: { workspaceId } }),
      prisma.workspaceMember.deleteMany({ where: { workspaceId } }),
      prisma.workspace.delete({ where: { id: workspaceId } }),
    ])

    return successResponse({ message: 'Workspace deleted' })
  } catch (error) {
    return errorResponse(error)
  }
}
