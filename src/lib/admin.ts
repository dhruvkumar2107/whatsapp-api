import { auth } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { ForbiddenError, UnauthorizedError } from "@/lib/errors";

export async function requireSuperAdmin() {
  const session = await auth();
  const userId = session?.user?.id;
  const role = session?.user?.role;

  if (!userId) {
    throw new UnauthorizedError("Authentication required");
  }

  if (role !== "SUPER_ADMIN") {
    throw new ForbiddenError("Super admin access required");
  }

  return { userId, workspaceId: session?.user?.workspaceId || undefined };
}

export async function logAdminAction(
  userId: string,
  action: string,
  resource: string,
  resourceId?: string,
  metadata?: Record<string, unknown>,
  ipAddress?: string | null,
  workspaceId?: string
) {
  if (workspaceId) {
    await createAuditLog({
      workspaceId,
      userId,
      action,
      resource,
      resourceId,
      metadata,
      ipAddress: ipAddress ?? undefined,
    });
  }
}