"use client";

import * as React from "react";
import { MessageSquare, Bot, Headphones, Search, ChevronLeft, ChevronRight } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Conversation {
  id: string;
  mode: string;
  detectedIntent: string | null;
  confidence: number | null;
  createdAt: string;
  conversation: {
    id: string;
    status: string;
    lastMessageAt: string | null;
    lastMessagePreview: string | null;
    unreadCount: number;
  };
  lead: { id: string; name: string | null; phone: string; status: string } | null;
}

export default function MySmartCardConversationsPage() {
  const [conversations, setConversations] = React.useState<Conversation[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [page, setPage] = React.useState(1);
  const [total, setTotal] = React.useState(0);
  const [modeFilter, setModeFilter] = React.useState("");
  const limit = 20;

  const loadConversations = () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (modeFilter) params.set("mode", modeFilter);

    fetch(`/api/private/mysmartcard/conversations?${params}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (body?.data) setConversations(body.data);
        if (body?.pagination) setTotal(body.pagination.total);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  React.useEffect(() => { loadConversations(); }, [page, modeFilter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Conversations</h1>
        <p className="text-muted-foreground">MySmartCard WhatsApp conversations and AI interactions.</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Select value={modeFilter} onValueChange={(v) => { setModeFilter(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All modes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All modes</SelectItem>
            <SelectItem value="AI">AI Handled</SelectItem>
            <SelectItem value="HUMAN">Human Handled</SelectItem>
            <SelectItem value="HYBRID">Hybrid</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="size-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        </div>
      ) : conversations.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <MessageSquare className="size-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No conversations yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {conversations.map((conv) => (
            <Card key={conv.id}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">
                        {conv.lead?.name || conv.lead?.phone || "Unknown"}
                      </h3>
                      <Badge variant="secondary" className={conv.mode === "AI" ? "bg-blue-500/10 text-blue-700" : conv.mode === "HUMAN" ? "bg-orange-500/10 text-orange-700" : "bg-purple-500/10 text-purple-700"}>
                        {conv.mode === "AI" ? <Bot className="size-3 mr-1" /> : <Headphones className="size-3 mr-1" />}
                        {conv.mode}
                      </Badge>
                      {conv.conversation.unreadCount > 0 && (
                        <Badge className="bg-red-500 text-white">{conv.conversation.unreadCount}</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 truncate max-w-lg">
                      {conv.conversation.lastMessagePreview || "No messages"}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      {conv.detectedIntent && (
                        <Badge variant="outline">{conv.detectedIntent.replace(/_/g, " ")}</Badge>
                      )}
                      {conv.lead && <Badge variant="outline">{conv.lead.status}</Badge>}
                      <span>{new Date(conv.conversation.lastMessageAt || conv.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {total > limit && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * limit + 1}-{Math.min(page * limit, total)} of {total}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page * limit >= total}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
