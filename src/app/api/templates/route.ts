import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { templateSchema } from "@/lib/validators";
import { successResponse, paginateResponse, getSearchParams } from "@/lib/api-utils";
import { handleApiError, UnauthorizedError, ValidationError } from "@/lib/errors";

function extractTemplateFields(components: Array<{ type: string; text?: string; parameters?: unknown[] }>) {
  const header = components.find((c) => c.type === "HEADER");
  const body = components.find((c) => c.type === "BODY");
  const footer = components.find((c) => c.type === "FOOTER");
  const buttons = components.find((c) => c.type === "BUTTONS");

  return {
    header: header ? { type: "text", text: header.text || "" } : undefined,
    body: body ? { text: body.text || "" } : undefined,
    footer: footer?.text || undefined,
    buttons: buttons?.text ? JSON.parse(buttons.text) : undefined,
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const workspaceId = session?.user?.workspaceId;
    if (!workspaceId) throw new UnauthorizedError();

    const { page, limit, search, sortBy, sortOrder, filters } = getSearchParams(request);

    const where: Record<string, unknown> = { workspaceId };
    if (filters.status) where.status = filters.status;
    if (filters.category) where.category = filters.category;
    if (filters.language) where.language = filters.language;
    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }

    const [templates, total] = await Promise.all([
      prisma.template.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          name: true,
          category: true,
          language: true,
          status: true,
          header: true,
          body: true,
          footer: true,
          buttons: true,
          rejectionReason: true,
          metaTemplateId: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.template.count({ where }),
    ]);

    return paginateResponse(templates, total, page, limit);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const workspaceId = session?.user?.workspaceId;
    if (!workspaceId) throw new UnauthorizedError();

    const body = await request.json();
    const parsed = templateSchema.safeParse(body);
    if (!parsed.success) {
      return handleApiError(
        new ValidationError(
          parsed.error.flatten().fieldErrors as Record<string, string[]>
        )
      );
    }

    const fields = extractTemplateFields(parsed.data.components);

    const template = await prisma.template.create({
      data: {
        workspaceId,
        name: parsed.data.name,
        language: parsed.data.language,
        category: parsed.data.category,
        header: fields.header ?? undefined,
        body: fields.body ?? undefined,
        footer: fields.footer,
        buttons: fields.buttons ?? undefined,
        status: "DRAFT",
      },
    });

    return successResponse(template, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
