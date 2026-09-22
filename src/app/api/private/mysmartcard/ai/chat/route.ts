import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getMySmartCardContext } from '@/lib/mysmartcard/auth'
import { handleApiError } from '@/lib/errors'
import { generateAIResponse } from '@/lib/mysmartcard/ai-engine'
import { calculateLeadScore, getLeadStatusFromScore } from '@/lib/mysmartcard/lead-scoring'
import { createWhatsAppProvider } from '@/lib/whatsapp'

export async function POST(request: NextRequest) {
  try {
    const ctx = await getMySmartCardContext()
    const body = await request.json()

    const { conversationId, message } = body

    if (!conversationId || !message) {
      return NextResponse.json(
        { success: false, error: { message: 'conversationId and message are required', code: 'BAD_REQUEST' } },
        { status: 400 }
      )
    }

    const mySmartCardConv = await prisma.mySmartCardConversation.findUnique({
      where: { conversationId },
      include: {
        conversation: {
          include: {
            whatsappAccount: true,
            messages: { orderBy: { createdAt: 'desc' }, take: 10 },
          },
        },
        lead: true,
      },
    })

    if (!mySmartCardConv || mySmartCardConv.workspaceId !== ctx.mySmartCardWorkspace.id) {
      return NextResponse.json(
        { success: false, error: { message: 'Conversation not found', code: 'NOT_FOUND' } },
        { status: 404 }
      )
    }

    if (mySmartCardConv.mode === 'HUMAN') {
      return NextResponse.json({
        success: true,
        data: { response: null, handoff: true, intent: null, confidence: null },
      })
    }

    const conversationHistory = mySmartCardConv.conversation.messages.map((msg) => ({
      role: (msg.direction === 'INBOUND' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: typeof msg.content === 'string' ? msg.content : '',
    }))

    const aiResult = await generateAIResponse(ctx.mySmartCardWorkspace.id, message, conversationHistory)

    await prisma.mySmartCardConversationEvent.create({
      data: {
        conversationId: mySmartCardConv.id,
        type: 'ai_response',
        data: {
          intent: aiResult.intent,
          confidence: aiResult.confidence,
          responseLength: aiResult.response.length,
          shouldHandoff: aiResult.shouldHandoff,
        },
      },
    })

    await prisma.mySmartCardConversation.update({
      where: { id: mySmartCardConv.id },
      data: {
        detectedIntent: aiResult.intent,
        confidence: aiResult.confidence,
      },
    })

    if (mySmartCardConv.leadId) {
      const messageHistory = conversationHistory.map((m) => m.content).concat([message])
      const { score, reasons } = calculateLeadScore(aiResult.intent, messageHistory, !!mySmartCardConv.lead?.email)

      await prisma.mySmartCardLead.update({
        where: { id: mySmartCardConv.leadId },
        data: {
          leadScore: score,
          scoreReasons: reasons,
          intent: aiResult.intent,
          status: getLeadStatusFromScore(score) as never,
        },
      })
    }

    if (aiResult.shouldHandoff) {
      await prisma.mySmartCardConversation.update({
        where: { id: mySmartCardConv.id },
        data: {
          mode: 'HUMAN',
          humanHandoffAt: new Date(),
          handoffReason: `AI detected intent: ${aiResult.intent}`,
        },
      })

      await prisma.mySmartCardConversationEvent.create({
        data: {
          conversationId: mySmartCardConv.id,
          type: 'handoff',
          data: { reason: aiResult.intent, confidence: aiResult.confidence },
        },
      })
    }

    if (aiResult.mediaToSend && aiResult.mediaToSend.length > 0 && mySmartCardConv.conversation.whatsappAccount) {
      const wa = mySmartCardConv.conversation.whatsappAccount
      const provider = createWhatsAppProvider()

      for (const media of aiResult.mediaToSend) {
        try {
          await provider.sendMedia({
            phoneNumberId: wa.phoneNumberId,
            to: mySmartCardConv.conversation.contactId,
            mediaType: media.type as 'image' | 'video' | 'document',
            mediaUrl: media.url,
            caption: media.caption,
          })
        } catch (err) {
          console.error('[MySmartCard] Failed to send media:', err)
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        response: aiResult.response,
        intent: aiResult.intent,
        confidence: aiResult.confidence,
        shouldHandoff: aiResult.shouldHandoff,
        mediaToSend: aiResult.mediaToSend,
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
