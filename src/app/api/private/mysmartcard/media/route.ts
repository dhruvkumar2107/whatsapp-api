import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getMySmartCardContext } from '@/lib/mysmartcard/auth'
import { handleApiError } from '@/lib/errors'

export async function GET(request: NextRequest) {
  try {
    const ctx = await getMySmartCardContext()
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId') || ''
    const type = searchParams.get('type') || ''

    const where: Record<string, unknown> = { workspaceId: ctx.workspaceId }
    if (productId) where.productId = productId
    if (type) where.type = type

    const media = await prisma.mySmartCardMedia.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { product: { select: { name: true } } },
    })

    return NextResponse.json({ success: true, data: media })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await getMySmartCardContext()
    const body = await request.json()

    const media = await prisma.mySmartCardMedia.create({
      data: {
        workspaceId: ctx.workspaceId,
        productId: body.productId || null,
        name: body.name,
        type: body.type,
        url: body.url,
        thumbnailUrl: body.thumbnailUrl || null,
        fileSize: body.fileSize || null,
        mimeType: body.mimeType || null,
        metadata: body.metadata || null,
      },
    })

    return NextResponse.json({ success: true, data: media })
  } catch (error) {
    return handleApiError(error)
  }
}
