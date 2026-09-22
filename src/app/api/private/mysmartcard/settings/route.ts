import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getMySmartCardContext } from '@/lib/mysmartcard/auth'
import { handleApiError } from '@/lib/errors'

export async function GET() {
  try {
    const ctx = await getMySmartCardContext()

    const [workspace, aiConfig, settings] = await Promise.all([
      prisma.mySmartCardWorkspace.findUnique({ where: { workspaceId: ctx.workspaceId } }),
      prisma.mySmartCardAIConfig.findUnique({ where: { workspaceId: ctx.mySmartCardWorkspace.id } }),
      prisma.mySmartCardSetting.findMany({ where: { workspaceId: ctx.mySmartCardWorkspace.id } }),
    ])

    return NextResponse.json({
      success: true,
      data: { workspace, aiConfig, settings: settings.map((s) => ({ key: s.key, value: s.value })) },
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(request: NextRequest) {
  try {
    const ctx = await getMySmartCardContext()
    const body = await request.json()

    if (body.workspace) {
      await prisma.mySmartCardWorkspace.update({
        where: { workspaceId: ctx.workspaceId },
        data: {
          businessName: body.workspace.businessName,
          website: body.workspace.website,
          contactEmail: body.workspace.contactEmail,
          contactPhone: body.workspace.contactPhone,
          address: body.workspace.address,
          supportHours: body.workspace.supportHours,
        },
      })
    }

    if (body.aiConfig) {
      await prisma.mySmartCardAIConfig.update({
        where: { workspaceId: ctx.mySmartCardWorkspace.id },
        data: {
          agentName: body.aiConfig.agentName,
          personality: body.aiConfig.personality,
          systemInstructions: body.aiConfig.systemInstructions,
          modelProvider: body.aiConfig.modelProvider,
          modelId: body.aiConfig.modelId,
          temperature: body.aiConfig.temperature,
          maxResponseLength: body.aiConfig.maxResponseLength,
          fallbackBehavior: body.aiConfig.fallbackBehavior,
          isActive: body.aiConfig.isActive,
        },
      })
    }

    if (body.settings) {
      for (const [key, value] of Object.entries(body.settings)) {
        await prisma.mySmartCardSetting.upsert({
          where: { workspaceId_key: { workspaceId: ctx.mySmartCardWorkspace.id, key } },
          update: { value: value as object },
          create: { workspaceId: ctx.mySmartCardWorkspace.id, key, value: value as object },
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
