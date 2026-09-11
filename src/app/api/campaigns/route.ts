import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { campaignSchema } from "@/lib/validators";
import { successResponse, paginateResponse, getSearchParams } from "@/lib/api-utils";
import { handleApiError, UnauthorizedError, ValidationError } from "@/lib/errors";
import { PLAN_LIMITS } from "@/lib/constants";
import { requirePermission } from '@/lib/permissions'

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const workspaceId = session?.user?.workspaceId;
    if (!workspaceId) throw new UnauthorizedError();

    const { page, limit, search, sortBy, sortOrder, filters } = getSearchParams(request);

    const where: Record<string, unknown> = { workspaceId };
    if (filters.status) where.status = filters.status;
    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }

    const [campaigns, total] = await Promise.all([
      prisma.campaign.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          template: {
            select: { id: true, name: true, category: true },
          },
        },
      }),
      prisma.campaign.count({ where }),
    ]);

    return paginateResponse(campaigns, total, page, limit);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const workspaceId = session?.user?.workspaceId;
    if (!workspaceId) throw new UnauthorizedError();
    requirePermission(session?.user?.role, "campaigns:create");

    const body = await request.json();
    const parsed = campaignSchema.safeParse(body);
    if (!parsed.success) {
      return handleApiError(
        new ValidationError(
          parsed.error.flatten().fieldErrors as Record<string, string[]>
        )
      );
    }

    const template = await prisma.template.findFirst({
      where: { id: parsed.data.templateId, workspaceId },
    });

    if (!template) {
      return handleApiError(new ValidationError("Template not found"));
    }

    if (template.status !== "APPROVED") {
      return handleApiError(
        new ValidationError("Only approved templates can be used in campaigns")
      );
    }

    const planLimit = await checkCampaignLimit(workspaceId);
    if (planLimit !== -1 && planLimit <= 0) {
      return handleApiError(
        new ValidationError(
          "Campaign limit reached for your current plan. Please upgrade to create more campaigns."
        )
      );
    }

    const campaign = await prisma.campaign.create({
      data: {
        workspaceId,
        name: parsed.data.name,
        templateId: parsed.data.templateId,
        audience: parsed.data.contactFilter as unknown as object || undefined,
        scheduledAt: parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : undefined,
        status: parsed.data.scheduledAt ? "SCHEDULED" : "DRAFT",
      },
    });

    return successResponse(campaign, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

async function checkCampaignLimit(workspaceId: string): Promise<number> {
  const subscription = await prisma.subscription.findFirst({
    where: { workspaceId, status: { in: ["ACTIVE", "TRIALING"] } },
    orderBy: { currentPeriodEnd: "desc" },
    select: { plan: { select: { name: true } } },
  });

  const planName = subscription?.plan?.name || "FREE";
  const planKey = planName.toUpperCase() as keyof typeof PLAN_LIMITS;
  const limit = PLAN_LIMITS[planKey]?.campaigns ?? PLAN_LIMITS.FREE.campaigns;

  if (limit === -1) return -1;

  const currentCount = await prisma.campaign.count({
    where: { workspaceId },
  });

  return limit - currentCount;
}
