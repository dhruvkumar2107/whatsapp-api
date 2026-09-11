import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/admin";
import { successResponse, errorResponse } from "@/lib/api-utils";

export async function GET(_request: NextRequest) {
  try {
    await requireSuperAdmin();

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalCustomers,
      activeCustomers,
      connectedAccounts,
      messagesToday,
      messagesThisMonth,
      failedMessages,
      revenue,
      totalWorkspaces,
      totalTemplates,
      totalCampaigns,
      recentActivity,
    ] = await Promise.all([
      prisma.user.count({
        where: { workspaceMembers: { some: {} } },
      }),
      prisma.workspaceMember.count({
        where: { role: { in: ["OWNER", "ADMIN"] } },
      }),
      prisma.whatsAppAccount.count({
        where: { status: "CONNECTED" },
      }),
      prisma.message.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.message.count({ where: { createdAt: { gte: monthStart } } }),
      prisma.message.count({ where: { status: "FAILED" } }),
      prisma.invoice.aggregate({
        where: { status: "PAID" },
        _sum: { amount: true },
      }),
      prisma.workspace.count(),
      prisma.template.count(),
      prisma.campaign.count(),
      prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          user: { select: { name: true, email: true } },
        },
      }),
    ]);

    const recentActivityData = recentActivity.map((log: { id: string; action: string; resource: string; user: { name: string | null; email: string | null } | null; createdAt: Date }) => ({
      id: log.id,
      action: log.action,
      resource: log.resource,
      actor: log.user?.name || log.user?.email || "System",
      timestamp: log.createdAt.toISOString(),
      type: log.resource,
    }));

    return successResponse({
      totalCustomers,
      activeCustomers,
      totalWorkspaces,
      connectedAccounts,
      messagesToday,
      messagesThisMonth,
      failedMessages,
      revenue: Number(revenue._sum.amount ?? 0),
      totalTemplates,
      totalCampaigns,
      systemHealth: "OPERATIONAL",
      recentActivity: recentActivityData,
    });
  } catch (error) {
    return errorResponse(error);
  }
}