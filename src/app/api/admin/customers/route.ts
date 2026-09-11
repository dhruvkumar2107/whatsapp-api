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

    const workspaceIds = users
      .map((u) => u.workspaceMembers[0]?.workspace?.id)
      .filter((id): id is string => !!id);

    const uniqueWorkspaceIds = [...new Set(workspaceIds)];

    const [subscriptions, whatsappAccounts, messageCounts] = await Promise.all([
      prisma.subscription.findMany({
        where: { workspaceId: { in: uniqueWorkspaceIds }, status: { not: "CANCELLED" } },
        orderBy: { createdAt: "desc" },
        select: { workspaceId: true, status: true, createdAt: true, plan: { select: { name: true } } },
      }),
      prisma.whatsAppAccount.findMany({
        where: { workspaceId: { in: uniqueWorkspaceIds } },
        select: { workspaceId: true, status: true },
      }),
      prisma.message.groupBy({
        by: ["conversationId"],
        where: { conversation: { workspaceId: { in: uniqueWorkspaceIds } } },
        _count: { id: true },
      }),
    ]);

    const subsByWorkspace = new Map<string, typeof subscriptions[number]>();
    for (const sub of subscriptions) {
      const existing = subsByWorkspace.get(sub.workspaceId);
      if (!existing || sub.createdAt > existing.createdAt) {
        subsByWorkspace.set(sub.workspaceId, sub);
      }
    }

    const waByWorkspace = new Map<string, string>();
    for (const wa of whatsappAccounts) {
      if (!waByWorkspace.has(wa.workspaceId)) {
        waByWorkspace.set(wa.workspaceId, wa.status);
      }
    }

    const convIds = messageCounts.map((mc) => mc.conversationId);
    const convWorkspaceMap = new Map<string, string>();
    if (convIds.length > 0) {
      const convs = await prisma.conversation.findMany({
        where: { id: { in: convIds } },
        select: { id: true, workspaceId: true },
      });
      for (const c of convs) convWorkspaceMap.set(c.id, c.workspaceId);
    }

    const msgCountByWorkspace = new Map<string, number>();
    for (const mc of messageCounts) {
      const wsId = convWorkspaceMap.get(mc.conversationId);
      if (wsId) {
        msgCountByWorkspace.set(wsId, (msgCountByWorkspace.get(wsId) ?? 0) + mc._count.id);
      }
    }

    const customers = users.map((user) => {
      const workspace = user.workspaceMembers[0]?.workspace ?? null;
      let plan: string | null = null;
      let subscriptionStatus: string = "NONE";
      let whatsappStatus: string = "NONE";
      let messageCount = 0;

      if (workspace) {
        const sub = subsByWorkspace.get(workspace.id);
        plan = sub?.plan.name ?? null;
        subscriptionStatus = sub?.status ?? "NONE";
        whatsappStatus = waByWorkspace.get(workspace.id) ?? "NONE";
        messageCount = msgCountByWorkspace.get(workspace.id) ?? 0;
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
    });

    return paginateResponse(customers, total, page, limit);
  } catch (error) {
    return errorResponse(error);
  }
}