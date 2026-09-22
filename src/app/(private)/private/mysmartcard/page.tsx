"use client";

import * as React from "react";
import {
  BarChart3,
  Bot,
  CreditCard,
  Headphones,
  MessageSquare,
  Package,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface DashboardData {
  totalConversations: number;
  conversationsToday: number;
  totalLeads: number;
  newLeads: number;
  qualifiedLeads: number;
  aiHandledConversations: number;
  humanHandoffs: number;
  totalProducts: number;
  totalMessages: number;
  unreadConversations: number;
  recentLeads: Array<{
    id: string;
    name: string | null;
    phone: string;
    status: string;
    leadScore: number;
    createdAt: string;
    product: { name: string } | null;
  }>;
  recentConversations: Array<{
    id: string;
    mode: string;
    detectedIntent: string | null;
    createdAt: string;
    conversation: { lastMessagePreview: string | null; lastMessageAt: string | null };
    lead: { name: string | null; phone: string } | null;
  }>;
  intentDistribution: Array<{ intent: string; count: number }>;
  leadStatusDistribution: Array<{ status: string; count: number }>;
  conversationsOverTime: Array<{ date: string; count: number }>;
}

const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  CONTACTED: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  INTERESTED: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  QUALIFIED: "bg-green-500/10 text-green-700 dark:text-green-400",
  PURCHASED: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  CONVERTED: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  LOST: "bg-red-500/10 text-red-700 dark:text-red-400",
};

export default function MySmartCardDashboardPage() {
  const [data, setData] = React.useState<DashboardData | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch("/api/private/mysmartcard/dashboard")
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (body?.data) setData(body.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="size-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <CreditCard className="size-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">MySmartCard Not Initialized</h2>
        <p className="text-muted-foreground">Please initialize MySmartCard first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">MySmartCard Dashboard</h1>
        <p className="text-muted-foreground">Overview of your AI sales & support system.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversations Today</CardTitle>
            <MessageSquare className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.conversationsToday}</div>
            <p className="text-xs text-muted-foreground">{data.unreadConversations} unread</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Users className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalLeads}</div>
            <p className="text-xs text-muted-foreground">{data.newLeads} new, {data.qualifiedLeads} qualified</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Handled</CardTitle>
            <Bot className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.aiHandledConversations}</div>
            <p className="text-xs text-muted-foreground">{data.humanHandoffs} human handoffs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Products</CardTitle>
            <Package className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalProducts}</div>
            <p className="text-xs text-muted-foreground">{data.totalMessages} messages (30d)</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Leads</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentLeads.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No leads yet</p>
            ) : (
              <div className="space-y-3">
                {data.recentLeads.map((lead) => (
                  <div key={lead.id} className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{lead.name || lead.phone}</p>
                      <p className="text-xs text-muted-foreground">{lead.product?.name || "General"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className={STATUS_COLORS[lead.status] || ""}>
                        {lead.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{lead.leadScore}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Conversations</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentConversations.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No conversations yet</p>
            ) : (
              <div className="space-y-3">
                {data.recentConversations.map((conv) => (
                  <div key={conv.id} className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {conv.lead?.name || conv.lead?.phone || "Unknown"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {conv.conversation.lastMessagePreview || "No messages"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className={conv.mode === "AI" ? "bg-blue-500/10 text-blue-700" : "bg-orange-500/10 text-orange-700"}>
                        {conv.mode === "AI" ? <Bot className="size-3 mr-1" /> : <Headphones className="size-3 mr-1" />}
                        {conv.mode}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Intent Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {data.intentDistribution.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No data yet</p>
            ) : (
              <div className="space-y-2">
                {data.intentDistribution.slice(0, 8).map((item) => (
                  <div key={item.intent} className="flex items-center justify-between">
                    <span className="text-sm">{item.intent?.replace(/_/g, " ") || "Unknown"}</span>
                    <div className="flex items-center gap-2">
                      <div className="h-2 rounded-full bg-blue-500" style={{ width: `${Math.min((item.count / Math.max(...data.intentDistribution.map((i) => i.count))) * 100, 100)}px` }} />
                      <span className="text-xs text-muted-foreground w-8 text-right">{item.count}</span>
                    </div>
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
            {data.leadStatusDistribution.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No leads yet</p>
            ) : (
              <div className="space-y-2">
                {data.leadStatusDistribution.map((item) => (
                  <div key={item.status} className="flex items-center justify-between">
                    <Badge variant="secondary" className={STATUS_COLORS[item.status] || ""}>
                      {item.status}
                    </Badge>
                    <span className="text-sm font-medium">{item.count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
