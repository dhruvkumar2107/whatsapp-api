"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

interface WebhookDelivery {
  id: string;
  event: string;
  workspaceName: string;
  webhookUrl: string;
  status: string;
  statusCode: number | null;
  attempts: number;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export default function AdminWebhooksPage() {
  const [deliveries, setDeliveries] = React.useState<WebhookDelivery[]>([]);
  const [pagination, setPagination] = React.useState<Pagination | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [page, setPage] = React.useState(1);

  React.useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (statusFilter !== "all") params.set("status", statusFilter);

    fetch(`/api/admin/webhooks?${params}`)
      .then((r) => r.json())
      .then((body) => {
        if (body.success) {
          setDeliveries(body.data);
          setPagination(body.pagination);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, statusFilter]);

  function statusBadge(status: string) {
    switch (status) {
      case "DELIVERED":
        return <Badge variant="success">{status}</Badge>;
      case "FAILED":
        return <Badge variant="destructive">{status}</Badge>;
      case "PENDING":
        return <Badge variant="warning">{status}</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Webhooks</h1>
        <p className="text-muted-foreground">
          Monitor webhook deliveries across the platform.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Webhook Deliveries</CardTitle>
          <CardDescription>
            {pagination ? `${pagination.total} total deliveries` : "Loading..."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="DELIVERED">Delivered</SelectItem>
                <SelectItem value="FAILED">Failed</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !deliveries.length ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No webhook deliveries found.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Workspace</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Response</TableHead>
                  <TableHead className="text-center">Attempts</TableHead>
                  <TableHead>Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deliveries.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>
                      <Badge variant="outline">{d.event}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {d.workspaceName}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate font-mono text-xs text-muted-foreground">
                      {d.webhookUrl}
                    </TableCell>
                    <TableCell>{statusBadge(d.status)}</TableCell>
                    <TableCell>
                      {d.statusCode ? (
                        <Badge variant={d.statusCode >= 200 && d.statusCode < 300 ? "success" : d.statusCode >= 400 ? "destructive" : "secondary"}>
                          {d.statusCode}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">{d.attempts}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(d.createdAt).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {pagination && pagination.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={!pagination.hasPrev} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft className="size-4" /> Previous
                </Button>
                <Button variant="outline" size="sm" disabled={!pagination.hasNext} onClick={() => setPage((p) => p + 1)}>
                  Next <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
