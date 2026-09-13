import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { ForbiddenError, UnauthorizedError } from "@/lib/errors";

export interface TenantContext {
  userId: string;
  workspaceId: string;
  role: string;
}

export async function getTenantContext(): Promise<TenantContext> {
  const session = await auth();
  const userId = session?.user?.id;
  const workspaceId = session?.user?.workspaceId;
  const role = session?.user?.role;

  if (!userId) {
    throw new UnauthorizedError("Authentication required");
  }

  if (!workspaceId) {
    throw new ForbiddenError("No workspace associated with this account");
  }

  return { userId, workspaceId, role: role || "VIEWER" };
}

export async function requireTenantRole(
  allowedRoles: string[]
): Promise<TenantContext> {
  const ctx = await getTenantContext();
  if (!allowedRoles.includes(ctx.role)) {
    throw new ForbiddenError(
      `This action requires one of the following roles: ${allowedRoles.join(", ")}`
    );
  }
  return ctx;
}

export async function validateWorkspaceAccess(
  workspaceId: string
): Promise<TenantContext> {
  const ctx = await getTenantContext();
  if (ctx.workspaceId !== workspaceId) {
    throw new ForbiddenError("You do not have access to this workspace");
  }
  return ctx;
}

export async function getWorkspaceMemberCount(workspaceId: string) {
  return prisma.workspaceMember.count({ where: { workspaceId } });
}
