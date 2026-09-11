"use client";

import * as React from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Megaphone,
  BarChart3,
  CheckCheck,
  Eye,
  MoreHorizontal,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  } | null;
}

interface ApiResponse {
  success: boolean;
  data: Campaign[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
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

function StatCard({
  label,
  value,
  icon: Icon,
  iconClassName,
}: {
  label: string;
  value: string;
  icon: typeof Megaphone;
  iconClassName?: string;
}) {
  return (
    <Card>
      <div className="flex items-center gap-3 p-4">
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800",
            iconClassName
          )}
        >
          <Icon className="size-5" />
        </div>
        <div>
          <p className="text-xs font-medium text-zinc-500">{label}</p>
          <p className="text-xl font-bold tracking-tight">{value}</p>
        </div>
      </div>
    </Card>
  );
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = React.useState<Campaign[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [sortBy, setSortBy] = React.useState("createdAt");
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [total, setTotal] = React.useState(0);

  const fetchCampaigns = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "10");
      params.set("sortBy", sortBy);
      if (search) params.set("search", search);
      if (statusFilter !== "all") params.set("status", statusFilter);

      const res = await fetch(`/api/campaigns?${params.toString()}`);
      const body: ApiResponse = await res.json();

      if (body.success) {
        setCampaigns(body.data);
        setTotalPages(body.pagination.totalPages);
        setTotal(body.pagination.total);
      }
    } catch {
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, sortBy]);

  React.useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  React.useEffect(() => {
    setPage(1);
  }, [statusFilter, search, sortBy]);

  const stats = React.useMemo(() => {
    return campaigns.reduce(
      (acc, c) => ({
        total: acc.total + 1,
        sent: acc.sent + c.sent,
        delivered: acc.delivered + c.delivered,
        read: acc.read + c.read,
        failed: acc.failed + c.failed,
      }),
      { total: 0, sent: 0, delivered: 0, read: 0, failed: 0 }
    );
  }, [campaigns]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Campaigns</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Create and manage your WhatsApp broadcast campaigns.
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/campaigns/new">
            <Plus className="mr-1.5 h-4 w-4" />
            Create Campaign
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="Total Campaigns"
          value={String(total)}
          icon={Megaphone}
          iconClassName="bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400"
        />
        <StatCard
          label="Messages Sent"
          value={stats.sent.toLocaleString()}
          icon={CheckCheck}
          iconClassName="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
        />
        <StatCard
          label="Delivered"
          value={stats.delivered.toLocaleString()}
          icon={BarChart3}
          iconClassName="bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400"
        />
        <StatCard
          label="Read"
          value={stats.read.toLocaleString()}
          icon={Eye}
          iconClassName="bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
            <Tabs
              value={statusFilter}
              onValueChange={setStatusFilter}
            >
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="DRAFT">Draft</TabsTrigger>
                <TabsTrigger value="SCHEDULED">Scheduled</TabsTrigger>
                <TabsTrigger value="RUNNING">Running</TabsTrigger>
                <TabsTrigger value="COMPLETED">Completed</TabsTrigger>
                <TabsTrigger value="PAUSED">Paused</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
                <Input
                  placeholder="Search campaigns..."
                  className="h-8 w-48 pl-8 text-xs"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="h-8 w-36 text-xs">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="createdAt">Newest first</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="scheduledAt">Scheduled date</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <div className="p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 border-b py-4 last:border-0">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          ) : campaigns.length === 0 ? (
            <div className="flex flex-col items-center gap-3 p-10 text-center">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800">
                <Megaphone className="size-6 text-zinc-400" />
              </div>
              <div>
                <p className="font-semibold">No campaigns found</p>
                <p className="mt-1 max-w-sm text-sm text-zinc-500">
                  {search
                    ? "No campaigns match your search. Try a different term."
                    : "Create your first campaign to start reaching your audience."}
                </p>
              </div>
              {!search && (
                <Button asChild size="sm">
                  <Link href="/campaigns/new">
                    <Plus className="mr-1.5 h-4 w-4" />
                    Create Campaign
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Recipients</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Delivered</TableHead>
                  <TableHead>Read</TableHead>
                  <TableHead>Failed</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((campaign) => (
                  <TableRow key={campaign.id}>
                    <TableCell>
                      <Link
                        href={`/campaigns/${campaign.id}`}
                        className="font-medium hover:underline"
                      >
                        {campaign.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(campaign.status)}>
                        {campaign.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-zinc-500">
                      {campaign.template?.name || "N/A"}
                    </TableCell>
                    <TableCell className="text-sm tabular-nums">
                      {campaign.totalRecipients}
                    </TableCell>
                    <TableCell className="text-sm tabular-nums">
                      {campaign.sent}
                    </TableCell>
                    <TableCell className="text-sm tabular-nums">
                      {campaign.delivered}
                    </TableCell>
                    <TableCell className="text-sm tabular-nums">
                      {campaign.read}
                    </TableCell>
                    <TableCell className="text-sm tabular-nums">
                      {campaign.failed > 0 ? (
                        <span className="text-red-500">{campaign.failed}</span>
                      ) : (
                        "0"
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-zinc-500">
                      {campaign.scheduledAt
                        ? formatDate(campaign.scheduledAt)
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/campaigns/${campaign.id}`}>
                              View details
                            </Link>
                          </DropdownMenuItem>
                          {(campaign.status === "DRAFT" ||
                            campaign.status === "SCHEDULED") && (
                            <DropdownMenuItem asChild>
                              <Link href={`/campaigns/${campaign.id}`}>
                                Edit campaign
                              </Link>
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className="text-xs text-zinc-500">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
