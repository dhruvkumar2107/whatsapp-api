import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireSuperAdmin, logAdminAction } from "@/lib/admin";
import { errorResponse } from "@/lib/api-utils";
import { NotFoundError, BadRequestError } from "@/lib/errors";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    await requireSuperAdmin();
    const { id } = await context.params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        workspaceMembers: {
          include: {
            workspace: {
              select: {
                id: true,
                name: true,
                slug: true,
                status: true,
                createdAt: true,
              },
            },
          },
        },
        auditLogs: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!user) throw new NotFoundError("Customer");

    const workspace = user.workspaceMembers[0]?.workspace ?? null;
    const workspaceId = workspace?.id;

    const [subscriptionResult, whatsappAccount, usage] = workspaceId
      ? await Promise.all([
          prisma.subscription.findFirst({
            where: { workspaceId, status: { not: "CANCELLED" } },
            orderBy: { createdAt: "desc" },
            include: { plan: true },
          }),
          prisma.whatsAppAccount.findFirst({
            where: { workspaceId },
          }),
          prisma.usage.findFirst({
            where: { workspaceId },
            orderBy: { updatedAt: "desc" },
          }),
        ])
      : [null, null, null];

    const auditLogs = user.auditLogs.slice(0, 10);

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.image,
        createdAt: user.createdAt.toISOString(),
        workspace: workspace
          ? {
              id: workspace.id,
              name: workspace.name,
              slug: workspace.slug,
              status: workspace.status,
              createdAt: workspace.createdAt.toISOString(),
            }
          : null,
        subscription: subscriptionResult
          ? {
              plan: {
                name: subscriptionResult.plan.name,
                price: Number(subscriptionResult.plan.price),
                billingCycle: subscriptionResult.plan.billingCycle,
              },
              status: subscriptionResult.status,
              currentPeriodEnd: subscriptionResult.currentPeriodEnd.toISOString(),
            }
          : null,
        whatsappAccount: whatsappAccount
          ? {
              id: whatsappAccount.id,
              businessName: whatsappAccount.businessName,
              phoneNumber: whatsappAccount.phoneNumber,
              status: whatsappAccount.status,
              qualityRating: whatsappAccount.qualityRating,
              wabaId: whatsappAccount.wabaId,
            }
          : null,
        usage: usage
          ? {
              messagesUsed: usage.messagesUsed,
              contactsUsed: usage.contactsUsed,
            }
          : null,
        recentActivity: auditLogs.slice(0, 5).map((log: { id: string; action: string; resource: string; createdAt: Date }) => ({
          id: log.id,
          action: `${log.action} ${log.resource}`,
          createdAt: log.createdAt.toISOString(),
        })),
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { userId, workspaceId } = await requireSuperAdmin();
    const { id } = await context.params;
    const body = await request.json().catch(() => null);
    const action = body?.action;

    if (!["suspend", "activate"].includes(action)) {
      throw new BadRequestError("Invalid action. Use 'suspend' or 'activate'.");
    }

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        workspaceMembers: {
          include: {
            workspace: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!user) throw new NotFoundError("Customer");

    const targetWorkspaceId = user.workspaceMembers[0]?.workspaceId;
    if (!targetWorkspaceId) {
      throw new NotFoundError("Workspace");
    }

    const status = action === "suspend" ? "SUSPENDED" : "ACTIVE";

    const updated = await prisma.workspace.update({
      where: { id: targetWorkspaceId },
      data: { status },
      select: { id: true, status: true },
    });

    await logAdminAction(
      userId,
      action === "suspend" ? "SUSPEND_CUSTOMER" : "ACTIVATE_CUSTOMER",
      "WORKSPACE",
      targetWorkspaceId,
      { customerId: id, customerEmail: user.email },
      undefined,
      workspaceId
    );

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return errorResponse(error);
  }
}