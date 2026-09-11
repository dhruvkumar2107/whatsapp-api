import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { successResponse } from '@/lib/api-utils'
import { handleApiError, UnauthorizedError, NotFoundError } from '@/lib/errors'
import { generateApiKey } from '@/lib/utils'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const workspaceId = session?.user?.workspaceId
    if (!workspaceId) throw new UnauthorizedError()

    const { id } = await params

    const result = await prisma.apiKey.updateMany({
      where: { id, workspaceId },
      data: { isActive: false },
    })

    if (result.count === 0) throw new NotFoundError('API key')

    return successResponse({ message: 'API key revoked' })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const workspaceId = session?.user?.workspaceId
    if (!workspaceId) throw new UnauthorizedError()

    const { id } = await params
    const existing = await prisma.apiKey.findFirst({ where: { id, workspaceId } })
    if (!existing) throw new NotFoundError('API key')

    const { key, hashed } = generateApiKey()
    const prefix = key.slice(0, 6)

    await prisma.apiKey.update({
      where: { id },
      data: {
        keyHash: hashed,
        keyPrefix: prefix,
      },
    })

    return successResponse({ key, message: 'Key rotated. The new key is shown only once.' })
  } catch (error) {
    return handleApiError(error)
  }
}
