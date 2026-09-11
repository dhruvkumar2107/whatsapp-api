import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { paginateResponse, getSearchParams } from "@/lib/api-utils";
import { handleApiError, UnauthorizedError, NotFoundError } from "@/lib/errors";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const workspaceId = session?.user?.workspaceId;
    if (!workspaceId) throw new UnauthorizedError();

    const { id } = await params;

    const campaign = await prisma.campaign.findFirst({
      where: { id, workspaceId },
    });

    if (!campaign) throw new NotFoundError("Campaign");

    const { page, limit, filters } = getSearchParams(request);

    const where: Record<string, unknown> = { campaignId: id };
    if (filters.status) where.status = filters.status;

    const [recipients, total] = await Promise.all([
      prisma.campaignRecipient.findMany({
        where,
        orderBy: { createdAt: "asc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          contact: {
            select: { id: true, name: true, phone: true, email: true },
          },
        },
      }),
      prisma.campaignRecipient.count({ where }),
    ]);

    return paginateResponse(recipients, total, page, limit);
  } catch (error) {
    return handleApiError(error);
  }
}
