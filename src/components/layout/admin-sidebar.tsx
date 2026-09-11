"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  ChevronsLeft,
  ChevronsRight,
  CreditCard,
  FileText,
  Globe,
  Headphones,
  LayoutDashboard,
  MessageSquare,
  MessagesSquare,
  Phone,
  Settings,
  Shield,
  Users,
  Webhook,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const ADMIN_NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [{ title: "Overview", href: "/admin", icon: LayoutDashboard }],
  },
  {
    label: "Management",
    items: [
      { title: "Customers", href: "/admin/customers", icon: Users },
      { title: "Workspaces", href: "/admin/workspaces", icon: Globe },
      { title: "WhatsApp Accounts", href: "/admin/whatsapp", icon: Phone },
      { title: "Plans", href: "/admin/plans", icon: CreditCard },
      { title: "Subscriptions", href: "/admin/subscriptions", icon: BookOpen },
    ],
  },
  {
    label: "Monitoring",
    items: [
      { title: "Messages", href: "/admin/messages", icon: MessageSquare },
      { title: "Webhooks", href: "/admin/webhooks", icon: Webhook },
      { title: "Audit Logs", href: "/admin/audit-logs", icon: Shield },
      { title: "System Logs", href: "/admin/system-logs", icon: FileText },
    ],
  },
  {
    label: "Support",
    items: [
      { title: "Support", href: "/admin/support", icon: Headphones },
      { title: "Settings", href: "/admin/settings", icon: Settings },
    ],
  },
];

interface AdminSidebarUser {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

export interface AdminSidebarProps {
  currentPath?: string;
  user?: AdminSidebarUser | null;
  collapsible?: boolean;
  onNavigate?: () => void;
  className?: string;
}

export function AdminSidebar({
  currentPath,
  user,
  collapsible = true,
  onNavigate,
  className,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const activePath = currentPath ?? pathname;
  const [collapsed, setCollapsed] = React.useState(false);
  const isCollapsed = collapsible && collapsed;

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
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "flex h-full flex-col border-r bg-sidebar text-sidebar-foreground",
          "transition-[width] duration-300 ease-in-out",
          isCollapsed ? "w-[72px]" : "w-64",
          className
        )}
      >
        <div className="relative flex h-16 shrink-0 items-center px-4">
          <Link
            href="/admin"
            onClick={onNavigate}
            className={cn(
              "flex min-w-0 items-center gap-2.5",
              isCollapsed && "mx-auto justify-center"
            )}
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-sm shadow-violet-500/20">
              <MessagesSquare className="size-5" />
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <p className="truncate text-[15px] font-extrabold tracking-tight">
                  WHAATOPRO
                </p>
                <p className="truncate text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Admin Panel
                </p>
              </div>
            )}
          </Link>
          {collapsible && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed((c) => !c)}
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              className={cn(
                "absolute top-1/2 size-8 -translate-y-1/2 text-muted-foreground",
                isCollapsed ? "right-2.5" : "right-3"
              )}
            >
              {isCollapsed ? (
                <ChevronsRight className="size-4" />
              ) : (
                <ChevronsLeft className="size-4" />
              )}
            </Button>
          )}
        </div>

        <div className="px-3">
          <div className="h-px bg-border" />
        </div>

        <ScrollArea className="min-h-0 flex-1">
          <nav className="flex flex-col gap-5 px-3 py-4">
            {ADMIN_NAV_GROUPS.map((group) => {
              const isActiveGroup = group.items.some(
                (item) =>
                  activePath === item.href ||
                  (item.href !== "/admin" &&
                    activePath.startsWith(`${item.href}/`))
              );
              return (
                <div key={group.label} className="flex flex-col gap-1">
                  {!isCollapsed && (
                    <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {group.label}
                    </p>
                  )}
                  {isCollapsed && (
                    <div
                      className={cn(
                        "px-3 pb-1.5",
                        isActiveGroup ? "visible" : "opacity-0"
                      )}
                    >
                      <div className="h-px w-full bg-border" />
                    </div>
                  )}
                  {group.items.map((item) => {
                    const isActive =
                      activePath === item.href ||
                      (item.href !== "/admin" &&
                        activePath.startsWith(`${item.href}/`));

                    const link = (
                      <Link
                        key={item.title}
                        href={item.href}
                        onClick={onNavigate}
                        className={cn(
                          "relative flex h-9 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
                          isActive
                            ? "bg-violet-500/10 text-violet-700 dark:text-violet-400"
                            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                          isCollapsed && "justify-center px-0"
                        )}
                      >
                        <item.icon
                          className={cn(
                            "size-[18px] shrink-0",
                            isActive && "text-violet-600 dark:text-violet-400"
                          )}
                        />
                        {!isCollapsed && (
                          <>
                            <span className="truncate">{item.title}</span>
                            {isActive && (
                              <span className="ml-auto size-1.5 rounded-full bg-violet-500" />
                            )}
                          </>
                        )}
                      </Link>
                    );

                    return isCollapsed ? (
                      <Tooltip key={item.title} delayDuration={0}>
                        <TooltipTrigger asChild>{link}</TooltipTrigger>
                        <TooltipContent side="right" sideOffset={8}>
                          {item.title}
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      link
                    );
                  })}
                </div>
              );
            })}
          </nav>
        </ScrollArea>

        <div className="shrink-0 border-t p-3">
          <div
            className={cn(
              "flex items-center gap-3 rounded-xl bg-muted/40 p-2.5",
              isCollapsed && "w-full justify-center"
            )}
          >
            <Avatar className="size-9 shrink-0 border">
              <AvatarImage
                src={user?.image ?? undefined}
                alt={user?.name ?? "Admin"}
              />
              <AvatarFallback className="bg-violet-500/10 text-violet-700 dark:text-violet-400">
                {initials}
              </AvatarFallback>
            </Avatar>
            {!isCollapsed && (
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {user?.name ?? "Admin"}
                </p>
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-xs text-muted-foreground">
                    {user?.email}
                  </p>
                  <Badge
                    variant="secondary"
                    className="shrink-0 px-1.5 py-0 text-[9px] font-bold uppercase"
                  >
                    Admin
                  </Badge>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>
    </TooltipProvider>
  );
}
