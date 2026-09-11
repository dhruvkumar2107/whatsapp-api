import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { enqueueCampaign } from "@/lib/workers/campaign-worker";
import { successResponse } from "@/lib/api-utils";
import {
  handleApiError,
  UnauthorizedError,
  NotFoundError,
  ValidationError,
} from "@/lib/errors";
import { requirePermission } from '@/lib/permissions';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const workspaceId = session?.user?.workspaceId;
    if (!workspaceId) throw new UnauthorizedError();
    requirePermission(session?.user?.role, "campaigns:schedule");

    const { id } = await params;

    const campaign = await prisma.campaign.findFirst({
      where: { id, workspaceId },
      include: { template: true },
    });

    if (!campaign) throw new NotFoundError("Campaign");

    if (campaign.status !== "DRAFT" && campaign.status !== "SCHEDULED") {
      return handleApiError(
        new ValidationError("Campaign is not in a startable state")
      );
    }

    if (!campaign.template) {
      return handleApiError(new ValidationError("Campaign must have a template"));
    }

    if (campaign.template.status !== "APPROVED") {
      return handleApiError(
        new ValidationError("Template must be approved before starting the campaign")
      );
    }

    const audienceFilter = (campaign.audience as {
      tags?: string[];
      customField?: Record<string, unknown>;
    } | null) || {};

    const contactWhere: Record<string, unknown> = {
      workspaceId,
      optIn: true,
    };

    if (audienceFilter.tags && audienceFilter.tags.length > 0) {
      contactWhere.tags = {
        some: {
          tag: { name: { in: audienceFilter.tags } },
        },
      };
    }

    if (audienceFilter.customField) {
      const fieldEntries = Object.entries(audienceFilter.customField);
      if (fieldEntries.length > 0) {
        contactWhere.customFields = {
          some: {
            OR: fieldEntries.map(([fieldName, fieldValue]) => ({
              fieldName,
              fieldValue: String(fieldValue),
            })),
          },
        };
      }
    }

    const contacts = await prisma.contact.findMany({
      where: contactWhere,
      select: { id: true },
    });

    if (contacts.length === 0) {
      return handleApiError(
        new ValidationError(
          "No eligible contacts found. Ensure contacts have opted in."
        )
      );
    }

    const recipientData = contacts.map((contact) => ({
      campaignId: id,
      contactId: contact.id,
      status: "QUEUED" as const,
    }));

    await prisma.campaignRecipient.createMany({
      data: recipientData,
      skipDuplicates: true,
    });

    if (campaign.scheduledAt && campaign.scheduledAt > new Date()) {
      const updated = await prisma.campaign.update({
        where: { id },
        data: {
          status: "SCHEDULED",
          totalRecipients: contacts.length,
        },
      });
      return successResponse(updated);
    }

    const updated = await prisma.campaign.update({
      where: { id },
      data: {
        status: "RUNNING",
        startedAt: new Date(),
        totalRecipients: contacts.length,
      },
    });

    await enqueueCampaign(id);

    return successResponse(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
