import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/admin";
import { getSearchParams, paginateResponse, errorResponse } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  try {
    await requireSuperAdmin();
    const { page, limit, search, filters } = getSearchParams(request);

    const where: Record<string, unknown> = {};
    if (filters.status) where.status = filters.status;
    if (filters.type) where.type = filters.type;
    if (filters.direction) where.direction = filters.direction;
    if (search) {
      where.OR = [
        { id: { contains: search, mode: "insensitive" } },
        { externalId: { contains: search, mode: "insensitive" } },
        { conversation: { contact: { phone: { contains: search, mode: "insensitive" } } } },
      ];
    }

    const [total, messages] = await Promise.all([
      prisma.message.count({ where }),
      prisma.message.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          conversation: {
            include: {
              workspace: { select: { name: true } },
              contact: { select: { phone: true, name: true } },
            },
          },
        },
      }),
    ]);

    const data = messages.map((m) => ({
      id: m.id,
      from: m.direction === "INBOUND" ? m.contactPhone : (m.conversation?.contact?.phone ?? null),
      to: m.direction === "OUTBOUND" ? m.conversation?.contact?.phone ?? null : m.contactPhone,
      type: m.type,
      direction: m.direction,
      status: m.status,
      workspaceName: m.conversation?.workspace?.name ?? null,
      timestamp: m.createdAt.toISOString(),
    }));

    return paginateResponse(data, total, page, limit);
  } catch (error) {
    return errorResponse(error);
  }
}