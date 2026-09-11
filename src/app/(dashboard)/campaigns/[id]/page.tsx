"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Pause,
  Play,
  XCircle,
  Users,
  CheckCheck,
  Eye,
  Send,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AreaChart,
  Area,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatDate, cn } from "@/lib/utils";

interface Campaign {
  id: string;
  name: string;
  status: string;
  totalRecipients: number;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  replies: number;
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  template?: {
    id: string;
    name: string;
    category: string;
    body: { text?: string } | null;
  } | null;
  _count?: { recipients: number };
}

interface Recipient {
  id: string;
  status: string;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  errorMessage: string | null;
  contact: {
    id: string;
    name: string | null;
    phone: string;
    email: string | null;
  };
}

interface RecipientResponse {
  success: boolean;
  data: Recipient[];
  pagination: {
    page: number;
    total: number;
    totalPages: number;
  };
}

function getStatusBadgeVariant(
  status: string
): "default" | "secondary" | "destructive" | "outline" | "success" | "warning" {
  switch (status) {
    case "RUNNING":
      return "success";
    case "SCHEDULED":
      return "warning";
    case "COMPLETED":
      return "default";
    case "PAUSED":
      return "secondary";
    case "FAILED":
      return "destructive";
    case "CANCELLED":
      return "destructive";
    case "DRAFT":
      return "outline";
    default:
      return "outline";
  }
}

function getRecipientStatusBadge(
  status: string
): "default" | "secondary" | "destructive" | "outline" | "success" | "warning" {
  switch (status) {
    case "SENT":
      return "warning";
    case "DELIVERED":
      return "default";
    case "READ":
      return "success";
    case "FAILED":
      return "destructive";
    case "QUEUED":
      return "outline";
    default:
      return "outline";
  }
}

function StatCard({
  label,
  value,
  rate,
  icon: Icon,
  iconClassName,
}: {
  label: string;
  value: string | number;
  rate?: number;
  icon: typeof Users;
  iconClassName?: string;
}) {
  return (
    <Card>
      <div className="flex items-start gap-3 p-4">
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl",
            iconClassName || "bg-zinc-100 dark:bg-zinc-800"
          )}
        >
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-zinc-500">{label}</p>
          <p className="text-xl font-bold tracking-tight tabular-nums">
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
          {rate !== undefined && (
            <p className="text-[10px] text-zinc-400">{rate.toFixed(1)}%</p>
          )}
        </div>
      </div>
    </Card>
  );
}

