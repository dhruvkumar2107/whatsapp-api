import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getMySmartCardContext } from '@/lib/mysmartcard/auth'
import { handleApiError } from '@/lib/errors'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getMySmartCardContext()
    const { id } = await params

    const product = await prisma.mySmartCardProduct.findFirst({
      where: { id, workspaceId: ctx.workspaceId },
      include: { media: true, faqs: true },
    })

    if (!product) {
      return NextResponse.json({ success: false, error: { message: 'Product not found', code: 'NOT_FOUND' } }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: product })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getMySmartCardContext()
    const { id } = await params
    const body = await request.json()

    const product = await prisma.mySmartCardProduct.findFirst({
      where: { id, workspaceId: ctx.workspaceId },
    })

    if (!product) {
      return NextResponse.json({ success: false, error: { message: 'Product not found', code: 'NOT_FOUND' } }, { status: 404 })
    }

    const updated = await prisma.mySmartCardProduct.update({
      where: { id },
      data: {
        name: body.name ?? product.name,
        description: body.description ?? product.description,
        price: body.price ?? product.price,
        discountedPrice: body.discountedPrice ?? product.discountedPrice,
        features: body.features ?? product.features,
        specifications: body.specifications ?? product.specifications,
        targetCustomer: body.targetCustomer ?? product.targetCustomer,
        isAvailable: body.isAvailable ?? product.isAvailable,
        purchaseUrl: body.purchaseUrl ?? product.purchaseUrl,
        sortOrder: body.sortOrder ?? product.sortOrder,
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

    const product = await prisma.mySmartCardProduct.findFirst({
      where: { id, workspaceId: ctx.workspaceId },
    })

    if (!product) {
      return NextResponse.json({ success: false, error: { message: 'Product not found', code: 'NOT_FOUND' } }, { status: 404 })
    }

    await prisma.mySmartCardProduct.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
