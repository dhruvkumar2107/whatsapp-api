"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  LifeBuoy,
  Loader2,
  MessageSquare,
  Plus,
  Send,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
import { toast } from "@/components/ui/use-toast";
import { formatDate, cn } from "@/lib/utils";

interface TicketUser {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

interface TicketReply {
  id: string;
  content: string;
  createdAt: string;
  user: TicketUser;
}

interface Ticket {
  id: string;
  subject: string;
  description: string;
  priority: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  user: TicketUser;
  _count?: { replies: number };
  replies?: TicketReply[];
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

const EMPTY_TICKET: Ticket = {
  id: "",
  subject: "",
  description: "",
  priority: "MEDIUM",
  status: "OPEN",
  createdAt: "",
  updatedAt: "",
  user: { id: "", name: null, email: "", image: null },
};

function getStatusBadgeVariant(
  status: string
): "default" | "secondary" | "destructive" | "outline" | "success" | "warning" {
  switch (status) {
    case "OPEN":
      return "warning";
    case "IN_PROGRESS":
      return "default";
    case "WAITING":
      return "secondary";
    case "RESOLVED":
      return "success";
    case "CLOSED":
      return "outline";
    default:
      return "outline";
  }
}

function getPriorityBadgeVariant(
  priority: string
): "default" | "secondary" | "destructive" | "outline" | "success" | "warning" {
  switch (priority) {
    case "URGENT":
      return "destructive";
    case "HIGH":
      return "warning";
    case "MEDIUM":
      return "default";
    case "LOW":
      return "secondary";
    default:
      return "secondary";
  }
}

export default function SupportPage() {
  const [tickets, setTickets] = React.useState<Ticket[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [ticket, setTicket] = React.useState<Ticket | null>(null);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [subject, setSubject] = React.useState("");
  const [priority, setPriority] = React.useState("MEDIUM");
  const [description, setDescription] = React.useState("");

  const [reply, setReply] = React.useState("");
  const [sendingReply, setSendingReply] = React.useState(false);

  const fetchTickets = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/support?page=${page}&limit=20`);
      const body = (await res.json()) as ApiResponse<Ticket[]> & {
        pagination?: { totalPages: number };
      };
      if (body.success) {
        setTickets(body.data);
        setTotalPages(body.pagination?.totalPages ?? 1);
      }
    } catch {
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [page]);

  React.useEffect(() => {
    const timer = setTimeout(() => fetchTickets(), 0);
    return () => clearTimeout(timer);
  }, [fetchTickets]);

  const loadDetail = React.useCallback(async (id: string) => {
    setDetailLoading(true);
    setTicket({ ...EMPTY_TICKET, id });
    try {
      const res = await fetch(`/api/support/${id}`);
      const body = (await res.json()) as ApiResponse<Ticket>;
      if (body.success) setTicket(body.data);
    } catch {
      setTicket(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, description, priority }),
      });
      const body = (await res.json()) as ApiResponse<Ticket> & {
        error?: { message?: string };
      };
      if (body.success) {
        toast({ title: "Ticket created" });
        setDialogOpen(false);
        setSubject("");
        setDescription("");
        setPriority("MEDIUM");
        setPage(1);
        fetchTickets();
      } else {
        toast({ title: "Failed to create ticket", description: body.error?.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Something went wrong", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket || !reply.trim()) return;
    setSendingReply(true);
    try {
      const res = await fetch(`/api/support/${ticket.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: reply }),
      });
      const body = (await res.json()) as ApiResponse<TicketReply> & {
        error?: { message?: string };
      };
      if (body.success) {
        setReply("");
        toast({ title: "Reply sent" });
        loadDetail(ticket.id);
        fetchTickets();
      } else {
        toast({ title: "Failed to send reply", description: body.error?.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Something went wrong", variant: "destructive" });
    } finally {
      setSendingReply(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Support</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Create tickets and track help requests for your workspace.
          </p>
        </div>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          New Ticket
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">My Tickets</CardTitle>
              <CardDescription>All support tickets for your workspace</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="space-y-3 p-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : tickets.length === 0 ? (
                <div className="flex flex-col items-center gap-3 p-10 text-center">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800">
                    <LifeBuoy className="size-6 text-zinc-400" />
                  </div>
                  <div>
                    <p className="font-semibold">No tickets yet</p>
                    <p className="mt-1 max-w-xs text-sm text-zinc-500">
                      Create your first support ticket to get help.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="divide-y">
                  {tickets.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => loadDetail(item.id)}
                      className={cn(
                        "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50",
                        ticket?.id === item.id && "bg-muted/50"
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-medium">{item.subject}</p>
                          <Badge variant={getStatusBadgeVariant(item.status)}>{item.status}</Badge>
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-xs text-zinc-500">
                          <Badge variant="outline">{item.priority}</Badge>
                          <span>{formatDate(item.createdAt)}</span>
                          <span className="inline-flex items-center gap-1">
                            <MessageSquare className="size-3" />
                            {item._count?.replies ?? 0}
                          </span>
                        </div>
                      </div>
                      <ArrowRight className="mt-1 size-4 shrink-0 text-zinc-400" />
                    </button>
                  ))}
                </div>
              )}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t p-3">
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
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3">
          {detailLoading ? (
            <Card>
              <CardContent className="space-y-3 p-6">
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ) : ticket ? (
            <div className="flex flex-col gap-4">
              <Card>
                <CardHeader>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <CardTitle className="text-lg">{ticket.subject}</CardTitle>
                      <CardDescription className="mt-1">
                        Opened by {ticket.user.name || ticket.user.email} on{" "}
                        {formatDate(ticket.createdAt)}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getStatusBadgeVariant(ticket.status)}>{ticket.status}</Badge>
                      <Badge variant={getPriorityBadgeVariant(ticket.priority)}>
                        {ticket.priority}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-300">
                    {ticket.description}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Replies</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!ticket.replies || ticket.replies.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-8 text-center">
                      <MessageSquare className="size-6 text-zinc-400" />
                      <p className="text-sm font-medium">No replies yet</p>
                      <p className="text-xs text-zinc-500">
                        The support team will respond shortly.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {ticket.replies.map((r) => (
                        <div key={r.id} className="rounded-lg border bg-muted/30 p-4">
                          <div className="mb-1 flex items-center justify-between gap-2">
                            <p className="text-sm font-medium">
                              {r.user.name || r.user.email}
                            </p>
                            <span className="text-xs text-zinc-500">
                              {formatDate(r.createdAt)}
                            </span>
                          </div>
                          <p className="whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-300">
                            {r.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  <form onSubmit={handleReply} className="space-y-2 pt-2">
                    <Textarea
                      placeholder="Write a reply..."
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      rows={4}
                    />
                    <div className="flex items-center justify-between gap-2">
                      <Button asChild variant="link" size="sm" className="px-0">
                        <Link href={`/support/${ticket.id}`}>Open full ticket</Link>
                      </Button>
                      <Button type="submit" size="sm" disabled={sendingReply || !reply.trim()}>
                        {sendingReply ? (
                          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="mr-1.5 h-4 w-4" />
                        )}
                        Send Reply
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800">
                  <LifeBuoy className="size-6 text-zinc-400" />
                </div>
                <div>
                  <p className="font-semibold">Select a ticket</p>
                  <p className="mt-1 text-sm text-zinc-500">
                    Choose a ticket from the list to view its details and replies.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Support Ticket</DialogTitle>
            <DialogDescription>
              Describe your issue and our team will help you resolve it.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                placeholder="What can we help you with?"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger id="priority">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe the issue in detail..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={creating || !subject.trim() || !description.trim()}>
                {creating && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                Create Ticket
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}