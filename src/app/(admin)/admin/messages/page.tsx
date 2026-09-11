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
import { Input } from "@/components/ui/input";
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

interface Message {
  id: string;
  from: string;
  to: string;
  type: string;
  direction: string;
  status: string;
  workspaceName: string;
  timestamp: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export default function AdminMessagesPage() {
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [pagination, setPagination] = React.useState<Pagination | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [typeFilter, setTypeFilter] = React.useState("all");
  const [directionFilter, setDirectionFilter] = React.useState("all");
  const [page, setPage] = React.useState(1);

  React.useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (search) params.set("search", search);
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (typeFilter !== "all") params.set("type", typeFilter);
    if (directionFilter !== "all") params.set("direction", directionFilter);

    fetch(`/api/admin/messages?${params}`)
      .then((r) => r.json())
      .then((body) => {
        if (body.success) {
          setMessages(body.data);
          setPagination(body.pagination);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, search, statusFilter, typeFilter, directionFilter]);

  function statusBadge(status: string) {
    switch (status) {
      case "DELIVERED":
      case "READ":
        return <Badge variant="success">{status}</Badge>;
      case "SENT":
        return <Badge variant="default">{status}</Badge>;
      case "FAILED":
        return <Badge variant="destructive">{status}</Badge>;
      case "QUEUED":
      case "SENDING":
        return <Badge variant="warning">{status}</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  }

  function directionBadge(direction: string) {
    if (direction === "INBOUND") return <Badge variant="outline">In</Badge>;
    return <Badge variant="default">Out</Badge>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Messages</h1>
        <p className="text-muted-foreground">
          Platform-wide message monitoring.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Messages</CardTitle>
          <CardDescription>
            {pagination ? `${pagination.total.toLocaleString()} total messages` : "Loading..."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap gap-3">
            <div className="relative max-w-sm">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by phone..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-8"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="QUEUED">Queued</SelectItem>
                <SelectItem value="SENDING">Sending</SelectItem>
                <SelectItem value="SENT">Sent</SelectItem>
                <SelectItem value="DELIVERED">Delivered</SelectItem>
                <SelectItem value="READ">Read</SelectItem>
                <SelectItem value="FAILED">Failed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1); }}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="TEXT">Text</SelectItem>
                <SelectItem value="IMAGE">Image</SelectItem>
                <SelectItem value="VIDEO">Video</SelectItem>
                <SelectItem value="AUDIO">Audio</SelectItem>
                <SelectItem value="DOCUMENT">Document</SelectItem>
                <SelectItem value="TEMPLATE">Template</SelectItem>
                <SelectItem value="INTERACTIVE">Interactive</SelectItem>
                <SelectItem value="SYSTEM">System</SelectItem>
              </SelectContent>
            </Select>
            <Select value={directionFilter} onValueChange={(v) => { setDirectionFilter(v); setPage(1); }}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="All Directions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Directions</SelectItem>
                <SelectItem value="INBOUND">Inbound</SelectItem>
                <SelectItem value="OUTBOUND">Outbound</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !messages.length ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No messages found.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Direction</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Workspace</TableHead>
                  <TableHead>Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {messages.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-mono text-xs">{m.from}</TableCell>
                    <TableCell className="font-mono text-xs">{m.to}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{m.type}</Badge>
                    </TableCell>
                    <TableCell>{directionBadge(m.direction)}</TableCell>
                    <TableCell>{statusBadge(m.status)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {m.workspaceName}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(m.timestamp).toLocaleString()}
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
