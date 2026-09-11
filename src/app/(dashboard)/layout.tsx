"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

import { cn } from "@/lib/utils";
import { Sidebar } from "@/components/layout/sidebar";
import { TopNav } from "@/components/layout/top-nav";
import { Sheet, SheetContent } from "@/components/ui/sheet";

interface DashboardShellData {
  workspaceName?: string;
  whatsappConnected?: boolean;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [shell, setShell] = React.useState<DashboardShellData>({});

  React.useEffect(() => {
    if (status === "unauthenticated") {
      window.location.replace("/auth/login");
    }
  }, [status]);

  React.useEffect(() => {
    let cancelled = false;

    fetch("/api/dashboard/stats")
      .then((res) => (res.ok ? res.json() : null))
      .then((body: { data?: DashboardShellData } | null) => {
        if (cancelled || !body?.data) return;
        setShell({
          workspaceName: body.data.workspaceName,
          whatsappConnected: body.data.whatsappConnected,
        });
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  const user = session?.user ?? null;

  return (
    <div className="flex h-svh w-full overflow-hidden bg-muted/40 dark:bg-background">
      <aside className="hidden shrink-0 lg:block">
        <Sidebar
          currentPath={pathname}
          workspaceName={shell.workspaceName}
          user={user}
          collapsible
        />
      </aside>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="left" className="w-[300px] p-0 sm:max-w-[300px]">
          <Sidebar
            currentPath={pathname}
            workspaceName={shell.workspaceName}
            user={user}
            collapsible={false}
            onNavigate={() => setSheetOpen(false)}
          />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <TopNav
          onMenuToggle={() => setSheetOpen(true)}
          workspaceName={shell.workspaceName}
          whatsappConnected={shell.whatsappConnected}
        />
        <main className="min-h-0 flex-1 overflow-y-auto">
          <div
            className={cn(
              "mx-auto w-full",
              pathname.startsWith("/inbox")
                ? "h-screen"
                : "max-w-[1240px] p-4 sm:p-6 lg:p-8"
            )}
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}