export default function CampaignDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [campaign, setCampaign] = React.useState<Campaign | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [actionDialog, setActionDialog] = React.useState<{
    type: "pause" | "resume" | "cancel";
    open: boolean;
  }>({ type: "pause", open: false });

  const [recipients, setRecipients] = React.useState<Recipient[]>([]);
  const [recipientsLoading, setRecipientsLoading] = React.useState(false);
  const [recipientStatusFilter, setRecipientStatusFilter] = React.useState("all");
  const [recipientPage, setRecipientPage] = React.useState(1);
  const [recipientTotal, setRecipientTotal] = React.useState(0);
  const [recipientTotalPages, setRecipientTotalPages] = React.useState(1);

  const fetchCampaign = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/campaigns/${id}`);
      const body = await res.json();
      if (body.success && body.data) {
        setCampaign(body.data);
      } else {
        setError("Campaign not found");
      }
    } catch {
      setError("Failed to load campaign");
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    fetchCampaign();
  }, [fetchCampaign]);

  const fetchRecipients = React.useCallback(async () => {
    setRecipientsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(recipientPage));
      params.set("limit", "20");
      if (recipientStatusFilter !== "all")
        params.set("status", recipientStatusFilter);

      const res = await fetch(`/api/campaigns/${id}/recipients?${params.toString()}`);
      const body: RecipientResponse = await res.json();
      if (body.success) {
        setRecipients(body.data);
        setRecipientTotal(body.pagination.total);
        setRecipientTotalPages(body.pagination.totalPages);
      }
    } catch {
      setRecipients([]);
    } finally {
      setRecipientsLoading(false);
    }
  }, [id, recipientPage, recipientStatusFilter]);

  React.useEffect(() => {
    fetchRecipients();
  }, [fetchRecipients]);

  const handleAction = async (action: string) => {
    setActionLoading(action);
    try {
      const res = await fetch(`/api/campaigns/${id}/${action}`, {
        method: "POST",
      });
      const body = await res.json();
      if (body.success) {
        setCampaign(body.data);
      } else {
        setError(body.error?.message || `Failed to ${action} campaign`);
      }
    } catch {
      setError(`Failed to ${action} campaign`);
    } finally {
      setActionLoading(null);
      setActionDialog({ type: "pause", open: false });
    }
  };

  const canPause = campaign?.status === "RUNNING";
  const canResume = campaign?.status === "PAUSED";
  const canCancel =
    campaign?.status === "DRAFT" ||
    campaign?.status === "SCHEDULED" ||
    campaign?.status === "RUNNING" ||
    campaign?.status === "PAUSED";

  const deliveryRate =
    campaign && campaign.sent > 0
      ? (campaign.delivered / campaign.sent) * 100
      : 0;
  const readRate =
    campaign && campaign.sent > 0 ? (campaign.read / campaign.sent) * 100 : 0;
  const failureRate =
    campaign && campaign.totalRecipients > 0
      ? (campaign.failed / campaign.totalRecipients) * 100
      : 0;
  const replyRate =
    campaign && campaign.sent > 0 ? (campaign.replies / campaign.sent) * 100 : 0;

  const chartData = React.useMemo(() => {
    if (!campaign) return [];
    const points = [];
    points.push({ name: "Start", sent: 0, delivered: 0, read: 0 });
    points.push({
      name: "Sent",
      sent: campaign.sent,
      delivered: 0,
      read: 0,
    });
    points.push({
      name: "Delivered",
      sent: campaign.sent,
      delivered: campaign.delivered,
      read: 0,
    });
    points.push({
      name: "Read",
      sent: campaign.sent,
      delivered: campaign.delivered,
      read: campaign.read,
    });
    return points;
  }, [campaign]);

  const progress =
    campaign && campaign.totalRecipients > 0
      ? ((campaign.delivered + campaign.read + campaign.failed) /
          campaign.totalRecipients) *
        100
      : 0;

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9" />
          <div>
            <Skeleton className="h-7 w-48 mb-1.5" />
            <Skeleton className="h-4 w-72" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <div className="p-4">
                <Skeleton className="h-3 w-20 mb-2" />
                <Skeleton className="h-6 w-16" />
              </div>
            </Card>
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (error && !campaign) {
    return (
      <div className="flex flex-col items-center gap-4 py-20">
        <p className="text-zinc-500">{error}</p>
        <Button asChild variant="outline" size="sm">
          <Link href="/campaigns">Back to campaigns</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/campaigns">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{campaign?.name}</h1>
            {campaign && (
              <Badge variant={getStatusBadgeVariant(campaign.status)}>
                {campaign.status}
              </Badge>
            )}
          </div>
          <p className="text-sm text-zinc-500">
            Created {campaign ? formatDate(campaign.createdAt) : ""}
            {campaign?.startedAt && ` | Started ${formatDate(campaign.startedAt)}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canPause && (
            <Button
              variant="outline"
              size="sm"
              disabled={!!actionLoading}
              onClick={() =>
                setActionDialog({ type: "pause", open: true })
              }
            >
              {actionLoading === "pause" ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Pause className="mr-1.5 h-4 w-4" />
              )}
              Pause
            </Button>
          )}
          {canResume && (
            <Button
              variant="outline"
              size="sm"
              disabled={!!actionLoading}
              onClick={() =>
                setActionDialog({ type: "resume", open: true })
              }
            >
              {actionLoading === "resume" ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-1.5 h-4 w-4" />
              )}
              Resume
            </Button>
          )}
          {canCancel && (
            <Button
              variant="destructive"
              size="sm"
              disabled={!!actionLoading}
              onClick={() =>
                setActionDialog({ type: "cancel", open: true })
              }
            >
              {actionLoading === "cancel" ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="mr-1.5 h-4 w-4" />
              )}
              Cancel
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-zinc-500">
            {Math.round(progress)}% complete
          </span>
          <span className="text-zinc-500">
            {campaign?.totalRecipients || 0} recipients
          </span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="Recipients"
          value={campaign?.totalRecipients || 0}
          icon={Users}
          iconClassName="bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
        />
        <StatCard
          label="Sent"
          value={campaign?.sent || 0}
          rate={
            campaign && campaign.totalRecipients > 0
              ? (campaign.sent / campaign.totalRecipients) * 100
              : 0
          }
          icon={Send}
          iconClassName="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
        />
        <StatCard
          label="Delivered"
          value={campaign?.delivered || 0}
          rate={deliveryRate}
          icon={CheckCheck}
          iconClassName="bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400"
        />
        <StatCard
          label="Read"
          value={campaign?.read || 0}
          rate={readRate}
          icon={Eye}
          iconClassName="bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400"
        />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <div className="p-4">
            <p className="text-xs font-medium text-zinc-500">Failed</p>
            <p className="text-lg font-bold tabular-nums text-red-600">
              {campaign?.failed || 0}
            </p>
            <p className="text-[10px] text-zinc-400">{failureRate.toFixed(1)}% rate</p>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <p className="text-xs font-medium text-zinc-500">Replies</p>
            <p className="text-lg font-bold tabular-nums">
              {campaign?.replies || 0}
            </p>
            <p className="text-[10px] text-zinc-400">{replyRate.toFixed(1)}% rate</p>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <p className="text-xs font-medium text-zinc-500">Delivery Rate</p>
            <p className="text-lg font-bold tabular-nums">
              {deliveryRate.toFixed(1)}%
            </p>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <p className="text-xs font-medium text-zinc-500">Read Rate</p>
            <p className="text-lg font-bold tabular-nums">
              {readRate.toFixed(1)}%
            </p>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Delivery Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
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
              <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Area type="monotone" dataKey="sent" stroke="#10b981" strokeWidth={2} fill="url(#gradientSent)" />
              <Area type="monotone" dataKey="delivered" stroke="#38bdf8" strokeWidth={2} fill="url(#gradientDelivered)" />
              <Area type="monotone" dataKey="read" stroke="#8b5cf6" strokeWidth={2} fill="transparent" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {campaign?.template && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Template</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div>
                <p className="text-sm font-medium">{campaign.template.name}</p>
                <p className="text-xs text-zinc-500">
                  {campaign.template.category} | {campaign.template.body?.text?.slice(0, 80) || "No body"}
                </p>
              </div>
              <Button asChild variant="outline" size="sm" className="ml-auto">
                <Link href={`/templates/${campaign.template.id}`}>View</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Recipients</CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500">
                {recipientTotal} total
              </span>
              <Select
                value={recipientStatusFilter}
                onValueChange={setRecipientStatusFilter}
              >
                <SelectTrigger className="h-8 w-28 text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="QUEUED">Queued</SelectItem>
                  <SelectItem value="SENT">Sent</SelectItem>
                  <SelectItem value="DELIVERED">Delivered</SelectItem>
                  <SelectItem value="READ">Read</SelectItem>
                  <SelectItem value="FAILED">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {recipientsLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-4 border-b py-3 last:border-0">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-20 rounded-full" />
                </div>
              ))}
            </div>
          ) : recipients.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <Users className="h-8 w-8 text-zinc-300" />
              <p className="text-sm text-zinc-500">No recipients found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Delivered</TableHead>
                  <TableHead>Read</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recipients.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      {r.contact.name || "Unknown"}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {r.contact.phone}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getRecipientStatusBadge(r.status)}>
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-zinc-500">
                      {r.sentAt ? formatDate(r.sentAt) : "-"}
                    </TableCell>
                    <TableCell className="text-xs text-zinc-500">
                      {r.deliveredAt ? formatDate(r.deliveredAt) : "-"}
                    </TableCell>
                    <TableCell className="text-xs text-zinc-500">
                      {r.readAt ? formatDate(r.readAt) : "-"}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs text-red-500">
                      {r.errorMessage || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {recipientTotalPages > 1 && (
            <div className="flex items-center justify-between border-t p-3">
              <span className="text-xs text-zinc-500">
                Page {recipientPage} of {recipientTotalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={recipientPage <= 1}
                  onClick={() => setRecipientPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={recipientPage >= recipientTotalPages}
                  onClick={() =>
                    setRecipientPage((p) => Math.min(recipientTotalPages, p + 1))
                  }
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={actionDialog.open}
        onOpenChange={(open) =>
          setActionDialog((prev) => ({ ...prev, open }))
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog.type === "pause"
                ? "Pause Campaign"
                : actionDialog.type === "resume"
                  ? "Resume Campaign"
                  : "Cancel Campaign"}
            </DialogTitle>
            <DialogDescription>
              {actionDialog.type === "pause"
                ? "Pausing will stop sending messages. You can resume later."
                : actionDialog.type === "resume"
                  ? "Resuming will continue sending messages to remaining recipients."
                  : "Cancelling this campaign cannot be undone. Queued messages will not be sent."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setActionDialog((prev) => ({ ...prev, open: false }))
              }
            >
              Go back
            </Button>
            <Button
              variant={
                actionDialog.type === "cancel" ? "destructive" : "default"
              }
              disabled={!!actionLoading}
              onClick={() => handleAction(actionDialog.type)}
            >
              {actionLoading && (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              )}
              Confirm {actionDialog.type}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
