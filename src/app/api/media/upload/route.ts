import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { uploadMedia } from '@/lib/storage'
import { handleApiError, UnauthorizedError, BadRequestError } from '@/lib/errors'
import { successResponse } from '@/lib/api-utils'

const MAX_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/quicktime',
  'audio/mpeg',
  'audio/ogg',
  'application/pdf',
]

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) throw new UnauthorizedError()
    const workspaceId = session.user.workspaceId
    if (!workspaceId) throw new UnauthorizedError('No workspace')

    const formData = await request.formData()
    const file = formData.get('file') as File
    if (!file) throw new BadRequestError('No file provided')

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestError('File too large (max 10MB)')
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new BadRequestError('File type not allowed')
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const result = await uploadMedia(buffer, file.name, file.type, workspaceId)

    return successResponse(result, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
