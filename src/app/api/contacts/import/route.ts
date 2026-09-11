import { NextRequest } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { contactImportSchema } from '@/lib/validators'
import { successResponse } from '@/lib/api-utils'
import {
  handleApiError,
  UnauthorizedError,
  ValidationError,
} from '@/lib/errors'
import { resolveWorkspaceTags, zodErrorsToRecord } from '@/lib/contacts'
import { checkAndFailUsageLimit, incrementUsage } from '@/lib/usage'

interface ImportedContact {
  name: string
  phone: string
  email: string
  country: string
  source: string
  optIn: boolean
  tags: string[]
}

interface RowResult {
  row: number
  status: 'valid' | 'invalid' | 'duplicate'
  errors: string[]
  contact?: ImportedContact
}

const importRowSchema = z.object({
  name: z.string().min(1).max(200),
  phone: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Invalid phone number (include country code)'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  tags: z.array(z.string()).optional(),
  country: z.string().max(100).optional().or(z.literal('')),
  source: z.string().max(120).optional().or(z.literal('')),
  optIn: z.boolean().optional(),
})

const importPayloadSchema = contactImportSchema.extend({
  mode: z.enum(['validate', 'import']).default('import'),
  duplicateStrategy: z.enum(['skip', 'update']).default('skip'),
})

const metaSchema = z.object({
  mode: z.enum(['validate', 'import']).default('import'),
  duplicateStrategy: z.enum(['skip', 'update']).default('skip'),
})

function normalizeTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((tag) => String(tag ?? '').trim()).filter(Boolean)
  }
  if (typeof value === 'string' && value.trim()) {
    return value
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)
  }
  return []
}

