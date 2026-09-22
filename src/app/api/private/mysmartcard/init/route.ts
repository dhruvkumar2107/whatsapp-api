import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getMySmartCardContext } from '@/lib/mysmartcard/auth'
import { handleApiError } from '@/lib/errors'

export async function POST() {
  try {
    const ctx = await getMySmartCardContext()

    const existing = await prisma.mySmartCardWorkspace.findUnique({
      where: { workspaceId: ctx.workspaceId },
    })

    if (existing) {
      return NextResponse.json({ success: true, data: existing })
    }

    const mySmartCardWorkspace = await prisma.mySmartCardWorkspace.create({
      data: {
        workspaceId: ctx.workspaceId,
        businessName: 'MySmartCard',
      },
    })

    await prisma.mySmartCardAIConfig.create({
      data: {
        workspaceId: ctx.workspaceId,
        agentName: 'MySmartCard Assistant',
        systemInstructions: `You are the official MySmartCard WhatsApp assistant. You help customers with product information, pricing, ordering, delivery, and support. Be friendly, professional, and helpful. If you don't have information from the knowledge base, say you will connect the customer with the team. Never invent information.`,
        modelProvider: 'gemini',
        modelId: 'gemini-2.0-flash',
      },
    })

    const policyTypes = ['shipping', 'delivery', 'returns', 'refunds', 'replacement', 'warranty', 'payment', 'cancellation']
    for (const type of policyTypes) {
      await prisma.mySmartCardPolicy.create({
        data: {
          workspaceId: ctx.workspaceId,
          type,
          title: type.charAt(0).toUpperCase() + type.slice(1),
          content: `${type.charAt(0).toUpperCase() + type.slice(1)} policy information to be configured.`,
        },
      })
    }

    return NextResponse.json({ success: true, data: mySmartCardWorkspace })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function GET() {
  try {
    const ctx = await getMySmartCardContext()

    const mySmartCardWorkspace = await prisma.mySmartCardWorkspace.findUnique({
      where: { workspaceId: ctx.workspaceId },
      include: { aiConfig: true, settings: true },
    })

    if (!mySmartCardWorkspace) {
      return NextResponse.json({ success: false, error: { message: 'MySmartCard not initialized', code: 'NOT_FOUND' } }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: mySmartCardWorkspace })
  } catch (error) {
    return handleApiError(error)
  }
}
