import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { createWhatsAppProvider } from "@/lib/whatsapp";
import { successResponse } from "@/lib/api-utils";
import { handleApiError, UnauthorizedError } from "@/lib/errors";

export async function POST() {
  try {
    const session = await auth();
    const workspaceId = session?.user?.workspaceId;
    if (!workspaceId) throw new UnauthorizedError();

    const whatsappAccounts = await prisma.whatsAppAccount.findMany({
      where: { workspaceId, status: "CONNECTED" },
    });

    if (whatsappAccounts.length === 0) {
      return successResponse({ synced: 0, message: "No connected WhatsApp accounts" });
    }

    const provider = createWhatsAppProvider();
    let synced = 0;

    for (const account of whatsappAccounts) {
      try {
        const remoteTemplates = await provider.getTemplates(account.wabaId);

        for (const remote of remoteTemplates) {
          const statusMap: Record<string, string> = {
            APPROVED: "APPROVED",
            PENDING: "PENDING",
            REJECTED: "REJECTED",
            DISABLED: "DISABLED",
          };

          const newStatus = statusMap[remote.status] || "PENDING";

          const existing = await prisma.template.findFirst({
            where: {
              workspaceId,
              OR: [
                { metaTemplateId: remote.id },
                {
                  name: remote.name,
                  language: remote.language,
                  wabaAccountId: account.id,
                },
              ],
            },
          });

          const headerComp = remote.components?.find(
            (c: { type?: string }) => c.type?.toLowerCase() === "header"
          );
          const bodyComp = remote.components?.find(
            (c: { type?: string }) => c.type?.toLowerCase() === "body"
          );
          const footerComp = remote.components?.find(
            (c: { type?: string }) => c.type?.toLowerCase() === "footer"
          );
          const buttonsComp = remote.components?.find(
            (c: { type?: string }) => c.type?.toLowerCase() === "buttons"
          );

          const headerData = headerComp
            ? { type: "text", text: headerComp.text || "" }
            : undefined;
          const bodyData = bodyComp
            ? { text: bodyComp.text || "" }
            : undefined;
          const footerData = footerComp?.text || undefined;
          const buttonsData = buttonsComp
            ? (buttonsComp as unknown as { buttons?: Array<{ type: string; text: string; url?: string }> }).buttons?.map((b) => ({
                type: b.type,
                text: b.text,
                ...(b.url ? { url: b.url } : {}),
              }))
            : undefined;

          const templateData: Record<string, unknown> = {
            status: newStatus as "APPROVED" | "PENDING" | "REJECTED" | "DISABLED" | "DRAFT" | "PAUSED",
            metaTemplateId: remote.id,
            header: headerData,
            body: bodyData,
            footer: footerData,
            buttons: buttonsData,
          };

          if (existing) {
            await prisma.template.update({
              where: { id: existing.id },
              data: templateData,
            });
          } else {
            await prisma.template.create({
              data: {
                workspaceId,
                wabaAccountId: account.id,
                name: remote.name,
                language: remote.language,
                category: remote.category,
                ...templateData,
              },
            });
          }
          synced++;
        }
      } catch (err) {
        console.error(`Failed to sync templates for account ${account.id}:`, err);
      }
    }

    return successResponse({ synced });
  } catch (error) {
    return handleApiError(error);
  }
}
