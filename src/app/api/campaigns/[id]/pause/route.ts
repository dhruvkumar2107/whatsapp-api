import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
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
    });

    if (!campaign) throw new NotFoundError("Campaign");

    if (campaign.status !== "RUNNING") {
      return handleApiError(
        new ValidationError("Only running campaigns can be paused")
      );
    }

    const updated = await prisma.campaign.update({
      where: { id },
      data: { status: "PAUSED" },
    });

    return successResponse(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
