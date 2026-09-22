import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getMySmartCardContext } from '@/lib/mysmartcard/auth'
import { handleApiError } from '@/lib/errors'

export async function GET(request: NextRequest) {
  try {
    const ctx = await getMySmartCardContext()
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    const where: Record<string, unknown> = { workspaceId: ctx.workspaceId }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
      ]
    }
    if (status) where.status = status

    const [leads, total] = await Promise.all([
      prisma.mySmartCardLead.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        include: { product: { select: { name: true } }, assignedAgent: { select: { name: true, email: true } } },
      }),
      prisma.mySmartCardLead.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: leads,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await getMySmartCardContext()
    const body = await request.json()

    const lead = await prisma.mySmartCardLead.create({
      data: {
        workspaceId: ctx.workspaceId,
        contactId: body.contactId || null,
        name: body.name || '',
        phone: body.phone,
        email: body.email || null,
        company: body.company || null,
        city: body.city || null,
        source: body.source || 'whatsapp',
        productId: body.productId || null,
        quantity: body.quantity || null,
        intent: body.intent || null,
        leadScore: body.leadScore || 0,
        status: body.status || 'NEW',
        assignedAgentId: body.assignedAgentId || null,
        notes: body.notes || null,
        tags: body.tags || [],
      },
      include: { product: { select: { name: true } } },
    })

    return NextResponse.json({ success: true, data: lead })
  } catch (error) {
    return handleApiError(error)
  }
}
