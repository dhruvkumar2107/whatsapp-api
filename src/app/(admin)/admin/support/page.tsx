"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, Send } from "lucide-react";

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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";

interface Ticket {
  id: string;
  subject: string;
  userName: string;
  userEmail: string;
  description: string;
  priority: string;
  status: string;
  workspaceName: string;
  createdAt: string;
  replies?: Array<{
    id: string;
    content: string;
    userName: string;
    createdAt: string;
  }>;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export default function AdminSupportPage() {
  const [tickets, setTickets] = React.useState<Ticket[]>([]);
  const [pagination, setPagination] = React.useState<Pagination | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [priorityFilter, setPriorityFilter] = React.useState("all");
  const [page, setPage] = React.useState(1);

  const [selectedTicket, setSelectedTicket] = React.useState<Ticket | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = React.useState(false);
  const [replyText, setReplyText] = React.useState("");
  const [replyLoading, setReplyLoading] = React.useState(false);
  const [statusUpdating, setStatusUpdating] = React.useState(false);

  React.useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (priorityFilter !== "all") params.set("priority", priorityFilter);

    fetch(`/api/admin/support?${params}`)
      .then((r) => r.json())
      .then((body) => {
        if (body.success) {
          setTickets(body.data);
          setPagination(body.pagination);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, statusFilter, priorityFilter]);

  function priorityBadge(priority: string) {
    switch (priority) {
      case "URGENT":
        return <Badge variant="destructive">{priority}</Badge>;
      case "HIGH":
        return <Badge variant="warning">{priority}</Badge>;
      case "MEDIUM":
        return <Badge variant="default">{priority}</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  }

  function statusBadge(status: string) {
    switch (status) {
      case "RESOLVED":
      case "CLOSED":
        return <Badge variant="success">{status}</Badge>;
      case "IN_PROGRESS":
        return <Badge variant="default">{status}</Badge>;
      case "WAITING":
        return <Badge variant="warning">{status}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  }

  async function openTicket(ticket: Ticket) {
    try {
      const res = await fetch(`/api/admin/support/${ticket.id}`);
      const body = await res.json();
      if (body.success) {
        setSelectedTicket(body.data);
      } else {
        setSelectedTicket(ticket);
      }
      setViewDialogOpen(true);
    } catch {
      setSelectedTicket(ticket);
      setViewDialogOpen(true);
    }
  }

  async function handleReply() {
    if (!selectedTicket || !replyText.trim()) return;
    setReplyLoading(true);
    try {
      const res = await fetch(`/api/admin/support/${selectedTicket.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: replyText }),
      });
      const body = await res.json();
      if (body.success) {
        toast({ title: "Success", description: "Reply sent." });
        setReplyText("");
        setSelectedTicket((t) =>
          t
            ? {
                ...t,
                replies: [...(t.replies ?? []), body.data],
                status: "IN_PROGRESS",
              }
            : t
        );
      } else {
        toast({ title: "Error", description: body.error?.message || "Failed to send reply" });
      }
    } catch {
      toast({ title: "Error", description: "Request failed" });
    } finally {
      setReplyLoading(false);
    }
  }

  async function handleStatusChange(status: string) {
    if (!selectedTicket) return;
    setStatusUpdating(true);
    try {
      const res = await fetch(`/api/admin/support/${selectedTicket.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const body = await res.json();
      if (body.success) {
        toast({ title: "Success", description: `Ticket status set to ${status}.` });
        setSelectedTicket((t) => (t ? { ...t, status } : t));
      } else {
        toast({ title: "Error", description: body.error?.message || "Failed to update status" });
      }
    } catch {
      toast({ title: "Error", description: "Request failed" });
    } finally {
      setStatusUpdating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Support</h1>
        <p className="text-muted-foreground">
          Manage support tickets from customers.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tickets</CardTitle>
          <CardDescription>
            {pagination ? `${pagination.total} total tickets` : "Loading..."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap gap-3">
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="OPEN">Open</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="WAITING">Waiting</SelectItem>
                <SelectItem value="RESOLVED">Resolved</SelectItem>
                <SelectItem value="CLOSED">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={(v) => { setPriorityFilter(v); setPage(1); }}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="URGENT">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !tickets.length ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No tickets found.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.map((t) => (
                  <TableRow
                    key={t.id}
                    className="cursor-pointer"
                    onClick={() => openTicket(t)}
                  >
                    <TableCell className="font-medium">{t.subject}</TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{t.userName}</div>
                      <div className="text-xs text-muted-foreground">{t.userEmail}</div>
                    </TableCell>
                    <TableCell>{priorityBadge(t.priority)}</TableCell>
                    <TableCell>{statusBadge(t.status)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(t.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => openTicket(t)}>
                        View
                      </Button>
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

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedTicket?.subject}</DialogTitle>
            <DialogDescription>
              {selectedTicket?.userName} ({selectedTicket?.userEmail}) -{" "}
              {selectedTicket?.workspaceName}
            </DialogDescription>
          </DialogHeader>

          {selectedTicket && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {priorityBadge(selectedTicket.priority)}
                {statusBadge(selectedTicket.status)}
              </div>

              <div className="rounded-lg border bg-muted/30 p-4 text-sm">
                {selectedTicket.description}
              </div>

              <div className="space-y-3">
                <p className="text-sm font-semibold">Replies</p>
                {!selectedTicket.replies?.length ? (
                  <p className="text-sm text-muted-foreground">No replies yet.</p>
                ) : (
                  selectedTicket.replies.map((r) => (
                    <div key={r.id} className="rounded-lg border p-3 text-sm">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="font-medium">{r.userName}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(r.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-muted-foreground">{r.content}</p>
                    </div>
                  ))
                )}
              </div>

              <div className="flex gap-2">
                <Select
                  value={selectedTicket.status}
                  onValueChange={handleStatusChange}
                  disabled={statusUpdating}
                >
                  <SelectTrigger className="w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OPEN">Open</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="WAITING">Waiting</SelectItem>
                    <SelectItem value="RESOLVED">Resolved</SelectItem>
                    <SelectItem value="CLOSED">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {selectedTicket.status !== "CLOSED" && (
                <div className="space-y-2">
                  <Textarea
                    placeholder="Write a reply..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    rows={3}
                  />
                  <DialogFooter>
                    <Button onClick={handleReply} disabled={replyLoading || !replyText.trim()}>
                      <Send className="size-4" />
                      {replyLoading ? "Sending..." : "Send Reply"}
                    </Button>
                  </DialogFooter>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}