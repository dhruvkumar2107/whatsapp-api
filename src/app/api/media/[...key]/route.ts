import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { getPresignedUrl, getMediaStream, getMediaHead, deleteMedia, validateMediaKey } from '@/lib/storage'
import { handleApiError, UnauthorizedError, ForbiddenError, NotFoundError } from '@/lib/errors'
import { successResponse } from '@/lib/api-utils'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) throw new UnauthorizedError()
    const workspaceId = session.user.workspaceId
    if (!workspaceId) throw new UnauthorizedError('No workspace')

    const { key: keyParts } = await params
    const key = keyParts.join('/')

    if (!validateMediaKey(key, workspaceId)) {
      throw new ForbiddenError('Access denied to this media')
    }

    if (request.nextUrl.searchParams.get('download') === 'true') {
      const stream = await getMediaStream(key)
      if (!stream) throw new NotFoundError('Media')

      const head = await getMediaHead(key)
      const body = await stream.transformToByteArray()

      return new Response(Buffer.from(body), {
        headers: { 'Content-Type': head.contentType },
      })
    }

    const url = await getPresignedUrl(key)
    return successResponse({ url })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) throw new UnauthorizedError()
    const workspaceId = session.user.workspaceId
    if (!workspaceId) throw new UnauthorizedError('No workspace')

    const { key: keyParts } = await params
    const key = keyParts.join('/')

    if (!validateMediaKey(key, workspaceId)) {
      throw new ForbiddenError('Access denied to this media')
    }

    await deleteMedia(key)
    return successResponse({ deleted: true })
  } catch (error) {
    return handleApiError(error)
  }
}
