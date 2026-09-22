import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getMySmartCardContext } from '@/lib/mysmartcard/auth'
import { handleApiError } from '@/lib/errors'

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getMySmartCardContext()
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'document'

    if (type === 'document') {
      const doc = await prisma.mySmartCardKnowledgeDocument.findFirst({
        where: { id, workspaceId: ctx.workspaceId },
      })
      if (!doc) {
        return NextResponse.json({ success: false, error: { message: 'Document not found', code: 'NOT_FOUND' } }, { status: 404 })
      }
      await prisma.mySmartCardKnowledgeDocument.delete({ where: { id } })
    } else if (type === 'faq') {
      const faq = await prisma.mySmartCardFAQ.findFirst({
        where: { id, workspaceId: ctx.workspaceId },
      })
      if (!faq) {
        return NextResponse.json({ success: false, error: { message: 'FAQ not found', code: 'NOT_FOUND' } }, { status: 404 })
      }
      await prisma.mySmartCardFAQ.delete({ where: { id } })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
