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
    const category = searchParams.get('category') || ''
    const available = searchParams.get('available')

    const where: Record<string, unknown> = { workspaceId: ctx.mySmartCardWorkspace.id }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }
    if (category) where.targetCustomer = category
    if (available !== null && available !== undefined) where.isAvailable = available === 'true'

    const [products, total] = await Promise.all([
      prisma.mySmartCardProduct.findMany({
        where,
        orderBy: { sortOrder: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { media: true, _count: { select: { faqs: true, leads: true } } },
      }),
      prisma.mySmartCardProduct.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: products,
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

    const slug = body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

    const product = await prisma.mySmartCardProduct.create({
      data: {
        workspaceId: ctx.mySmartCardWorkspace.id,
        name: body.name,
        slug,
        description: body.description || '',
        price: body.price || 0,
        discountedPrice: body.discountedPrice || null,
        features: body.features || [],
        specifications: body.specifications || {},
        targetCustomer: body.targetCustomer || '',
        isAvailable: body.isAvailable !== false,
        purchaseUrl: body.purchaseUrl || '',
        sortOrder: body.sortOrder || 0,
      },
    })

    return NextResponse.json({ success: true, data: product })
  } catch (error) {
    return handleApiError(error)
  }
}
