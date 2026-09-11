import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { createWhatsAppProvider } from "@/lib/whatsapp";
import { successResponse } from "@/lib/api-utils";
import {
  handleApiError,
  UnauthorizedError,
  NotFoundError,
  ValidationError,
} from "@/lib/errors";

export async function POST(
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
      include: {
        whatsAppAccount: true,
      },
    });

    if (!template) throw new NotFoundError("Template");

    if (template.status !== "DRAFT" && template.status !== "REJECTED") {
      return handleApiError(
        new ValidationError("Only draft or rejected templates can be submitted")
      );
    }

    if (!template.whatsAppAccount) {
      return handleApiError(
        new ValidationError(
          "No WhatsApp account connected. Please connect a WhatsApp account first."
        )
      );
    }

    const provider = createWhatsAppProvider();

    const components: Array<{
      type: "HEADER" | "BODY" | "BUTTON" | "FOOTER";
      text?: string;
      parameters?: Array<{ type: string; example?: string }>;
      buttons?: Array<{ type: string; text: string; url?: string }>;
    }> = [];

    const header = template.header as { type?: string; text?: string } | null;
    if (header?.text) {
      components.push({ type: "HEADER", text: header.text });
    }

    const bodyObj = template.body as { text?: string } | null;
    if (bodyObj?.text) {
      components.push({ type: "BODY", text: bodyObj.text });
    }

    if (template.footer) {
      components.push({ type: "FOOTER", text: template.footer });
    }

    if (template.buttons) {
      const buttonsData = template.buttons as Array<{ type: string; text: string; url?: string }>;
      if (Array.isArray(buttonsData) && buttonsData.length > 0) {
        for (const btn of buttonsData) {
          components.push({
            type: "BUTTON",
            text: btn.text,
            ...(btn.url ? { url: btn.url } : {}),
          });
        }
      }
    }

    const result = await provider.createTemplate({
      wabaId: template.whatsAppAccount.wabaId,
      name: template.name,
      language: template.language,
      category: template.category,
      components,
    });

    const updated = await prisma.template.update({
      where: { id },
      data: {
        status: "PENDING",
        metaTemplateId: result.id,
        rejectionReason: null,
      },
    });

    return successResponse(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
