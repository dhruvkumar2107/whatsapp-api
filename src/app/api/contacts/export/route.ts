import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { getSearchParams } from '@/lib/api-utils'
import { handleApiError, UnauthorizedError } from '@/lib/errors'
import { buildContactsWhere, contactOrderBy, csvEscape } from '@/lib/contacts'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    const workspaceId = session?.user?.workspaceId
    if (!workspaceId) throw new UnauthorizedError()

    const { search, sortBy, sortOrder, filters } = getSearchParams(request)

    const contacts = await prisma.contact.findMany({
      where: buildContactsWhere(workspaceId, filters, search),
      orderBy: contactOrderBy(sortBy, sortOrder),
      take: 10000,
      include: {
        tags: {
          include: { tag: { select: { id: true, name: true, color: true } } },
        },
      },
    })

    const headers = [
      'name',
      'phone',
      'email',
      'country',
      'source',
      'opt_in',
      'tags',
      'created_at',
      'last_message_at',
    ]

    const lines = contacts.map((contact) =>
      [
        csvEscape(contact.name),
        csvEscape(contact.phone),
        csvEscape(contact.email),
        csvEscape(contact.country),
        csvEscape(contact.source),
        contact.optIn ? 'true' : 'false',
        csvEscape(contact.tags.map((link) => link.tag.name).join(', ')),
        csvEscape(contact.createdAt.toISOString()),
        csvEscape(contact.lastMessageAt?.toISOString() ?? ''),
      ].join(',')
    )

    const csv = [headers.join(','), ...lines].join('\r\n')
    const date = new Date().toISOString().slice(0, 10)

    return new Response(`\uFEFF${csv}`, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="contacts-${date}.csv"`,
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}