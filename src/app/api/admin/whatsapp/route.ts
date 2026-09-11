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
    if (search) {
      where.OR = [
        { businessName: { contains: search, mode: "insensitive" } },
        { wabaId: { contains: search, mode: "insensitive" } },
        { phoneNumberId: { contains: search, mode: "insensitive" } },
      ];
    }

    const [total, accounts] = await Promise.all([
      prisma.whatsAppAccount.count({ where }),
      prisma.whatsAppAccount.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          workspace: { select: { name: true } },
          _count: { select: { conversations: true } },
        },
      }),
    ]);

    const data = accounts.map((a) => ({
      id: a.id,
      businessName: a.businessName,
      phoneNumber: a.phoneNumber ?? null,
      wabaId: a.wabaId,
      status: a.status,
      qualityRating: a.qualityRating,
      messageCount: a._count.conversations,
      workspaceName: a.workspace.name,
      createdAt: a.createdAt.toISOString(),
    }));

    return paginateResponse(data, total, page, limit);
  } catch (error) {
    return errorResponse(error);
  }
}