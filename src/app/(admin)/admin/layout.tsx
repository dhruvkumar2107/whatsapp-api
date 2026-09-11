"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

import { GlobalSearch } from "@/components/global-search";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Bell,
  LogOut,
  Menu,
  Shield,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [mockMode, setMockMode] = React.useState(false);
  const [notifications, setNotifications] = React.useState<Array<{
    id: string;
    type: string;
    title: string;
    message: string;
    isRead: boolean;
    createdAt: string;
  }>>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);

  const loadNotifications = React.useCallback(() => {
    fetch("/api/notifications?limit=8")
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (body?.data) {
          setNotifications(body.data);
          setUnreadCount(body.data.filter((n: { isRead: boolean }) => !n.isRead).length);
        }
      })
      .catch(() => {});
  }, []);

  React.useEffect(() => {
    fetch("/api/system/status")
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (body?.mockMode) setMockMode(true);
      })
      .catch(() => {});
  }, []);

  React.useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  const markAllRead = React.useCallback(() => {
    void fetch("/api/notifications/read", { method: "POST" })
      .then(() => loadNotifications())
      .catch(() => {});
  }, [loadNotifications]);

  React.useEffect(() => {
    if (status === "unauthenticated") {
      window.location.replace("/auth/login");
    }
  }, [status]);

  const user = session?.user ?? null;
  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  if (status === "loading") {
    return (
      <div className="flex h-svh items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
      </div>
    );
  }

  if (status === "authenticated" && !isSuperAdmin) {
    return (
      <div className="flex h-svh flex-col items-center justify-center gap-4">
        <Shield className="size-12 text-destructive" />
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground">
          You do not have permission to access the admin panel.
        </p>
        <Button asChild>
          <a href="/dashboard">Return to Dashboard</a>
        </Button>
      </div>
    );
  }

  const initials =
    user?.name
      ?.split(" ")
      .map((p) => p.charAt(0))
      .slice(0, 2)
      .join("")
      .toUpperCase() ??
    user?.email?.charAt(0).toUpperCase() ??
    "A";

  return (
    <div className="flex h-svh w-full overflow-hidden bg-muted/40 dark:bg-background">
      <GlobalSearch />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:bg-background focus:p-2"
      >
        Skip to content
      </a>

      <aside className="hidden shrink-0 lg:block">
        <AdminSidebar
          currentPath={pathname}
          user={user}
          collapsible
        />
      </aside>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="left" className="w-[300px] p-0 sm:max-w-[300px]">
          <AdminSidebar
            currentPath={pathname}
            user={user}
            collapsible={false}
            onNavigate={() => setSheetOpen(false)}
          />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-16 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="-ml-1 size-8 shrink-0 text-muted-foreground lg:hidden"
            onClick={() => setSheetOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </Button>

          <div className="flex min-w-0 flex-1 items-center gap-3">
            {mockMode && (
              <Badge
                variant="secondary"
                className="gap-1 bg-red-500/10 text-red-600 dark:text-red-400"
              >
                <span className="size-1.5 rounded-full bg-red-500 shadow-[0_0_6px] shadow-red-500/60" />
                MOCK MODE
              </Badge>
            )}
            <Badge
              variant="secondary"
              className="gap-1 bg-violet-500/10 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300"
            >
              <Shield className="size-3" />
              Super Admin
            </Badge>
          </div>

          <div className="flex items-center gap-1">
            <ThemeToggle />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative text-muted-foreground"
                  aria-label="Notifications"
                >
                  <Bell className="size-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel className="flex items-center justify-between">
                  <span>Notifications</span>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={markAllRead}
                      className="text-xs font-normal text-muted-foreground hover:text-foreground"
                    >
                      Mark all read
                    </button>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center gap-1 px-2 py-6 text-center">
                    <Bell className="size-5 text-muted-foreground" />
                    <p className="text-sm font-medium">No notifications</p>
                  </div>
                ) : (
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`flex flex-col gap-0.5 px-3 py-2 text-sm ${!n.isRead ? "bg-muted/50" : ""}`}
                      >
                        <div className="flex items-center gap-2">
                          {!n.isRead && (
                            <span className="size-1.5 shrink-0 rounded-full bg-blue-500" />
                          )}
                          <span className="font-medium">{n.title}</span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-1 gap-2 px-1.5"
                  aria-label="Account menu"
                >
                  <Avatar className="size-8 border">
                    <AvatarImage
                      src={user?.image ?? undefined}
                      alt={user?.name ?? "Admin"}
                    />
                    <AvatarFallback className="bg-violet-500/10 text-xs font-semibold text-violet-700 dark:text-violet-400">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <p className="text-sm font-semibold">{user?.name ?? "Admin"}</p>
                  <p className="text-xs font-normal text-muted-foreground">
                    {user?.email}
                  </p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  asChild
                  className="text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400"
                >
                  <button
                    type="button"
                    onClick={() => signOut({ callbackUrl: "/auth/login" })}
                    className="w-full gap-2"
                  >
                    <LogOut className="size-4" />
                    Logout
                  </button>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <main id="main-content" className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1400px] p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
