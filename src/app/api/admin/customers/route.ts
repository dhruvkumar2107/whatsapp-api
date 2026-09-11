import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/admin";
import { getSearchParams, paginateResponse, errorResponse } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  try {
    await requireSuperAdmin();
    const { page, limit, search, filters } = getSearchParams(request);

    const where: Record<string, unknown> = {
      workspaceMembers: { some: {} },
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        {
          workspaceMembers: {
            some: {
              workspace: { name: { contains: search, mode: "insensitive" } },
            },
          },
        },
      ];
    }

    if (filters.status) {
      where.workspaceMembers = {
        some: {
          workspace: { status: filters.status as "ACTIVE" | "SUSPENDED" },
        },
      };
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          workspaceMembers: {
            include: {
              workspace: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  status: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const customers = await Promise.all(
      users.map(async (user) => {
        const workspace = user.workspaceMembers[0]?.workspace ?? null;
        let plan: string | null = null;
        let subscriptionStatus: string = "NONE";
        let whatsappStatus: string = "NONE";
        let messageCount = 0;

        if (workspace) {
          const [subscription, whatsappAccounts, messageCountResult] =
            await Promise.all([
              prisma.subscription.findFirst({
                where: { workspaceId: workspace.id, status: { not: "CANCELLED" } },
                orderBy: { createdAt: "desc" },
                include: { plan: { select: { name: true } } },
              }),
              prisma.whatsAppAccount.findMany({
                where: { workspaceId: workspace.id },
                select: { status: true },
                take: 1,
              }),
              prisma.message.count({
                where: { conversation: { workspaceId: workspace.id } },
              }),
            ]);

          plan = subscription?.plan.name ?? null;
          subscriptionStatus = subscription?.status ?? "NONE";
          whatsappStatus = whatsappAccounts[0]?.status ?? "NONE";
          messageCount = messageCountResult;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          workspace: workspace
            ? {
                id: workspace.id,
                name: workspace.name,
                slug: workspace.slug,
                status: workspace.status,
              }
            : null,
          plan,
          subscriptionStatus,
          status: workspace?.status ?? "NO_WORKSPACE",
          whatsappStatus,
          messageCount,
          createdAt: user.createdAt.toISOString(),
        };
      })
    );

    return paginateResponse(customers, total, page, limit);
  } catch (error) {
    return errorResponse(error);
  }
}