import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import crypto from 'crypto'

const globalForS3 = globalThis as unknown as { s3Client: S3Client }

function getS3Client(): S3Client {
  if (!globalForS3.s3Client) {
    globalForS3.s3Client = new S3Client({
      region: process.env.STORAGE_REGION || 'us-east-1',
      endpoint: process.env.STORAGE_ENDPOINT,
      forcePathStyle: !!process.env.STORAGE_ENDPOINT,
      credentials: {
        accessKeyId: process.env.STORAGE_ACCESS_KEY || '',
        secretAccessKey: process.env.STORAGE_SECRET_KEY || '',
      },
    })
  }
  return globalForS3.s3Client
}

const BUCKET = process.env.STORAGE_BUCKET || 'whaatopro-media'
const PRESIGNED_URL_EXPIRY = 3600

export interface UploadResult {
  key: string
  url: string
  size: number
  contentType: string
}

export async function uploadMedia(
  file: Buffer,
  filename: string,
  contentType: string,
  workspaceId: string
): Promise<UploadResult> {
  const ext = filename.split('.').pop() || 'bin'
  const key = `media/${workspaceId}/${crypto.randomUUID()}.${ext}`
  const s3 = getS3Client()

  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: file,
    ContentType: contentType,
    Metadata: { workspaceId, originalName: filename },
  }))

  return {
    key,
    url: `/api/media/${key}`,
    size: file.length,
    contentType,
  }
}

export async function getPresignedUrl(key: string): Promise<string> {
  const s3 = getS3Client()
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key })
  return getSignedUrl(s3, command, { expiresIn: PRESIGNED_URL_EXPIRY })
}

export async function deleteMedia(key: string): Promise<void> {
  const s3 = getS3Client()
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }))
}

export async function getMediaStream(key: string) {
  const s3 = getS3Client()
  const response = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }))
  return response.Body
}

export async function getMediaHead(key: string) {
  const s3 = getS3Client()
  const response = await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }))
  return {
    contentType: response.ContentType || 'application/octet-stream',
    contentLength: response.ContentLength || 0,
    metadata: response.Metadata || {},
  }
}

export function validateMediaKey(key: string, workspaceId: string): boolean {
  return key.startsWith(`media/${workspaceId}/`)
}
