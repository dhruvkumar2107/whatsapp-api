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
    if (filters.priority) where.priority = filters.priority;
    if (search) {
      where.OR = [
        { subject: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const [total, tickets] = await Promise.all([
      prisma.supportTicket.count({ where }),
      prisma.supportTicket.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: { select: { name: true, email: true } },
          workspace: { select: { name: true } },
        },
      }),
    ]);

    const data = tickets.map((t) => ({
      id: t.id,
      subject: t.subject,
      userName: t.user?.name ?? t.user?.email ?? "Unknown",
      userEmail: t.user?.email ?? null,
      description: t.description,
      priority: t.priority,
      status: t.status,
      workspaceName: t.workspace?.name ?? null,
      createdAt: t.createdAt.toISOString(),
    }));

    return paginateResponse(data, total, page, limit);
  } catch (error) {
    return errorResponse(error);
  }
}