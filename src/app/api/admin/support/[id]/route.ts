import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/admin";
import { successResponse, errorResponse } from "@/lib/api-utils";

function serializeTicket(t: {
  id: string;
  subject: string;
  description: string;
  priority: string;
  status: string;
  createdAt: Date;
  user: { name: string | null; email: string | null };
  workspace: { name: string } | null;
  replies: Array<{
    id: string;
    content: string;
    createdAt: Date;
    user: { name: string | null; email: string | null };
  }>;
}) {
  return {
    id: t.id,
    subject: t.subject,
    userName: t.user?.name ?? t.user?.email ?? "Unknown",
    userEmail: t.user?.email ?? null,
    description: t.description,
    priority: t.priority,
    status: t.status,
    workspaceName: t.workspace?.name ?? null,
    createdAt: t.createdAt.toISOString(),
    replies: t.replies.map((r) => ({
      id: r.id,
      content: r.content,
      userName: r.user?.name ?? r.user?.email ?? "Support",
      createdAt: r.createdAt.toISOString(),
    })),
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin();
    const { id } = await params;
    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
      include: {
        user: { select: { name: true, email: true } },
        workspace: { select: { name: true } },
        replies: {
          orderBy: { createdAt: "asc" },
          include: { user: { select: { name: true, email: true } } },
        },
      },
    });
    if (!ticket) return errorResponse(new Error("Ticket not found"), 404);
    return successResponse(serializeTicket(ticket));
  } catch (error) {
    return errorResponse(error);
  }
}

const statusSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "WAITING", "RESOLVED", "CLOSED"]),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin();
    const { id } = await params;
    const body = await request.json();
    const parsed = statusSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(new Error("Invalid status"), 400);
    }

    const ticket = await prisma.supportTicket.update({
      where: { id },
      data: { status: parsed.data.status },
      include: {
        user: { select: { name: true, email: true } },
        workspace: { select: { name: true } },
        replies: {
          orderBy: { createdAt: "asc" },
          include: { user: { select: { name: true, email: true } } },
        },
      },
    });

    return successResponse(serializeTicket(ticket));
  } catch (error) {
    return errorResponse(error);
  }
}