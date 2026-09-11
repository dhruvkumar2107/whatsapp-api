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

    const [total, deliveries] = await Promise.all([
      prisma.webhookDelivery.count({ where }),
      prisma.webhookDelivery.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          webhook: { include: { workspace: { select: { name: true } } } },
        },
      }),
    ]);

    const data = deliveries.map((d) => ({
      id: d.id,
      event: d.event,
      workspaceName: d.webhook.workspace.name,
      webhookUrl: d.webhook.url,
      status: d.status,
      statusCode: d.statusCode,
      attempts: d.attempts,
      createdAt: d.createdAt.toISOString(),
    }));

    return paginateResponse(data, total, page, limit);
  } catch (error) {
    return errorResponse(error);
  }
}