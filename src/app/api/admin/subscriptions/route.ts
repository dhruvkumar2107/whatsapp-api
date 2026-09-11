import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/admin";
import { getSearchParams, paginateResponse, errorResponse } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  try {
    await requireSuperAdmin();
    const { page, limit, filters } = getSearchParams(request);

    const where: Record<string, unknown> = {};
    if (filters.status) where.status = filters.status;

    const [total, subscriptions] = await Promise.all([
      prisma.subscription.count({ where }),
      prisma.subscription.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          workspace: { select: { name: true } },
          plan: { select: { name: true, price: true, billingCycle: true } },
        },
      }),
    ]);

    const data = subscriptions.map((s) => ({
      id: s.id,
      workspaceName: s.workspace.name,
      planName: s.plan.name,
      status: s.status,
      currentPeriodStart: s.currentPeriodStart?.toISOString() ?? null,
      currentPeriodEnd: s.currentPeriodEnd?.toISOString() ?? null,
      amount: Number(s.plan.price),
      createdAt: s.createdAt.toISOString(),
    }));

    return paginateResponse(data, total, page, limit);
  } catch (error) {
    return errorResponse(error);
  }
}