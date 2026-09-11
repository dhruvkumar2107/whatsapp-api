"use client"

import * as React from "react"
import {
  AreaChart,
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  PieChart,
  Pie,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  BarChart3,
  CheckCheck,
  Eye,
  MessageSquare,
  Users,
  XCircle,
  Megaphone,
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"

interface OverviewData {
  totalMessages: number
  deliveredCount: number
  readCount: number
  failedCount: number
  deliveryRate: number
  readRate: number
  failureRate: number
  totalContacts: number
  newContacts: number
  activeCampaigns: number
  messagesPerDay: number
}

interface MessageAnalytics {
  timeSeries: { date: string; sent: number; delivered: number; read: number; failed: number }[]
  typeDistribution: { type: string; count: number; percentage: number }[]
  totals: { sent: number; delivered: number; read: number; failed: number }
}

interface ContactAnalytics {
  totalContacts: number
  totalNewContacts: number
  contactsBySource: { source: string; count: number }[]
  contactsByCountry: { country: string; count: number }[]
  newContactsByDay: { date: string; count: number }[]
}

interface CampaignAnalytics {
  campaignsByStatus: { status: string; count: number; sent: number; delivered: number; read: number; failed: number }[]
  topCampaigns: { id: string; name: string; status: string; sent: number; delivered: number; read: number; failed: number; replies: number; deliveryRate: number; readRate: number }[]
  totals: { totalCampaigns: number; totalSent: number; totalDelivered: number; overallDeliveryRate: number; overallReadRate: number }
}

interface AgentAnalytics {
  agents: {
    agent: { id: string; name: string; email: string; image: string | null }
    stats: { totalMessages: number; outboundMessages: number; conversationsHandled: number; avgResponseTimeMs: number }
  }[]
}

type RangeOption = { value: string; label: string }
const RANGES: RangeOption[] = [
  { value: "1", label: "Today" },
  { value: "7", label: "7 Days" },
  { value: "30", label: "30 Days" },
  { value: "90", label: "90 Days" },
]

const PIE_COLORS = ["#10b981", "#38bdf8", "#8b5cf6", "#f59e0b", "#ef4444", "#ec4899", "#06b6d4"]

function StatCard({
  label,
  value,
  icon: Icon,
  iconClassName,
}: {
  label: string
  value: string
  icon: React.ElementType
  iconClassName?: string
}) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3 p-4 sm:p-5">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-1.5 text-2xl font-bold tracking-tight tabular-nums">
            {value}
          </p>
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
  )
}

function ChartSkeleton() {
  return (
    <div className="space-y-3 p-5">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-3 w-28" />
      <Skeleton className="h-[280px] w-full rounded-lg" />
    </div>
  )
}

