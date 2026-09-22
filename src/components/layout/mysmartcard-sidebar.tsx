"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bot,
  ChevronsLeft,
  ChevronsRight,
  CreditCard,
  FileText,
  LayoutDashboard,
  MessageSquare,
  Package,
  Settings,
  Sparkles,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

const MYSMARTCARD_NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [{ title: "Dashboard", href: "/private/mysmartcard", icon: LayoutDashboard }],
  },
  {
    label: "AI & Knowledge",
    items: [
      { title: "AI Agent", href: "/private/mysmartcard/ai", icon: Bot },
      { title: "Knowledge Base", href: "/private/mysmartcard/knowledge", icon: Sparkles },
      { title: "Products", href: "/private/mysmartcard/products", icon: Package },
      { title: "Templates", href: "/private/mysmartcard/templates", icon: FileText },
    ],
  },
  {
    label: "Engagement",
    items: [
      { title: "Conversations", href: "/private/mysmartcard/conversations", icon: MessageSquare },
      { title: "Leads", href: "/private/mysmartcard/leads", icon: Users },
      { title: "Automations", href: "/private/mysmartcard/automations", icon: Zap },
    ],
  },
  {
    label: "Insights",
    items: [
      { title: "Analytics", href: "/private/mysmartcard/analytics", icon: BarChart3 },
      { title: "Settings", href: "/private/mysmartcard/settings", icon: Settings },
    ],
  },
];

interface MySmartCardSidebarUser {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

export interface MySmartCardSidebarProps {
  currentPath?: string;
  user?: MySmartCardSidebarUser | null;
  collapsible?: boolean;
  onNavigate?: () => void;
  className?: string;
}

export function MySmartCardSidebar({
  currentPath,
  user,
  collapsible = true,
  onNavigate,
  className,
}: MySmartCardSidebarProps) {
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
    "M";

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
            href="/private/mysmartcard"
            onClick={onNavigate}
            className={cn(
              "flex min-w-0 items-center gap-2.5",
              isCollapsed && "mx-auto justify-center"
            )}
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-sm shadow-blue-500/20">
              <CreditCard className="size-5" />
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <p className="truncate text-[15px] font-extrabold tracking-tight">
                  MySmartCard
                </p>
                <p className="truncate text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  AI Sales & Support
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
            {MYSMARTCARD_NAV_GROUPS.map((group) => {
              const isActiveGroup = group.items.some(
                (item) =>
                  activePath === item.href ||
                  (item.href !== "/private/mysmartcard" &&
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
                      (item.href !== "/private/mysmartcard" &&
                        activePath.startsWith(`${item.href}/`));

                    const link = (
                      <Link
                        key={item.title}
                        href={item.href}
                        onClick={onNavigate}
                        className={cn(
                          "relative flex h-9 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
                          isActive
                            ? "bg-blue-500/10 text-blue-700 dark:text-blue-400"
                            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                          isCollapsed && "justify-center px-0"
                        )}
                      >
                        <item.icon
                          className={cn(
                            "size-[18px] shrink-0",
                            isActive && "text-blue-600 dark:text-blue-400"
                          )}
                        />
                        {!isCollapsed && (
                          <>
                            <span className="truncate">{item.title}</span>
                            {isActive && (
                              <span className="ml-auto size-1.5 rounded-full bg-blue-500" />
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
                alt={user?.name ?? "MySmartCard"}
              />
              <AvatarFallback className="bg-blue-500/10 text-blue-700 dark:text-blue-400">
                {initials}
              </AvatarFallback>
            </Avatar>
            {!isCollapsed && (
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {user?.name ?? "MySmartCard"}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {user?.email ?? "Admin"}
                </p>
              </div>
            )}
          </div>
        </div>
      </aside>
    </TooltipProvider>
  );
}
