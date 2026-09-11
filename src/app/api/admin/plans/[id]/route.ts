import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/admin";
import { successResponse, errorResponse } from "@/lib/api-utils";

const planSchema = z.object({
  name: z.string().min(1).optional(),
  price: z.number().min(0).optional(),
  billingCycle: z.enum(["MONTHLY", "YEARLY"]).optional(),
  contactLimit: z.number().optional(),
  messageLimit: z.number().optional(),
  apiLimit: z.number().optional(),
  agentLimit: z.number().optional(),
  automationLimit: z.number().optional(),
  chatbotLimit: z.number().optional(),
  features: z.record(z.string(), z.boolean()).optional(),
  isActive: z.boolean().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin();
    const { id } = await params;
    const body = await request.json();
    const parsed = planSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(new Error("Invalid plan data: " + parsed.error.message), 400);
    }

    const plan = await prisma.plan.update({
      where: { id },
      data: {
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        ...(parsed.data.price !== undefined ? { price: parsed.data.price } : {}),
        ...(parsed.data.billingCycle !== undefined ? { billingCycle: parsed.data.billingCycle } : {}),
        ...(parsed.data.contactLimit !== undefined ? { contactLimit: parsed.data.contactLimit } : {}),
        ...(parsed.data.messageLimit !== undefined ? { messageLimit: parsed.data.messageLimit } : {}),
        ...(parsed.data.apiLimit !== undefined ? { apiLimit: parsed.data.apiLimit } : {}),
        ...(parsed.data.agentLimit !== undefined ? { agentLimit: parsed.data.agentLimit } : {}),
        ...(parsed.data.automationLimit !== undefined ? { automationLimit: parsed.data.automationLimit } : {}),
        ...(parsed.data.chatbotLimit !== undefined ? { chatbotLimit: parsed.data.chatbotLimit } : {}),
        ...(parsed.data.features !== undefined ? { features: parsed.data.features } : {}),
        ...(parsed.data.isActive !== undefined ? { isActive: parsed.data.isActive } : {}),
      },
    });

    return successResponse({ ...plan, price: Number(plan.price) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin();
    const { id } = await params;
    const subscriptions = await prisma.subscription.count({ where: { planId: id } });
    if (subscriptions > 0) {
      return errorResponse(new Error("Cannot delete a plan that has active subscriptions"), 400);
    }
    await prisma.plan.delete({ where: { id } });
    return successResponse({ deleted: true });
  } catch (error) {
    return errorResponse(error);
  }
}