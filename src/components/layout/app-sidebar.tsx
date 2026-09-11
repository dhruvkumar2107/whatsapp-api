import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { Sidebar } from "./sidebar";

export default async function AppSidebar() {
  const session = await auth();
  const workspaceId = session?.user?.workspaceId;

  let workspaceName: string | undefined;

  if (workspaceId) {
    const workspace = await prisma.workspace
      .findUnique({
        where: { id: workspaceId },
        select: { name: true },
      })
      .catch(() => null);

    workspaceName = workspace?.name ?? undefined;
  }

  return (
    <Sidebar
      user={
        session?.user
          ? {
              name: session.user.name,
              email: session.user.email,
              image: session.user.image,
            }
          : null
      }
      workspaceName={workspaceName}
      collapsible
    />
  );
}