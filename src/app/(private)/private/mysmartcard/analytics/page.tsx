"use client";

import * as React from "react";
import { BarChart3, TrendingUp, Users, MessageSquare, Bot, Headphones } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface AnalyticsData {
  summary: {
    totalConversations: number;
    uniqueCustomers: number;
    aiHandled: number;
    humanHandled: number;
    totalLeads: number;
    qualifiedLeads: number;
    convertedLeads: number;
    conversionRate: number;
    handoffRate: number;
  };
  conversationsOverTime: Array<{ date: string; conversations: number; leads: number }>;
  intentBreakdown: Array<{ intent: string; count: number }>;
  productInterest: Array<{ productId: string; name: string; count: number }>;
  leadStatusBreakdown: Array<{ status: string; count: number }>;
  modeBreakdown: Array<{ mode: string; count: number }>;
}

const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-blue-500/10 text-blue-700",
  CONTACTED: "bg-yellow-500/10 text-yellow-700",
  INTERESTED: "bg-purple-500/10 text-purple-700",
  QUALIFIED: "bg-green-500/10 text-green-700",
  CONVERTED: "bg-emerald-500/10 text-emerald-700",
  LOST: "bg-red-500/10 text-red-700",
};

export default function MySmartCardAnalyticsPage() {
  const [data, setData] = React.useState<AnalyticsData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [period, setPeriod] = React.useState("30");

  React.useEffect(() => {
    setLoading(true);
    fetch(`/api/private/mysmartcard/analytics?period=${period}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => { if (body?.data) setData(body.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [period]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="size-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20">
        <BarChart3 className="size-10 mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground">No analytics data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">Performance metrics for MySmartCard AI system.</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversations</CardTitle>
            <MessageSquare className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalConversations}</div>
            <p className="text-xs text-muted-foreground">{data.summary.uniqueCustomers} unique customers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leads</CardTitle>
            <Users className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalLeads}</div>
            <p className="text-xs text-muted-foreground">{data.summary.qualifiedLeads} qualified</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.conversionRate}%</div>
            <p className="text-xs text-muted-foreground">{data.summary.convertedLeads} converted</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Handoff Rate</CardTitle>
            <Headphones className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.handoffRate}%</div>
            <p className="text-xs text-muted-foreground">{data.summary.humanHandled} human handled</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Conversations Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            {data.conversationsOverTime.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No data</p>
            ) : (
              <div className="space-y-2">
                {data.conversationsOverTime.slice(-7).map((day) => (
                  <div key={day.date} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-20">{day.date.slice(5)}</span>
                    <div className="flex-1 flex items-center gap-2">
                      <div className="h-4 rounded bg-blue-500/20" style={{ width: `${Math.min((day.conversations / Math.max(...data.conversationsOverTime.map((d) => d.conversations), 1)) * 100, 100)}%` }} />
                      <span className="text-xs w-8 text-right">{day.conversations}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">AI vs Human</CardTitle>
          </CardHeader>
          <CardContent>
            {data.modeBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No data</p>
            ) : (
              <div className="space-y-3">
                {data.modeBreakdown.map((m) => (
                  <div key={m.mode} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {m.mode === "AI" ? <Bot className="size-4 text-blue-500" /> : <Headphones className="size-4 text-orange-500" />}
                      <span className="text-sm font-medium">{m.mode}</span>
                    </div>
                    <span className="text-sm font-bold">{m.count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lead Status</CardTitle>
          </CardHeader>
          <CardContent>
            {data.leadStatusBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No leads</p>
            ) : (
              <div className="space-y-2">
                {data.leadStatusBreakdown.map((s) => (
                  <div key={s.status} className="flex items-center justify-between">
                    <Badge variant="secondary" className={STATUS_COLORS[s.status] || ""}>{s.status}</Badge>
                    <span className="text-sm font-medium">{s.count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Intents</CardTitle>
          </CardHeader>
          <CardContent>
            {data.intentBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No data</p>
            ) : (
              <div className="space-y-2">
                {data.intentBreakdown.slice(0, 6).map((item) => (
                  <div key={item.intent} className="flex items-center justify-between">
                    <span className="text-sm">{item.intent?.replace(/_/g, " ") || "Unknown"}</span>
                    <span className="text-sm font-medium">{item.count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {data.productInterest.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Product Interest</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.productInterest.map((p) => (
                <div key={p.productId} className="flex items-center justify-between">
                  <span className="text-sm">{p.name}</span>
                  <span className="text-sm font-medium">{p.count} leads</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
