"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

import { cn } from "@/lib/utils";
import { MySmartCardSidebar } from "@/components/layout/mysmartcard-sidebar";
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
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Bell, CreditCard, LogOut, Menu } from "lucide-react";
import { signOut } from "next-auth/react";

export default function MySmartCardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [sheetOpen, setSheetOpen] = React.useState(false);

  React.useEffect(() => {
    if (status === "unauthenticated") {
      window.location.replace("/auth/login");
    }
  }, [status]);

  const user = session?.user ?? null;

  if (status === "loading") {
    return (
      <div className="flex h-svh items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (status === "authenticated" && user?.role && !["SUPER_ADMIN", "OWNER", "ADMIN"].includes(user.role)) {
    return (
      <div className="flex h-svh flex-col items-center justify-center gap-4">
        <CreditCard className="size-12 text-destructive" />
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground">
          You do not have permission to access MySmartCard.
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
    "M";

  return (
    <div className="flex h-svh w-full overflow-hidden bg-muted/40 dark:bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:bg-background focus:p-2"
      >
        Skip to content
      </a>

      <aside className="hidden shrink-0 lg:block">
        <MySmartCardSidebar
          currentPath={pathname}
          user={user}
          collapsible
        />
      </aside>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="left" className="w-[300px] p-0 sm:max-w-[300px]">
          <MySmartCardSidebar
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
            <Badge
              variant="secondary"
              className="gap-1 bg-blue-500/10 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300"
            >
              <CreditCard className="size-3" />
              MySmartCard
            </Badge>
          </div>

          <div className="flex items-center gap-1">
            <ThemeToggle />

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
                      alt={user?.name ?? "MySmartCard Admin"}
                    />
                    <AvatarFallback className="bg-blue-500/10 text-xs font-semibold text-blue-700 dark:text-blue-400">
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
                <DropdownMenuItem asChild>
                  <a href="/dashboard" className="gap-2">
                    <Bell className="size-4" />
                    WHAATOPRO Dashboard
                  </a>
                </DropdownMenuItem>
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
