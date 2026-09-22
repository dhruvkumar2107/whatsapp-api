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
    const isActive = searchParams.get('isActive')

    const where: Record<string, unknown> = { workspaceId: ctx.mySmartCardWorkspace.id }
    if (search) where.OR = [{ name: { contains: search, mode: 'insensitive' } }, { description: { contains: search, mode: 'insensitive' } }]
    if (isActive !== null && isActive !== undefined) where.isActive = isActive === 'true'

    const [automations, total] = await Promise.all([
      prisma.mySmartCardAutomation.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.mySmartCardAutomation.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: automations,
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

    const automation = await prisma.mySmartCardAutomation.create({
      data: {
        workspaceId: ctx.mySmartCardWorkspace.id,
        name: body.name,
        description: body.description || '',
        trigger: body.trigger || {},
        conditions: body.conditions || {},
        actions: body.actions || [],
        isActive: body.isActive || false,
      },
    })

    return NextResponse.json({ success: true, data: automation })
  } catch (error) {
    return handleApiError(error)
  }
}
