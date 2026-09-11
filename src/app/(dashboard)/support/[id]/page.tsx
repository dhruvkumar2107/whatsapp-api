"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Loader2, MessageSquare, Send } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/use-toast";
import { formatDate } from "@/lib/utils";

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
  replies: TicketReply[];
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

const TICKET_STATUSES = ["OPEN", "IN_PROGRESS", "WAITING", "RESOLVED", "CLOSED"];

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

export default function SupportTicketPage() {
  const params = useParams<{ id: string }>();
  const ticketId = params?.id;

  const [ticket, setTicket] = React.useState<Ticket | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [reply, setReply] = React.useState("");
  const [sendingReply, setSendingReply] = React.useState(false);
  const [changingStatus, setChangingStatus] = React.useState<string | null>(null);

  const fetchTicket = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/support/${ticketId}`);
      const body = (await res.json()) as ApiResponse<Ticket>;
      if (body.success) setTicket(body.data);
    } catch {
      setTicket(null);
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  React.useEffect(() => {
    if (!ticketId) return;
    const timer = setTimeout(() => fetchTicket(), 0);
    return () => clearTimeout(timer);
  }, [ticketId, fetchTicket]);

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
      const body = (await res.json()) as ApiResponse<TicketReply> & { error?: { message?: string } };
      if (body.success) {
        setReply("");
        toast({ title: "Reply sent" });
        fetchTicket();
      } else {
        toast({ title: "Failed to send reply", description: body.error?.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Something went wrong", variant: "destructive" });
    } finally {
      setSendingReply(false);
    }
  };

  const handleStatusChange = async (status: string) => {
    if (!ticket) return;
    setChangingStatus(status);
    try {
      const res = await fetch(`/api/support/${ticket.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const body = (await res.json()) as ApiResponse<Ticket>;
      if (body.success) {
        setTicket(body.data);
        toast({ title: `Ticket marked as ${status}` });
      }
    } catch {
      toast({ title: "Failed to update status", variant: "destructive" });
    } finally {
      setChangingStatus(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex flex-col items-center gap-6 py-16 text-center">
        <div className="flex flex-col items-center gap-3">
          <MessageSquare className="size-10 text-zinc-400" />
          <div>
            <p className="font-semibold">Ticket not found</p>
            <p className="mt-1 text-sm text-zinc-500">
              The ticket you are looking for does not exist.
            </p>
          </div>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/support">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back to Support
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/support">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back to Support
          </Link>
        </Button>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {TICKET_STATUSES.map((status) => (
            <Button
              key={status}
              variant={ticket.status === status ? "default" : "outline"}
              size="sm"
              disabled={changingStatus !== null}
              onClick={() => handleStatusChange(status)}
            >
              {changingStatus === status && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              {status === "IN_PROGRESS" ? "In Progress" : status.charAt(0) + status.slice(1).toLowerCase()}
            </Button>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-xl">{ticket.subject}</CardTitle>
              <p className="mt-1 text-sm text-zinc-500">
                Opened by {ticket.user.name || ticket.user.email} on {formatDate(ticket.createdAt)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={getStatusBadgeVariant(ticket.status)}>{ticket.status}</Badge>
              <Badge variant={getPriorityBadgeVariant(ticket.priority)}>{ticket.priority}</Badge>
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
        <CardContent>
          {ticket.replies.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-8 text-center">
              <MessageSquare className="size-6 text-zinc-400" />
              <p className="text-sm font-medium">No replies yet</p>
              <p className="text-xs text-zinc-500">The support team will respond shortly.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {ticket.replies.map((r) => (
                <div key={r.id} className="rounded-lg border bg-muted/30 p-4">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{r.user.name || r.user.email}</p>
                    <span className="text-xs text-zinc-500">{formatDate(r.createdAt)}</span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-300">
                    {r.content}
                  </p>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleReply} className="mt-6 space-y-2">
            <Label htmlFor="reply">Add a reply</Label>
            <Textarea
              id="reply"
              placeholder="Write a reply..."
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              rows={4}
            />
            <div className="flex justify-end">
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
  );
}