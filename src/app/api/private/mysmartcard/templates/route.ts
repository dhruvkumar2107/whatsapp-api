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
    const status = searchParams.get('status') || ''
    const category = searchParams.get('category') || ''

    const where: Record<string, unknown> = { workspaceId: ctx.mySmartCardWorkspace.id }
    if (status) where.status = status
    if (category) where.category = category

    const [templates, total] = await Promise.all([
      prisma.mySmartCardTemplate.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.mySmartCardTemplate.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: templates,
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

    const template = await prisma.mySmartCardTemplate.create({
      data: {
        workspaceId: ctx.mySmartCardWorkspace.id,
        name: body.name,
        category: body.category,
        language: body.language || 'en',
        header: body.header || null,
        body: body.body || null,
        footer: body.footer || null,
        buttons: body.buttons || null,
      },
    })

    return NextResponse.json({ success: true, data: template })
  } catch (error) {
    return handleApiError(error)
  }
}
