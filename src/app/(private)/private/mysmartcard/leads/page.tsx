"use client";

import * as React from "react";
import { Users, Search, ChevronLeft, ChevronRight } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Lead {
  id: string;
  name: string | null;
  phone: string;
  email: string | null;
  company: string | null;
  city: string | null;
  status: string;
  leadScore: number;
  source: string;
  createdAt: string;
  product: { name: string } | null;
  assignedAgent: { name: string; email: string } | null;
}

const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  CONTACTED: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  INTERESTED: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  QUALIFIED: "bg-green-500/10 text-green-700 dark:text-green-400",
  PAYMENT_PENDING: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
  PURCHASED: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  FOLLOW_UP: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400",
  CONVERTED: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  LOST: "bg-red-500/10 text-red-700 dark:text-red-400",
};

export default function MySmartCardLeadsPage() {
  const [leads, setLeads] = React.useState<Lead[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [page, setPage] = React.useState(1);
  const [total, setTotal] = React.useState(0);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const limit = 20;

  const loadLeads = () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);

    fetch(`/api/private/mysmartcard/leads?${params}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (body?.data) setLeads(body.data);
        if (body?.pagination) setTotal(body.pagination.total);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  React.useEffect(() => { loadLeads(); }, [page, statusFilter]);

  const handleSearch = () => { setPage(1); loadLeads(); };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Leads</h1>
        <p className="text-muted-foreground">Manage your MySmartCard leads and prospects.</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search leads..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {Object.keys(STATUS_COLORS).map((status) => (
              <SelectItem key={status} value={status}>{status.replace(/_/g, " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="size-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        </div>
      ) : leads.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <Users className="size-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No leads found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {leads.map((lead) => (
            <Card key={lead.id}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{lead.name || "Unknown"}</h3>
                      <Badge variant="secondary" className={STATUS_COLORS[lead.status] || ""}>
                        {lead.status.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <span>{lead.phone}</span>
                      {lead.email && <span>{lead.email}</span>}
                      {lead.company && <span>{lead.company}</span>}
                      {lead.city && <span>{lead.city}</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      {lead.product && <Badge variant="outline">{lead.product.name}</Badge>}
                      <Badge variant="outline">Score: {lead.leadScore}</Badge>
                      <Badge variant="outline">{lead.source}</Badge>
                    </div>
                  </div>
                  {lead.assignedAgent && (
                    <div className="text-right text-sm text-muted-foreground">
                      <p>{lead.assignedAgent.name}</p>
                    </div>
                  )}
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
