"use client";

import * as React from "react";

import {
  AreaChart,
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CalendarClock,
  CheckCheck,
  ChevronRight,
  Eye,
  Gauge,
  Megaphone,
  MessageSquare,
  Send,
  TrendingDown,
  TrendingUp,
  Users,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface StatsResponse {
  success: boolean;
  data?: {
    workspaceName?: string | null;
    whatsappConnected?: boolean;
    messagesSent: number;
    delivered: number;
    read: number;
    failed: number;
    messagesToday: number;
    activeContacts: number;
    activeCampaigns: number;
    remainingUsage: number;
    planLimit: number;
    deliveryRate: number;
    readRate: number;
  };
}

interface ChartResponse {
  success: boolean;
  data?: ChartPoint[];
}

interface ChartPoint {
  date: string;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
}

type RangeKey = 7 | 30 | 90;

const RANGE_OPTIONS: { value: RangeKey; label: string }[] = [
  { value: 7, label: "7d" },
  { value: 30, label: "30d" },
  { value: 90, label: "90d" },
];

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} />;
}

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  iconClassName,
  trend,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  iconClassName?: string;
  trend?: "up" | "down";
}) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3 p-4 sm:p-5">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-1.5 text-2xl font-bold tracking-tight tabular-nums">
            {value}
          </p>
          {hint && (
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              {trend === "up" && <TrendingUp className="size-3.5 text-emerald-500" />}
              {trend === "down" && <TrendingDown className="size-3.5 text-red-500" />}
              {hint}
            </p>
          )}
        </div>
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted",
            iconClassName
          )}
        >
          <Icon className="size-5" />
        </div>
      </div>
    </Card>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
      <span className="size-2 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = React.useState<NonNullable<StatsResponse["data"]> | null>(null);
  const [range, setRange] = React.useState<RangeKey>(30);
  const [chartData, setChartData] = React.useState<ChartPoint[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [chartLoading, setChartLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch("/api/dashboard/stats")
      .then((res) => res.json())
      .then((body: StatsResponse) => {
        if (cancelled) return;
        if (!body.success || !body.data) {
          setError("We couldn’t load your dashboard right now.");
          return;
        }
        setStats(body.data);
      })
      .catch(() => {
        if (!cancelled) setError("We couldn’t load your dashboard right now.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    setChartLoading(true);

    fetch(`/api/dashboard/chart?days=${range}`)
      .then((res) => res.json())
      .then((body: ChartResponse) => {
        if (cancelled) return;
        setChartData(body.data ?? []);
      })
      .catch(() => {
        if (!cancelled) setChartData([]);
      })
      .finally(() => {
        if (!cancelled) setChartLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [range]);

  const hasData = !loading && !error && stats !== null;
  const hasChartData = chartData.some((d) => d.sent > 0);

  const areaData = chartData.map((d) => ({
    date: d.date.slice(5),
    Sent: d.sent,
    Delivered: d.delivered,
  }));
  const barData = chartData.map((d) => ({
    date: d.date.slice(5),
    Sent: d.sent,
    Delivered: d.delivered,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {hasData && stats?.workspaceName
              ? `${stats.workspaceName}`
              : "Dashboard"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {hasData
              ? "Here’s what’s happening with your WhatsApp messaging today."
              : "Overview of your WhatsApp messaging performance."}
          </p>
        </div>
        {hasData && stats?.whatsappConnected === false && (
          <Button asChild size="sm">
            <Link href="/whatsapp">Connect WhatsApp</Link>
          </Button>
        )}
      </div>

      {error && (
        <Card>
          <div className="flex flex-col items-center gap-3 p-8 text-center">
            <XCircle className="size-8 text-red-500" />
            <div>
              <p className="font-semibold">Something went wrong</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => window.location.reload()}
            >
              Try again
            </Button>
          </div>
        </Card>
      )}

      {loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}>
              <div className="flex items-start justify-between gap-3 p-4 sm:p-5">
                <div className="flex-1 space-y-2">
                  <SkeletonBlock className="h-3.5 w-24" />
                  <SkeletonBlock className="h-7 w-16" />
                  <SkeletonBlock className="h-3 w-28" />
                </div>
                <SkeletonBlock className="size-10 rounded-xl" />
              </div>
            </Card>
          ))}
        </div>
      )}

      {hasData && stats && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Messages Sent"
              value={stats.messagesSent.toLocaleString()}
              hint={`${stats.messagesToday.toLocaleString()} today`}
              icon={Send}
              iconClassName="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            />
            <StatCard
              label="Delivered"
              value={stats.delivered.toLocaleString()}
              hint={`${stats.deliveryRate.toFixed(0)}% delivery rate`}
              icon={CheckCheck}
              iconClassName="bg-teal-500/10 text-teal-600 dark:text-teal-400"
              trend="up"
            />
            <StatCard
              label="Read"
              value={stats.read.toLocaleString()}
              hint={`${stats.readRate.toFixed(0)}% read rate`}
              icon={Eye}
              iconClassName="bg-sky-500/10 text-sky-600 dark:text-sky-400"
              trend="up"
            />
            <StatCard
              label="Failed"
              value={stats.failed.toLocaleString()}
              hint={stats.failed > 0 ? "Needs attention" : "All good"}
              icon={XCircle}
              iconClassName="bg-red-500/10 text-red-600 dark:text-red-400"
              trend={stats.failed > 0 ? "down" : undefined}
            />
            <StatCard
              label="Active Contacts"
              value={stats.activeContacts.toLocaleString()}
              hint="Total in this workspace"
              icon={Users}
              iconClassName="bg-violet-500/10 text-violet-600 dark:text-violet-400"
            />
            <StatCard
              label="Active Campaigns"
              value={stats.activeCampaigns.toLocaleString()}
              hint={stats.activeCampaigns > 0 ? "Running or scheduled" : "None running"}
              icon={Megaphone}
              iconClassName="bg-amber-500/10 text-amber-600 dark:text-amber-400"
            />
            <StatCard
              label="Messages Today"
              value={stats.messagesToday.toLocaleString()}
              hint="Sent in the last 24h"
              icon={CalendarClock}
              iconClassName="bg-rose-500/10 text-rose-600 dark:text-rose-400"
            />
            <StatCard
              label="Remaining Usage"
              value={`${stats.remainingUsage.toLocaleString()} / ${stats.planLimit.toLocaleString()}`}
              hint={
                stats.remainingUsage <= 0
                  ? "Upgrade to send more"
                  : "Messages left this period"
              }
              icon={Gauge}
              iconClassName="bg-lime-500/10 text-lime-600 dark:text-lime-400"
              trend={stats.remainingUsage <= 0 ? "down" : undefined}
            />
          </div>

          {stats.messagesSent === 0 ? (
            <Card className="border-dashed">
              <div className="flex flex-col items-center gap-3 p-10 text-center">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <MessageSquare className="size-6" />
                </div>
                <div>
                  <p className="font-semibold">No messages sent yet</p>
                  <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                    Connect your WhatsApp account and send your first message to see
                    real-time stats here.
                  </p>
                </div>
                <Button asChild size="sm">
                  <Link href="/whatsapp">
                    Get started
                    <ChevronRight className="size-4" />
                  </Link>
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card>
                <div className="flex items-center justify-between gap-2 p-4 pb-0 sm:p-5 sm:pb-0">
                  <div>
                    <h2 className="font-semibold">Messages Sent</h2>
                    <p className="text-xs text-muted-foreground">
                      Sent vs. delivered over the last {range} days
                    </p>
                  </div>
                  <div className="hidden items-center gap-3 sm:flex">
                    <LegendDot color="#10b981" label="Sent" />
                    <LegendDot color="#38bdf8" label="Delivered" />
                  </div>
                </div>
                <CardContent className="p-4 sm:p-5">
                  {chartLoading ? (
                    <SkeletonBlock className="h-[280px] w-full" />
                  ) : hasChartData ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <AreaChart data={areaData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                        <defs>
                          <linearGradient id="gradientSent" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                            <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="gradientDelivered" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="#38bdf8" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                        <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} tickMargin={8} />
                        <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} allowDecimals={false} />
                        <Tooltip />
                        <Legend />
                        <Area type="monotone" dataKey="Sent" stroke="#10b981" strokeWidth={2} fill="url(#gradientSent)" />
                        <Area type="monotone" dataKey="Delivered" stroke="#38bdf8" strokeWidth={2} fill="url(#gradientDelivered)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-[280px] flex-col items-center justify-center gap-1 text-center">
                      <p className="text-sm font-medium">No data yet</p>
                      <p className="text-xs text-muted-foreground">
                        Send a message to start seeing the trend.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <div className="flex items-center justify-between gap-2 p-4 pb-0 sm:p-5 sm:pb-0">
                  <div>
                    <h2 className="font-semibold">Deliverability</h2>
                    <p className="text-xs text-muted-foreground">
                      Sent vs. delivered per day
                    </p>
                  </div>
                  <div className="hidden items-center gap-3 sm:flex">
                    <LegendDot color="#10b981" label="Sent" />
                    <LegendDot color="#8b5cf6" label="Delivered" />
                  </div>
                </div>
                <CardContent className="p-4 sm:p-5">
                  {chartLoading ? (
                    <SkeletonBlock className="h-[280px] w-full" />
                  ) : hasChartData ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={barData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }} barGap={2}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                        <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} tickMargin={8} />
                        <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} allowDecimals={false} />
                        <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.4 }} />
                        <Legend />
                        <Bar dataKey="Sent" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={28} />
                        <Bar dataKey="Delivered" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={28} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-[280px] flex-col items-center justify-center gap-1 text-center">
                      <p className="text-sm font-medium">No data yet</p>
                      <p className="text-xs text-muted-foreground">
                        Send a message to start seeing the trend.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {hasChartData
                ? `Showing the last ${range} days`
                : "No message activity yet"}
            </p>
            <div className="inline-flex items-center rounded-full border p-0.5">
              {RANGE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setRange(option.value)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                    range === option.value
                      ? "bg-emerald-500 text-emerald-50 shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}