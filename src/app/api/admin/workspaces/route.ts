import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/admin";
import { getSearchParams, paginateResponse, errorResponse } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  try {
    await requireSuperAdmin();
    const { page, limit, search } = getSearchParams(request);

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { slug: { contains: search, mode: "insensitive" } },
      ];
    }

    const [total, workspaces] = await Promise.all([
      prisma.workspace.count({ where }),
      prisma.workspace.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: { select: { members: true } },
          subscriptions: {
            where: { status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] } },
            take: 1,
            include: { plan: { select: { name: true } } },
          },
        },
      }),
    ]);

    const data = workspaces.map((w) => ({
      id: w.id,
      name: w.name,
      slug: w.slug,
      memberCount: w._count.members,
      plan: w.subscriptions[0]?.plan?.name ?? null,
      status: w.status,
      createdAt: w.createdAt.toISOString(),
    }));

    return paginateResponse(data, total, page, limit);
  } catch (error) {
    return errorResponse(error);
  }
}