import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getMySmartCardContext } from '@/lib/mysmartcard/auth'
import { handleApiError } from '@/lib/errors'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getMySmartCardContext()
    const { id } = await params

    const lead = await prisma.mySmartCardLead.findFirst({
      where: { id, workspaceId: ctx.mySmartCardWorkspace.id },
      include: {
        product: true,
        assignedAgent: { select: { name: true, email: true } },
        conversations: { include: { conversation: { select: { lastMessagePreview: true, lastMessageAt: true, status: true } } } },
      },
    })

    if (!lead) {
      return NextResponse.json({ success: false, error: { message: 'Lead not found', code: 'NOT_FOUND' } }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: lead })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getMySmartCardContext()
    const { id } = await params
    const body = await request.json()

    const lead = await prisma.mySmartCardLead.findFirst({
      where: { id, workspaceId: ctx.mySmartCardWorkspace.id },
    })

    if (!lead) {
      return NextResponse.json({ success: false, error: { message: 'Lead not found', code: 'NOT_FOUND' } }, { status: 404 })
    }

    const updated = await prisma.mySmartCardLead.update({
      where: { id },
      data: {
        name: body.name ?? lead.name,
        phone: body.phone ?? lead.phone,
        email: body.email ?? lead.email,
        company: body.company ?? lead.company,
        city: body.city ?? lead.city,
        source: body.source ?? lead.source,
        productId: body.productId ?? lead.productId,
        quantity: body.quantity ?? lead.quantity,
        intent: body.intent ?? lead.intent,
        leadScore: body.leadScore ?? lead.leadScore,
        scoreReasons: body.scoreReasons ?? lead.scoreReasons,
        status: body.status ?? lead.status,
        assignedAgentId: body.assignedAgentId ?? lead.assignedAgentId,
        notes: body.notes ?? lead.notes,
        tags: body.tags ?? lead.tags,
      },
      include: { product: { select: { name: true } } },
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

    const lead = await prisma.mySmartCardLead.findFirst({
      where: { id, workspaceId: ctx.mySmartCardWorkspace.id },
    })

    if (!lead) {
      return NextResponse.json({ success: false, error: { message: 'Lead not found', code: 'NOT_FOUND' } }, { status: 404 })
    }

    await prisma.mySmartCardLead.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
