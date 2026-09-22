import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getMySmartCardContext } from '@/lib/mysmartcard/auth'
import { handleApiError } from '@/lib/errors'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getMySmartCardContext()
    const { id } = await params
    const body = await request.json()

    const automation = await prisma.mySmartCardAutomation.findFirst({
      where: { id, workspaceId: ctx.mySmartCardWorkspace.id },
    })

    if (!automation) {
      return NextResponse.json({ success: false, error: { message: 'Automation not found', code: 'NOT_FOUND' } }, { status: 404 })
    }

    const updated = await prisma.mySmartCardAutomation.update({
      where: { id },
      data: {
        name: body.name ?? automation.name,
        description: body.description ?? automation.description,
        trigger: body.trigger ?? automation.trigger,
        conditions: body.conditions ?? automation.conditions,
        actions: body.actions ?? automation.actions,
        isActive: body.isActive ?? automation.isActive,
      },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getMySmartCardContext()
    const { id } = await params

    const automation = await prisma.mySmartCardAutomation.findFirst({
      where: { id, workspaceId: ctx.mySmartCardWorkspace.id },
    })

    if (!automation) {
      return NextResponse.json({ success: false, error: { message: 'Automation not found', code: 'NOT_FOUND' } }, { status: 404 })
    }

    await prisma.mySmartCardAutomation.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