function normalizeContact(raw: Record<string, unknown>): ImportedContact {
  return {
    name: String(raw.name ?? ''),
    phone: String(raw.phone ?? ''),
    email: String(raw.email ?? '').trim(),
    country: raw.country ? String(raw.country) : '',
    source: raw.source ? String(raw.source) : '',
    optIn: raw.optIn === true || raw.optIn === 'true',
    tags: normalizeTags(raw.tags),
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : {}
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    const workspaceId = session?.user?.workspaceId
    if (!workspaceId) throw new UnauthorizedError()

    const body = await request.json().catch(() => null)

    const parsed = importPayloadSchema.safeParse(body)
    const metaParsed = metaSchema.safeParse(body)
    const mode = metaParsed.success ? metaParsed.data.mode : 'import'
    const duplicateStrategy = metaParsed.success
      ? metaParsed.data.duplicateStrategy
      : 'skip'

    if (!parsed.success && mode === 'import') {
      throw new ValidationError(zodErrorsToRecord(parsed.error))
    }

    const rawContacts: unknown[] = parsed.success
      ? parsed.data.contacts
      : Array.isArray(asRecord(body).contacts)
        ? (asRecord(body).contacts as unknown[])
        : []

    const results: RowResult[] = []
    const validContacts: ImportedContact[] = []

    for (let i = 0; i < rawContacts.length; i++) {
      const row = asRecord(rawContacts[i])
      const rowParsed = importRowSchema.safeParse(row)

      if (!rowParsed.success) {
        results.push({
          row: i,
          status: 'invalid',
          errors: rowParsed.error.issues.map(
            (issue) => `${issue.path.join('.')}: ${issue.message}`
          ),
        })
        continue
      }

      const normalized = normalizeContact(row)
      validContacts.push(normalized)
      results.push({ row: i, status: 'valid', errors: [], contact: normalized })
    }

    const existingRecords = await prisma.contact.findMany({
      where: {
        workspaceId,
        phone: { in: [...new Set(validContacts.map((contact) => contact.phone))] },
      },
      select: { id: true, phone: true },
    })
    const existingByPhone = new Map(
      existingRecords.map((record) => [record.phone, record.id])
    )

    const seenInBatch = new Set<string>()
    for (const result of results) {
      if (result.status !== 'valid') continue
      const phone = result.contact!.phone
      const isDuplicate = existingByPhone.has(phone) || seenInBatch.has(phone)
      if (isDuplicate) {
        result.status = 'duplicate'
        result.errors = ['A contact with this phone number already exists']
      } else {
        seenInBatch.add(phone)
      }
    }

    let created = 0
    let updated = 0

    if (mode === 'import') {
      const toCreate = results.filter(
        (result) => result.status === 'valid'
      ) as RowResult[]

      if (toCreate.length > 0) {
        const usageCheck = await checkAndFailUsageLimit(workspaceId, 'contactsUsed', toCreate.length)
        if (!usageCheck.allowed) {
          throw new Error(usageCheck.message ?? 'Contact limit reached for your plan')
        }
      }
      const toUpdate = results.filter((result) => {
        if (result.status !== 'duplicate') return false
        if (duplicateStrategy !== 'update') return false
        return existingByPhone.has(result.contact!.phone)
      }) as RowResult[]

      const createContacts = toCreate.map((result) => result.contact!)
      const updateContacts = toUpdate.map((result) => result.contact!)

      const allTagNames = [
        ...createContacts.flatMap((contact) => contact.tags),
        ...updateContacts.flatMap((contact) => contact.tags),
      ]
      const tagObjects = await resolveWorkspaceTags(workspaceId, allTagNames)
      const tagIdByName = new Map(tagObjects.map((tag) => [tag.name, tag.id]))

      if (createContacts.length > 0) {
        await prisma.contact.createMany({
          data: createContacts.map((contact) => ({
            workspaceId,
            name: contact.name,
            phone: contact.phone,
            email: contact.email || null,
            country: contact.country || null,
            source: contact.source || null,
            optIn: contact.optIn,
          })),
          skipDuplicates: true,
        })
        created = createContacts.length

        const createdRecords = await prisma.contact.findMany({
          where: {
            workspaceId,
            phone: { in: createContacts.map((contact) => contact.phone) },
          },
          select: { id: true, phone: true },
        })
        const createdIdByPhone = new Map(
          createdRecords.map((record) => [record.phone, record.id])
        )

        const contactTagData = createContacts.flatMap((contact) => {
          const contactId = createdIdByPhone.get(contact.phone)
          if (!contactId) return []
          return contact.tags
            .map((name) => tagIdByName.get(name))
            .filter((tagId): tagId is string => Boolean(tagId))
            .map((tagId) => ({ contactId, tagId }))
        })

        if (contactTagData.length > 0) {
          await prisma.contactTag.createMany({
            data: contactTagData,
            skipDuplicates: true,
          })
        }
      }

      for (const contact of updateContacts) {
        const existingId = existingByPhone.get(contact.phone)
        if (!existingId) continue

        await prisma.contact.update({
          where: { id: existingId },
          data: {
            name: contact.name,
            email: contact.email || null,
            country: contact.country || null,
            source: contact.source || null,
            optIn: contact.optIn,
          },
        })

        const tagIds = contact.tags
          .map((name) => tagIdByName.get(name))
          .filter((tagId): tagId is string => Boolean(tagId))

        if (tagIds.length > 0) {
          await prisma.contactTag.createMany({
            data: tagIds.map((tagId) => ({ contactId: existingId, tagId })),
            skipDuplicates: true,
          })
        }

        updated += 1
      }
    }

    const duplicateCount = results.filter(
      (result) => result.status === 'duplicate'
    ).length

    if (created > 0) {
      await incrementUsage(workspaceId, { contactsUsed: created }).catch(() => {})
      const { triggerAutomations } = await import('@/lib/automation/engine')
      for (const result of results.filter((r) => r.status === 'valid')) {
        const rc = result.contact
        if (!rc) continue
        const found = await prisma.contact.findFirst({
          where: { workspaceId, phone: rc.phone },
        })
        if (found) {
          void triggerAutomations({ type: 'contact_created', contact: found, messageText: '' }, workspaceId).catch(() => {})
        }
      }
    }

    return successResponse({
      summary: {
        total: rawContacts.length,
        valid: results.filter((result) => result.status === 'valid').length,
        invalid: results.filter((result) => result.status === 'invalid').length,
        duplicates: duplicateCount,
        created,
        updated,
        skipped: duplicateStrategy === 'skip' ? duplicateCount : 0,
      },
      results: results.map((result) => ({
        row: result.row,
        status: result.status,
        errors: result.errors,
      })),
    })
  } catch (error) {
    return handleApiError(error)
  }
}