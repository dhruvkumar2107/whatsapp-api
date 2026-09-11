import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { campaignSchema } from "@/lib/validators";
import { successResponse } from "@/lib/api-utils";
import {
  handleApiError,
  UnauthorizedError,
  NotFoundError,
  ValidationError,
} from "@/lib/errors";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const workspaceId = session?.user?.workspaceId;
    if (!workspaceId) throw new UnauthorizedError();

    const { id } = await params;

    const campaign = await prisma.campaign.findFirst({
      where: { id, workspaceId },
      include: {
        template: true,
        _count: {
          select: { recipients: true },
        },
      },
    });

    if (!campaign) throw new NotFoundError("Campaign");

    return successResponse(campaign);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const workspaceId = session?.user?.workspaceId;
    if (!workspaceId) throw new UnauthorizedError();

    const { id } = await params;

    const existing = await prisma.campaign.findFirst({
      where: { id, workspaceId },
    });

    if (!existing) throw new NotFoundError("Campaign");

    if (existing.status !== "DRAFT" && existing.status !== "SCHEDULED") {
      return handleApiError(
        new ValidationError("Only draft or scheduled campaigns can be edited")
      );
    }

    const body = await request.json();
    const parsed = campaignSchema.partial().safeParse(body);
    if (!parsed.success) {
      return handleApiError(
        new ValidationError(
          parsed.error.flatten().fieldErrors as Record<string, string[]>
        )
      );
    }

    const updateData: Record<string, unknown> = {};
    if (parsed.data.name) updateData.name = parsed.data.name;
    if (parsed.data.templateId) {
      const template = await prisma.template.findFirst({
        where: { id: parsed.data.templateId, workspaceId },
      });
      if (!template || template.status !== "APPROVED") {
        return handleApiError(
          new ValidationError("Template not found or not approved")
        );
      }
      updateData.templateId = parsed.data.templateId;
    }
    if (parsed.data.contactFilter !== undefined)
      updateData.audience = parsed.data.contactFilter;
    if (parsed.data.scheduledAt !== undefined)
      updateData.scheduledAt = parsed.data.scheduledAt
        ? new Date(parsed.data.scheduledAt)
        : null;

    const campaign = await prisma.campaign.update({
      where: { id },
      data: updateData,
    });

    return successResponse(campaign);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const workspaceId = session?.user?.workspaceId;
    if (!workspaceId) throw new UnauthorizedError();

    const { id } = await params;

    const existing = await prisma.campaign.findFirst({
      where: { id, workspaceId },
    });

    if (!existing) throw new NotFoundError("Campaign");

    if (existing.status !== "DRAFT") {
      return handleApiError(
        new ValidationError("Only draft campaigns can be deleted")
      );
    }

    await prisma.campaign.delete({ where: { id } });

    return successResponse({ message: "Campaign deleted" });
  } catch (error) {
    return handleApiError(error);
  }
}
