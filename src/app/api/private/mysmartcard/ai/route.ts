import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getMySmartCardContext } from '@/lib/mysmartcard/auth'
import { handleApiError } from '@/lib/errors'

export async function GET() {
  try {
    const ctx = await getMySmartCardContext()

    const aiConfig = await prisma.mySmartCardAIConfig.findUnique({
      where: { workspaceId: ctx.mySmartCardWorkspace.id },
    })

    return NextResponse.json({ success: true, data: aiConfig })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(request: NextRequest) {
  try {
    const ctx = await getMySmartCardContext()
    const body = await request.json()

    const updated = await prisma.mySmartCardAIConfig.update({
      where: { workspaceId: ctx.mySmartCardWorkspace.id },
      data: {
        agentName: body.agentName,
        personality: body.personality,
        systemInstructions: body.systemInstructions,
        modelProvider: body.modelProvider,
        modelId: body.modelId,
        temperature: body.temperature,
        maxResponseLength: body.maxResponseLength,
        fallbackBehavior: body.fallbackBehavior,
        isActive: body.isActive,
      },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    return handleApiError(error)
  }
}
