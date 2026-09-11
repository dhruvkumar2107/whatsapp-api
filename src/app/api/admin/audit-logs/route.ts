import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/admin";
import { getSearchParams, paginateResponse, errorResponse } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  try {
    await requireSuperAdmin();
    const { page, limit, search, filters } = getSearchParams(request);

    const where: Record<string, unknown> = {};
    if (filters.action) where.action = filters.action;
    if (filters.resource) where.resource = filters.resource;
    if (filters.userId) {
      if (filters.userId === "SUPER_ADMIN") {
        where.user = {
          workspaceMembers: { some: { role: "SUPER_ADMIN" } },
        };
      } else if (filters.userId === "customers") {
        where.user = {
          workspaceMembers: { none: { role: "SUPER_ADMIN" } },
        };
      } else {
        where.userId = filters.userId;
      }
    }
    if (search) {
      where.OR = [
        { action: { contains: search, mode: "insensitive" } },
        { resource: { contains: search, mode: "insensitive" } },
        { resourceId: { contains: search, mode: "insensitive" } },
      ];
    }

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: { user: { select: { name: true, email: true } } },
      }),
    ]);

    const data = logs.map((log) => ({
      id: log.id,
      actor: log.user?.name ?? log.user?.email ?? "System",
      action: log.action,
      resource: log.resource,
      resourceId: log.resourceId,
      metadata: log.metadata,
      ipAddress: log.ipAddress,
      createdAt: log.createdAt.toISOString(),
    }));

    return paginateResponse(data, total, page, limit);
  } catch (error) {
    return errorResponse(error);
  }
}