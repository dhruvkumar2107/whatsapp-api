import { Prisma } from '@prisma/client'
import prisma from './prisma'

export interface ContactTagDTO {
  id: string
  name: string
  color: string | null
}

export interface ContactPayload {
  id: string
  name: string | null
  phone: string
  email: string | null
  country: string | null
  source: string | null
  optIn: boolean
  lastMessageAt: Date | null
  createdAt: Date
  updatedAt: Date
  tags: ContactTagDTO[]
}

type ContactWithTags = {
  id: string
  name: string | null
  phone: string
  email: string | null
  country: string | null
  source: string | null
  optIn: boolean
  lastMessageAt: Date | null
  createdAt: Date
  updatedAt: Date
  tags: Array<{ tag: ContactTagDTO }>
}

export function buildContactsWhere(
  workspaceId: string,
  filters: Record<string, string> = {},
  search = ''
): Prisma.ContactWhereInput {
  const where: Prisma.ContactWhereInput = { workspaceId }

  const term = search.trim()
  if (term) {
    where.OR = [
      { name: { contains: term, mode: 'insensitive' } },
      { phone: { contains: term } },
      { email: { contains: term, mode: 'insensitive' } },
    ]
  }

  if (filters.tag) {
    where.tags = { some: { tagId: filters.tag } }
  }

  if (filters.source) {
    where.source = filters.source
  }

  if (filters.optIn === 'true') {
    where.optIn = true
  } else if (filters.optIn === 'false') {
    where.optIn = false
  }

  return where
}

export function contactOrderBy(
  sortBy: string,
  sortOrder: 'asc' | 'desc'
): Prisma.ContactOrderByWithRelationInput {
  if (sortBy === 'name') return { name: sortOrder }
  if (sortBy === 'lastMessage') return { lastMessageAt: sortOrder }
  return { createdAt: sortOrder }
}

export function contactSummary(contact: ContactWithTags): ContactPayload {
  return {
    id: contact.id,
    name: contact.name,
    phone: contact.phone,
    email: contact.email,
    country: contact.country,
    source: contact.source,
    optIn: contact.optIn,
    lastMessageAt: contact.lastMessageAt,
    createdAt: contact.createdAt,
    updatedAt: contact.updatedAt,
    tags: contact.tags.map((link) => link.tag),
  }
}

export async function resolveWorkspaceTags(
  workspaceId: string,
  tagNames: string[]
): Promise<ContactTagDTO[]> {
  const names = [...new Set((tagNames ?? []).map((name) => name.trim()).filter(Boolean))]

  if (names.length === 0) return []

  const existing = await prisma.tag.findMany({
    where: { workspaceId, name: { in: names } },
    select: { id: true, name: true, color: true },
  })

  const known = new Set(existing.map((tag) => tag.name))
  const toCreate = names.filter((name) => !known.has(name))

  const created = await prisma.$transaction(
    toCreate.map((name) =>
      prisma.tag.create({
        data: { workspaceId, name },
        select: { id: true, name: true, color: true },
      })
    )
  )

  return [...existing, ...created]
}

export function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function zodErrorsToRecord(error: {
  issues: Array<{ path: PropertyKey[]; message: string }>
}): Record<string, string[]> {
  const errors: Record<string, string[]> = {}
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? '_global')
    if (!errors[key]) errors[key] = []
    errors[key].push(issue.message)
  }
  return errors
}