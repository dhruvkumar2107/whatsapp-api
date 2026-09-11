import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/admin";
import { successResponse, errorResponse } from "@/lib/api-utils";

const replySchema = z.object({
  content: z.string().min(1).max(5000),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireSuperAdmin();
    const { id } = await params;
    const body = await request.json();
    const parsed = replySchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(new Error("Reply content is required"), 400);
    }

    const ticket = await prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) return errorResponse(new Error("Ticket not found"), 404);

    const reply = await prisma.supportTicketReply.create({
      data: {
        ticketId: id,
        userId: admin.userId,
        content: parsed.data.content,
      },
      include: { user: { select: { name: true, email: true } } },
    });

    await prisma.supportTicket.update({
      where: { id },
      data: { status: "IN_PROGRESS" },
    });

    return successResponse({
      id: reply.id,
      content: reply.content,
      userName: reply.user?.name ?? reply.user?.email ?? "Support",
      createdAt: reply.createdAt.toISOString(),
    }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}