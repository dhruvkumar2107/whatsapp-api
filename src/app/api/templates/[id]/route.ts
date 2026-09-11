import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { templateSchema } from "@/lib/validators";
import { successResponse } from "@/lib/api-utils";
import {
  handleApiError,
  UnauthorizedError,
  NotFoundError,
  ValidationError,
} from "@/lib/errors";

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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const workspaceId = session?.user?.workspaceId;
    if (!workspaceId) throw new UnauthorizedError();

    const { id } = await params;

    const template = await prisma.template.findFirst({
      where: { id, workspaceId },
    });

    if (!template) throw new NotFoundError("Template");

    return successResponse(template);
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

    const existing = await prisma.template.findFirst({
      where: { id, workspaceId },
    });

    if (!existing) throw new NotFoundError("Template");

    if (existing.status !== "DRAFT" && existing.status !== "REJECTED") {
      return handleApiError(
        new ValidationError(
          "Only draft or rejected templates can be edited"
        )
      );
    }

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

    const template = await prisma.template.update({
      where: { id },
      data: {
        name: parsed.data.name,
        language: parsed.data.language,
        category: parsed.data.category,
        header: fields.header ?? undefined,
        body: fields.body ?? undefined,
        footer: fields.footer,
        buttons: fields.buttons ?? undefined,
        status: existing.status === "REJECTED" ? "DRAFT" : existing.status,
        rejectionReason: existing.status === "REJECTED" ? null : undefined,
      },
    });

    return successResponse(template);
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

    const existing = await prisma.template.findFirst({
      where: { id, workspaceId },
    });

    if (!existing) throw new NotFoundError("Template");

    if (existing.status === "PENDING") {
      return handleApiError(
        new ValidationError("Cannot delete a template pending review")
      );
    }

    await prisma.template.delete({ where: { id } });

    return successResponse({ message: "Template deleted" });
  } catch (error) {
    return handleApiError(error);
  }
}
