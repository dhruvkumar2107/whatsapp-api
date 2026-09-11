"use client";

import * as React from "react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import {
  Bell,
  Building2,
  Check,
  ChevronsUpDown,
  CircleHelp,
  LogOut,
  Menu,
  Settings,
  User,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface TopNavProps {
  workspaceName?: string;
  whatsappConnected?: boolean;
  onMenuToggle?: () => void;
  className?: string;
}

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export function TopNav({
  workspaceName,
  whatsappConnected = true,
  onMenuToggle,
  className,
}: TopNavProps) {
  const { data: session } = useSession();
  const user = session?.user;
  const [notifications, setNotifications] = React.useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [mockMode, setMockMode] = React.useState(false);

  React.useEffect(() => {
    fetch("/api/system/status")
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (body?.mockMode) setMockMode(true);
      })
      .catch(() => {});
  }, []);

  const loadNotifications = React.useCallback(() => {
    fetch("/api/notifications?limit=8")
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (body?.data) {
          setNotifications(body.data);
          setUnreadCount(body.data.filter((n: NotificationItem) => !n.isRead).length);
        }
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

  const initials =
    user?.name?.split(" ").map((p) => p.charAt(0)).slice(0, 2).join("").toUpperCase() ??
    user?.email?.charAt(0).toUpperCase() ??
    "W";

  return (
    <div
      className={cn(
        "flex h-16 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:px-6",
        className
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {onMenuToggle && (
          <Button
            variant="ghost"
            size="icon"
            className="-ml-1 size-8 shrink-0 text-muted-foreground lg:hidden"
            onClick={onMenuToggle}
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="flex h-9 max-w-[240px] items-center gap-2 px-2 font-medium"
            >
              <Building2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span className="min-w-0 flex-1 truncate">
                {workspaceName ?? user?.name ?? "My Workspace"}
              </span>
              <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
            <DropdownMenuItem className="gap-2">
              <span className="flex flex-col">
                <span className="font-semibold">
                  {workspaceName ?? user?.name ?? "My Workspace"}
                </span>
                <span className="text-xs text-muted-foreground">Current workspace</span>
              </span>
              <Check className="ml-auto size-4 text-emerald-600 dark:text-emerald-400" />
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings" className="gap-2">
                <Settings className="size-4" />
                Manage workspaces
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {mockMode && (
          <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-red-500/10 px-2.5 text-xs font-semibold text-red-600 dark:text-red-400">
            <span className="size-1.5 rounded-full bg-red-500 shadow-[0_0_6px] shadow-red-500/60" />
            MOCK MODE
          </span>
        )}

        <span
          className={cn(
            "inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium",
            whatsappConnected
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
              : "bg-red-500/10 text-red-600 dark:text-red-400"
          )}
        >
          <span
            className={cn(
              "size-1.5 rounded-full",
              whatsappConnected
                ? "bg-emerald-500 shadow-[0_0_6px] shadow-emerald-500/60"
                : "bg-red-500"
            )}
          />
          {whatsappConnected ? "Connected" : "Disconnected"}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative text-muted-foreground"
              aria-label={`${unreadCount} notifications`}
            >
              <Bell className="size-5" />
              {unreadCount > 0 && (
                <Badge className="absolute -right-0.5 -top-0.5 size-4 min-w-4 items-center justify-center rounded-full p-0 text-[10px] font-bold">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>
              <div className="flex items-center justify-between">
                <span>Notifications</span>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllRead}
                    className="text-xs font-normal text-emerald-600 hover:underline dark:text-emerald-400"
                  >
                    Mark all read
                  </button>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifications.length > 0 ? (
              <div className="max-h-80 overflow-y-auto">
                {notifications.map((notification) => (
                  <DropdownMenuItem key={notification.id} className="items-start gap-2 py-2">
                    <span
                      className={
                        notification.isRead
                          ? "mt-1.5 size-1.5 shrink-0 rounded-full bg-transparent"
                          : "mt-1.5 size-1.5 shrink-0 rounded-full bg-emerald-500"
                      }
                    />
                    <span className="flex min-w-0 flex-col">
                      <span
                        className={cn(
                          "text-sm",
                          notification.isRead ? "font-normal" : "font-semibold"
                        )}
                      >
                        {notification.title}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {notification.message}
                      </span>
                      <span className="mt-0.5 text-[11px] text-muted-foreground/70">
                        {new Date(notification.createdAt).toLocaleString()}
                      </span>
                    </span>
                  </DropdownMenuItem>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1 px-2 py-6 text-center">
                <Bell className="size-5 text-muted-foreground" />
                <p className="text-sm font-medium">You’re all caught up</p>
                <p className="text-xs text-muted-foreground">
                  No new notifications right now.
                </p>
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="text-muted-foreground" asChild>
              <Link href="/help" aria-label="Help">
                <CircleHelp className="size-5" />
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Help &amp; support</TooltipContent>
        </Tooltip>

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
                  alt={user?.name ?? "User"}
                />
                <AvatarFallback className="bg-emerald-500/10 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <p className="text-sm font-semibold">{user?.name ?? "Signed in"}</p>
              <p className="text-xs font-normal text-muted-foreground">
                {user?.email}
              </p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings/profile" className="gap-2">
                <User className="size-4" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings" className="gap-2">
                <Settings className="size-4" />
                Settings
              </Link>
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
  );
}