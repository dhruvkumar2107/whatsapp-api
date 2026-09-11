"use client";

import * as React from "react";
import {
  Activity,
  AlertTriangle,
  DollarSign,
  MessageSquare,
  Phone,
  TrendingUp,
  Users,
  Wifi,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface AdminStats {
  totalCustomers: number;
  activeCustomers: number;
  connectedAccounts: number;
  messagesToday: number;
  messagesThisMonth: number;
  revenue: number;
  failedMessages: number;
  systemHealth: string;
  recentActivity: Array<{
    id: string;
    action: string;
    actor: string;
    timestamp: string;
    type: string;
  }>;
}

const statCards = [
  {
    key: "totalCustomers" as const,
    label: "Total Customers",
    icon: Users,
    format: "number" as const,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-500/10",
  },
  {
    key: "activeCustomers" as const,
    label: "Active Customers",
    icon: Users,
    format: "number" as const,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10",
  },
  {
    key: "connectedAccounts" as const,
    label: "Connected WhatsApp",
    icon: Phone,
    format: "number" as const,
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-500/10",
  },
  {
    key: "messagesToday" as const,
    label: "Messages Today",
    icon: MessageSquare,
    format: "number" as const,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10",
  },
  {
    key: "messagesThisMonth" as const,
    label: "Messages This Month",
    icon: TrendingUp,
    format: "number" as const,
    color: "text-cyan-600 dark:text-cyan-400",
    bg: "bg-cyan-500/10",
  },
  {
    key: "revenue" as const,
    label: "Revenue",
    icon: DollarSign,
    format: "currency" as const,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10",
  },
  {
    key: "failedMessages" as const,
    label: "Failed Messages",
    icon: AlertTriangle,
    format: "number" as const,
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-500/10",
  },
  {
    key: "systemHealth" as const,
    label: "System Health",
    icon: Activity,
    format: "text" as const,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10",
  },
];

export default function AdminOverviewPage() {
  const [stats, setStats] = React.useState<AdminStats | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((body) => {
        if (body.success) setStats(body.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function formatValue(value: number | string, format: string) {
    if (format === "currency") {
      return `$${Number(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (format === "number") {
      return Number(value).toLocaleString();
    }
    return String(value);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin Overview</h1>
        <p className="text-muted-foreground">
          Platform-wide statistics and activity.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.key}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardDescription className="text-xs font-medium uppercase tracking-wider">
                {card.label}
              </CardDescription>
              <div className={`rounded-lg p-2 ${card.bg}`}>
                <card.icon className={`size-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-7 w-24" />
              ) : (
                <div className="text-2xl font-bold">
                  {card.key === "systemHealth"
                    ? formatValue(
                        (stats?.systemHealth ?? "unknown") as number | string,
                        card.format
                      )
                    : formatValue(
                        (stats?.[card.key] ?? 0) as number | string,
                        card.format
                      )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Activity</CardTitle>
            <CardDescription>Latest platform actions.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !stats?.recentActivity?.length ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No recent activity.
              </p>
            ) : (
              <div className="space-y-3">
                {stats.recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 rounded-lg border p-3"
                  >
                    <div className="mt-0.5">
                      <Activity className="size-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">
                        <span className="font-medium">{activity.actor}</span>{" "}
                        {activity.action}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(activity.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <Badge variant="outline" className="shrink-0 text-[10px]">
                      {activity.type}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Platform Health</CardTitle>
            <CardDescription>System status overview.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-2">
                    <Wifi className="size-4 text-emerald-600" />
                    <span className="text-sm font-medium">API Status</span>
                  </div>
                  <Badge variant="success" className="text-[10px]">
                    Operational
                  </Badge>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-2">
                    <Phone className="size-4 text-emerald-600" />
                    <span className="text-sm font-medium">WhatsApp Gateway</span>
                  </div>
                  <Badge variant="success" className="text-[10px]">
                    Connected
                  </Badge>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-2">
                    <Activity className="size-4 text-emerald-600" />
                    <span className="text-sm font-medium">Database</span>
                  </div>
                  <Badge variant="success" className="text-[10px]">
                    Healthy
                  </Badge>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="size-4 text-emerald-600" />
                    <span className="text-sm font-medium">Message Queue</span>
                  </div>
                  <Badge variant="success" className="text-[10px]">
                    Processing
                  </Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