export default function AnalyticsPage() {
  const [range, setRange] = React.useState("30")
  const [overview, setOverview] = React.useState<OverviewData | null>(null)
  const [messages, setMessages] = React.useState<MessageAnalytics | null>(null)
  const [contacts, setContacts] = React.useState<ContactAnalytics | null>(null)
  const [campaigns, setCampaigns] = React.useState<CampaignAnalytics | null>(null)
  const [agents, setAgents] = React.useState<AgentAnalytics | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [messagesLoading, setMessagesLoading] = React.useState(true)
  const [contactsLoading, setContactsLoading] = React.useState(true)

  React.useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch(`/api/analytics?range=${range}`)
      .then((r) => r.json())
      .then((body) => {
        if (!cancelled && body.success) setOverview(body.data)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [range])

  React.useEffect(() => {
    let cancelled = false
    setMessagesLoading(true)
    fetch(`/api/analytics/messages?days=${range}`)
      .then((r) => r.json())
      .then((body) => {
        if (!cancelled && body.success) setMessages(body.data)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setMessagesLoading(false)
      })
    return () => { cancelled = true }
  }, [range])

  React.useEffect(() => {
    let cancelled = false
    setContactsLoading(true)
    fetch(`/api/analytics/contacts?days=${range}`)
      .then((r) => r.json())
      .then((body) => {
        if (!cancelled && body.success) setContacts(body.data)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setContactsLoading(false)
      })
    return () => { cancelled = true }
  }, [range])

  React.useEffect(() => {
    let cancelled = false
    fetch("/api/analytics/campaigns")
      .then((r) => r.json())
      .then((body) => {
        if (!cancelled && body.success) setCampaigns(body.data)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  React.useEffect(() => {
    let cancelled = false
    fetch(`/api/analytics/agents?days=${range}`)
      .then((r) => r.json())
      .then((body) => {
        if (!cancelled && body.success) setAgents(body.data)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [range])

  const hasData = overview !== null && overview.totalMessages > 0
  const funnelData = messages
    ? [
        { stage: "Sent", value: messages.totals.sent },
        { stage: "Delivered", value: messages.totals.delivered },
        { stage: "Read", value: messages.totals.read },
      ]
    : []

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Insights into your messaging performance and engagement.
          </p>
        </div>
        <div className="inline-flex items-center rounded-full border p-0.5">
          {RANGES.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setRange(r.value)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                range === r.value
                  ? "bg-emerald-500 text-emerald-50 shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}>
              <div className="flex items-start justify-between gap-3 p-4 sm:p-5">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-7 w-16" />
                </div>
                <Skeleton className="size-10 rounded-xl" />
              </div>
            </Card>
          ))}
        </div>
      ) : overview ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total Messages"
              value={overview.totalMessages.toLocaleString()}
              icon={MessageSquare}
              iconClassName="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            />
            <StatCard
              label="Delivery Rate"
              value={`${overview.deliveryRate}%`}
              icon={CheckCheck}
              iconClassName="bg-teal-500/10 text-teal-600 dark:text-teal-400"
            />
            <StatCard
              label="Read Rate"
              value={`${overview.readRate}%`}
              icon={Eye}
              iconClassName="bg-sky-500/10 text-sky-600 dark:text-sky-400"
            />
            <StatCard
              label="Failed Messages"
              value={overview.failedCount.toLocaleString()}
              icon={XCircle}
              iconClassName="bg-red-500/10 text-red-600 dark:text-red-400"
            />
            <StatCard
              label="Active Contacts"
              value={overview.totalContacts.toLocaleString()}
              icon={Users}
              iconClassName="bg-violet-500/10 text-violet-600 dark:text-violet-400"
            />
            <StatCard
              label="New Contacts"
              value={overview.newContacts.toLocaleString()}
              icon={Users}
              iconClassName="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
            />
            <StatCard
              label="Campaign Performance"
              value={overview.activeCampaigns.toLocaleString()}
              icon={Megaphone}
              iconClassName="bg-amber-500/10 text-amber-600 dark:text-amber-400"
            />
            <StatCard
              label="Messages per Day"
              value={overview.messagesPerDay.toLocaleString()}
              icon={BarChart3}
              iconClassName="bg-rose-500/10 text-rose-600 dark:text-rose-400"
            />
          </div>

          {!hasData && (
            <Card className="border-dashed">
              <div className="flex flex-col items-center gap-3 p-10 text-center">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <BarChart3 className="size-6" />
                </div>
                <div>
                  <p className="font-semibold">No analytics data yet</p>
                  <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                    Start sending messages and creating campaigns to see detailed analytics here.
                  </p>
                </div>
              </div>
            </Card>
          )}
        </>
      ) : null}

      {hasData && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            {messagesLoading ? (
              <ChartSkeleton />
            ) : messages && messages.timeSeries.length > 0 ? (
              <>
                <div className="flex items-center justify-between gap-2 p-4 pb-0 sm:p-5 sm:pb-0">
                  <div>
                    <h2 className="font-semibold">Messages Over Time</h2>
                    <p className="text-xs text-muted-foreground">Sent, delivered, read, and failed</p>
                  </div>
                  <div className="hidden items-center gap-3 sm:flex">
                    <LegendDot color="#10b981" label="Sent" />
                    <LegendDot color="#38bdf8" label="Delivered" />
                    <LegendDot color="#8b5cf6" label="Read" />
                    <LegendDot color="#ef4444" label="Failed" />
                  </div>
                </div>
                <CardContent className="p-4 sm:p-5">
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={messages.timeSeries} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gSent" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gDelivered" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#38bdf8" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gRead" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                      <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} tickMargin={8} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip />
                      <Area type="monotone" dataKey="sent" stroke="#10b981" strokeWidth={2} fill="url(#gSent)" />
                      <Area type="monotone" dataKey="delivered" stroke="#38bdf8" strokeWidth={2} fill="url(#gDelivered)" />
                      <Area type="monotone" dataKey="read" stroke="#8b5cf6" strokeWidth={2} fill="url(#gRead)" />
                      <Area type="monotone" dataKey="failed" stroke="#ef4444" strokeWidth={1} fill="none" strokeDasharray="4 2" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </>
            ) : (
              <EmptyChart message="No message data for this period" />
            )}
          </Card>

          <Card>
            {messagesLoading ? (
              <ChartSkeleton />
            ) : messages && messages.typeDistribution.length > 0 ? (
              <>
                <div className="p-4 pb-0 sm:p-5 sm:pb-0">
                  <h2 className="font-semibold">Message Type Distribution</h2>
                  <p className="text-xs text-muted-foreground">Breakdown by message type</p>
                </div>
                <CardContent className="flex items-center justify-center p-4 sm:p-5">
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={messages.typeDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={3}
                        dataKey="count"
                        nameKey="type"
                      >
                        {messages.typeDistribution.map((_, idx) => (
                          <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </>
            ) : (
              <EmptyChart message="No message type data" />
            )}
          </Card>

          <Card>
            {messagesLoading ? (
              <ChartSkeleton />
            ) : funnelData.length > 0 && funnelData[0].value > 0 ? (
              <>
                <div className="p-4 pb-0 sm:p-5 sm:pb-0">
                  <h2 className="font-semibold">Delivery Funnel</h2>
                  <p className="text-xs text-muted-foreground">Sent to delivered to read</p>
                </div>
                <CardContent className="p-4 sm:p-5">
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={funnelData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                      <XAxis dataKey="stage" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.4 }} />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={48}>
                        {funnelData.map((_, idx) => (
                          <Cell
                            key={idx}
                            fill={idx === 0 ? "#10b981" : idx === 1 ? "#38bdf8" : "#8b5cf6"}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </>
            ) : (
              <EmptyChart message="No funnel data" />
            )}
          </Card>

          <Card>
            {contactsLoading ? (
              <ChartSkeleton />
            ) : contacts && contacts.newContactsByDay.length > 0 ? (
              <>
                <div className="flex items-center justify-between gap-2 p-4 pb-0 sm:p-5 sm:pb-0">
                  <div>
                    <h2 className="font-semibold">Contact Growth</h2>
                    <p className="text-xs text-muted-foreground">New contacts over time</p>
                  </div>
                </div>
                <CardContent className="p-4 sm:p-5">
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={contacts.newContactsByDay} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                      <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} tickMargin={8} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip />
                      <Line type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </>
            ) : (
              <EmptyChart message="No contact growth data" />
            )}
          </Card>
        </div>
      )}

      {hasData && campaigns && campaigns.topCampaigns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Performing Campaigns</CardTitle>
            <CardDescription>Sorted by total messages sent</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Sent</TableHead>
                  <TableHead className="text-right">Delivered</TableHead>
                  <TableHead className="text-right">Read</TableHead>
                  <TableHead className="text-right">Failed</TableHead>
                  <TableHead className="text-right">Delivery Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.topCampaigns.slice(0, 5).map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>
                      <Badge variant={c.status === "COMPLETED" ? "success" : c.status === "RUNNING" ? "default" : "secondary"}>
                        {c.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{c.sent.toLocaleString()}</TableCell>
                    <TableCell className="text-right tabular-nums">{c.delivered.toLocaleString()}</TableCell>
                    <TableCell className="text-right tabular-nums">{c.read.toLocaleString()}</TableCell>
                    <TableCell className="text-right tabular-nums">{c.failed.toLocaleString()}</TableCell>
                    <TableCell className="text-right tabular-nums">{c.deliveryRate}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {hasData && agents && agents.agents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Agent Performance</CardTitle>
            <CardDescription>Messages handled and response times per agent</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead className="text-right">Conversations</TableHead>
                  <TableHead className="text-right">Messages</TableHead>
                  <TableHead className="text-right">Outbound</TableHead>
                  <TableHead className="text-right">Avg Response</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agents.agents.map((a) => (
                  <TableRow key={a.agent.id}>
                    <TableCell className="font-medium">{a.agent.name || a.agent.email}</TableCell>
                    <TableCell className="text-right tabular-nums">{a.stats.conversationsHandled.toLocaleString()}</TableCell>
                    <TableCell className="text-right tabular-nums">{a.stats.totalMessages.toLocaleString()}</TableCell>
                    <TableCell className="text-right tabular-nums">{a.stats.outboundMessages.toLocaleString()}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {a.stats.avgResponseTimeMs > 0
                        ? a.stats.avgResponseTimeMs < 60000
                          ? `${Math.round(a.stats.avgResponseTimeMs / 1000)}s`
                          : `${Math.round(a.stats.avgResponseTimeMs / 60000)}m`
                        : "--"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {hasData && contacts && contacts.contactsByCountry.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contacts by Country</CardTitle>
            <CardDescription>Geographic distribution of your contacts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {contacts.contactsByCountry.slice(0, 10).map((c) => {
                const pct = contacts.totalContacts > 0 ? Math.round((c.count / contacts.totalContacts) * 100) : 0
                return (
                  <div key={c.country} className="flex items-center gap-3">
                    <span className="w-24 truncate text-sm font-medium">{c.country}</span>
                    <div className="flex-1">
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-emerald-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <span className="w-16 text-right text-xs tabular-nums text-muted-foreground">
                      {c.count.toLocaleString()} ({pct}%)
                    </span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && !hasData && !messagesLoading && (
        <Card className="border-dashed">
          <div className="flex flex-col items-center gap-3 p-10 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-muted">
              <BarChart3 className="size-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold">No analytics data available</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                Once you start sending messages and running campaigns, your analytics will appear here.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
      <span className="size-2 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  )
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-10 text-center">
      <p className="text-sm font-medium">{message}</p>
      <p className="mt-1 text-xs text-muted-foreground">Data will appear once available.</p>
    </div>
  )
}
