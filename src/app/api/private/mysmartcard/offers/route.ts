import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getMySmartCardContext } from '@/lib/mysmartcard/auth'
import { handleApiError } from '@/lib/errors'

export async function GET() {
  try {
    const ctx = await getMySmartCardContext()
    const offers = await prisma.mySmartCardOffer.findMany({
      where: { workspaceId: ctx.workspaceId },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ success: true, data: offers })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await getMySmartCardContext()
    const body = await request.json()
    const offer = await prisma.mySmartCardOffer.create({
      data: {
        workspaceId: ctx.workspaceId,
        name: body.name,
        description: body.description,
        discount: body.discount || null,
        discountType: body.discountType || 'percentage',
        applicableProduct: body.applicableProduct || null,
        conditions: body.conditions || null,
        validFrom: body.validFrom ? new Date(body.validFrom) : null,
        validUntil: body.validUntil ? new Date(body.validUntil) : null,
      },
    })
    return NextResponse.json({ success: true, data: offer })
  } catch (error) {
    return handleApiError(error)
  }
}
