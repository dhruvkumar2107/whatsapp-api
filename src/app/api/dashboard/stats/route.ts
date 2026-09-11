import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { PLAN_LIMITS } from "@/lib/constants";
import { cacheGet, cacheSet } from "@/lib/redis";

export async function GET() {
  try {
    const session = await auth();
    const workspaceId = session?.user?.workspaceId;

    if (!workspaceId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const cacheKey = `dashboard:stats:${workspaceId}`
    const cached = await cacheGet(cacheKey)
    if (cached) {
      return NextResponse.json({ success: true, data: cached });
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const monthScope = { conversation: { workspaceId }, createdAt: { gte: monthStart } };
    const dayScope = { conversation: { workspaceId }, createdAt: { gte: dayStart } };

    const [
      workspace,
      whatsappAccount,
      messagesSent,
      delivered,
      read,
      failed,
      messagesToday,
      activeContacts,
      activeCampaigns,
      usage,
      subscription,
    ] = await Promise.all([
      prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { name: true },
      }),
      prisma.whatsAppAccount.findFirst({
        where: { workspaceId },
        select: { status: true },
      }),
      prisma.message.count({
        where: { ...monthScope, direction: "OUTBOUND" },
      }),
      prisma.message.count({
        where: {
          ...monthScope,
          direction: "OUTBOUND",
          status: { in: ["DELIVERED", "READ"] },
        },
      }),
      prisma.message.count({
        where: { ...monthScope, direction: "OUTBOUND", status: "READ" },
      }),
      prisma.message.count({
        where: { ...monthScope, direction: "OUTBOUND", status: "FAILED" },
      }),
      prisma.message.count({
        where: { ...dayScope, direction: "OUTBOUND" },
      }),
      prisma.contact.count({ where: { workspaceId } }),
      prisma.campaign.count({
        where: { workspaceId, status: { in: ["RUNNING", "SCHEDULED"] } },
      }),
      prisma.usage.findUnique({
        where: {
          workspaceId_period: {
            workspaceId,
            period: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
          },
        },
        select: { messagesUsed: true },
      }),
      prisma.subscription.findFirst({
        where: { workspaceId, status: { in: ["ACTIVE", "TRIALING"] } },
        orderBy: { currentPeriodEnd: "desc" },
        select: { plan: { select: { messageLimit: true } } },
      }),
    ]);

    const planLimit =
      subscription?.plan?.messageLimit ?? PLAN_LIMITS.FREE.messagesPerDay;
    const messagesUsed = usage?.messagesUsed ?? 0;
    const remainingUsage = Math.max(0, planLimit - messagesUsed);

    const deliveryRate = messagesSent > 0 ? (delivered / messagesSent) * 100 : 0;
    const readRate = messagesSent > 0 ? (read / messagesSent) * 100 : 0;

    const stats = {
      workspaceName: workspace?.name ?? null,
      whatsappConnected: whatsappAccount?.status === "CONNECTED",
      messagesSent,
      delivered,
      read,
      failed,
      messagesToday,
      activeContacts,
      activeCampaigns,
      remainingUsage,
      planLimit,
      deliveryRate: Math.round(deliveryRate * 100) / 100,
      readRate: Math.round(readRate * 100) / 100,
    };

    await cacheSet(cacheKey, stats, 60);

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Failed to fetch dashboard stats:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}