import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/admin";
import { successResponse, errorResponse } from "@/lib/api-utils";

const planSchema = z.object({
  name: z.string().min(1),
  price: z.number().min(0),
  billingCycle: z.enum(["MONTHLY", "YEARLY"]),
  contactLimit: z.number(),
  messageLimit: z.number(),
  apiLimit: z.number(),
  agentLimit: z.number(),
  automationLimit: z.number(),
  chatbotLimit: z.number(),
  features: z.record(z.string(), z.boolean()).optional(),
  isActive: z.boolean().optional(),
});

export async function GET() {
  try {
    await requireSuperAdmin();
    const plans = await prisma.plan.findMany({
      orderBy: { price: "asc" },
    });
    const data = plans.map((p) => ({
      ...p,
      price: Number(p.price),
    }));
    return successResponse(data);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireSuperAdmin();
    const body = await request.json();
    const parsed = planSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(new Error("Invalid plan data: " + parsed.error.message), 400);
    }

    const plan = await prisma.plan.create({
      data: {
        name: parsed.data.name,
        price: parsed.data.price,
        billingCycle: parsed.data.billingCycle,
        contactLimit: parsed.data.contactLimit,
        messageLimit: parsed.data.messageLimit,
        apiLimit: parsed.data.apiLimit,
        agentLimit: parsed.data.agentLimit,
        automationLimit: parsed.data.automationLimit,
        chatbotLimit: parsed.data.chatbotLimit,
        features: parsed.data.features ?? {},
        isActive: parsed.data.isActive ?? true,
      },
    });

    return successResponse({ ...plan, price: Number(plan.price) }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}