import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getMySmartCardContext } from '@/lib/mysmartcard/auth'
import { handleApiError } from '@/lib/errors'

export async function GET(request: NextRequest) {
  try {
    const ctx = await getMySmartCardContext()
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'all'
    const search = searchParams.get('search') || ''

    const where: Record<string, unknown> = { workspaceId: ctx.mySmartCardWorkspace.id }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ]
    }

    let documents: Array<Record<string, unknown>> = []
    let faqs: Array<Record<string, unknown>> = []
    let policies: Array<Record<string, unknown>> = []

    if (type === 'all' || type === 'documents') {
      documents = await prisma.mySmartCardKnowledgeDocument.findMany({ where, orderBy: { createdAt: 'desc' } })
    }
    if (type === 'all' || type === 'faqs') {
      faqs = await prisma.mySmartCardFAQ.findMany({ where, orderBy: { sortOrder: 'asc' }, include: { product: { select: { name: true } } } })
    }
    if (type === 'all' || type === 'policies') {
      policies = await prisma.mySmartCardPolicy.findMany({ where, orderBy: { type: 'asc' } })
    }

    return NextResponse.json({
      success: true,
      data: { documents, faqs, policies },
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await getMySmartCardContext()
    const body = await request.json()

    if (body.type === 'document') {
      const doc = await prisma.mySmartCardKnowledgeDocument.create({
        data: {
          workspaceId: ctx.mySmartCardWorkspace.id,
          title: body.title,
          content: body.content,
          sourceType: body.sourceType || 'text',
          sourceUrl: body.sourceUrl || null,
          category: body.category || 'general',
          tags: body.tags || [],
        },
      })
      return NextResponse.json({ success: true, data: doc })
    }

    if (body.type === 'faq') {
      const faq = await prisma.mySmartCardFAQ.create({
        data: {
          workspaceId: ctx.mySmartCardWorkspace.id,
          productId: body.productId || null,
          question: body.question,
          answer: body.answer,
          category: body.category || 'general',
          sortOrder: body.sortOrder || 0,
        },
      })
      return NextResponse.json({ success: true, data: faq })
    }

    if (body.type === 'policy') {
      const policy = await prisma.mySmartCardPolicy.upsert({
        where: { workspaceId_type: { workspaceId: ctx.mySmartCardWorkspace.id, type: body.policyType } },
        update: { title: body.title, content: body.content },
        create: {
          workspaceId: ctx.mySmartCardWorkspace.id,
          type: body.policyType,
          title: body.title,
          content: body.content,
        },
      })
      return NextResponse.json({ success: true, data: policy })
    }

    return NextResponse.json({ success: false, error: { message: 'Invalid type', code: 'BAD_REQUEST' } }, { status: 400 })
  } catch (error) {
    return handleApiError(error)
  }
}
