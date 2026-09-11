"use client";

import * as React from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  LayoutGrid,
  List,
  FileText,
  Filter,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, formatDate } from "@/lib/utils";

interface Template {
  id: string;
  name: string;
  category: string;
  language: string;
  status: string;
  body: { text?: string } | null;
  header: { text?: string; type?: string } | null;
  createdAt: string;
  updatedAt: string;
}

interface ApiResponse {
  success: boolean;
  data: Template[];
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
    case "APPROVED":
      return "success";
    case "PENDING":
      return "warning";
    case "REJECTED":
      return "destructive";
    case "DRAFT":
      return "secondary";
    default:
      return "outline";
  }
}

function getCategoryLabel(category: string): string {
  switch (category) {
    case "MARKETING":
      return "Marketing";
    case "UTILITY":
      return "Utility";
    case "AUTHENTICATION":
      return "Authentication";
    default:
      return category;
  }
}

function TemplateCard({ template }: { template: Template }) {
  const bodyText =
    typeof template.body === "object" && template.body?.text
      ? template.body.text
      : "No body text";
  const previewSnippet =
    bodyText.length > 80 ? bodyText.slice(0, 80) + "..." : bodyText;

  return (
    <Link href={`/templates/${template.id}`} className="block">
      <Card className="transition-colors hover:border-zinc-300 hover:bg-zinc-50/50 dark:hover:border-zinc-600 dark:hover:bg-zinc-800/50">
        <CardContent className="p-4">
          <div className="mb-3 flex items-start justify-between gap-2">
            <h3 className="text-sm font-semibold leading-tight text-zinc-900 dark:text-zinc-100">
              {template.name}
            </h3>
            <Badge variant={getStatusBadgeVariant(template.status)} className="shrink-0">
              {template.status}
            </Badge>
          </div>
          <div className="mb-3 flex items-center gap-2">
            <Badge variant="outline" className="text-[10px]">
              {getCategoryLabel(template.category)}
            </Badge>
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
              {template.language}
            </span>
          </div>
          <p className="line-clamp-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
            {previewSnippet}
          </p>
          <div className="mt-3 flex items-center justify-between text-[10px] text-zinc-400 dark:text-zinc-500">
            <span>Updated {formatDate(template.updatedAt)}</span>
            <span>
              {template.header?.type === "image"
                ? "Image header"
                : template.header?.type === "video"
                  ? "Video header"
                  : "Text header"}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function TemplateCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-3 flex items-start justify-between">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <div className="mb-3 flex gap-2">
          <Skeleton className="h-4 w-20 rounded-full" />
          <Skeleton className="h-4 w-10" />
        </div>
        <Skeleton className="h-3 w-full mb-1.5" />
        <Skeleton className="h-3 w-3/4" />
        <div className="mt-3 flex justify-between">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-20" />
        </div>
      </CardContent>
    </Card>
  );
}

function TemplateTableRow({ template }: { template: Template }) {
  const bodyText =
    typeof template.body === "object" && template.body?.text
      ? template.body.text
      : "";
  const previewSnippet =
    bodyText.length > 50 ? bodyText.slice(0, 50) + "..." : bodyText;

  return (
    <Link href={`/templates/${template.id}`} className="block">
      <tr className="border-b transition-colors hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50">
        <td className="p-3 text-sm font-medium">{template.name}</td>
        <td className="p-3">
          <Badge variant="outline" className="text-[10px]">
            {getCategoryLabel(template.category)}
          </Badge>
        </td>
        <td className="p-3 text-xs text-zinc-500">{template.language}</td>
        <td className="p-3">
          <Badge variant={getStatusBadgeVariant(template.status)}>
            {template.status}
          </Badge>
        </td>
        <td className="max-w-[200px] truncate p-3 text-xs text-zinc-500">
          {previewSnippet}
        </td>
        <td className="p-3 text-xs text-zinc-400">
          {formatDate(template.updatedAt)}
        </td>
      </tr>
    </Link>
  );
}

export default function TemplatesPage() {
  const [templates, setTemplates] = React.useState<Template[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [activeTab, setActiveTab] = React.useState("all");
  const [viewMode, setViewMode] = React.useState<"grid" | "list">("grid");
  const [categoryFilter, setCategoryFilter] = React.useState("all");
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [counts, setCounts] = React.useState<Record<string, number>>({});

  const fetchTemplates = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "12");
      if (search) params.set("search", search);
      if (activeTab !== "all") params.set("status", activeTab);
      if (categoryFilter !== "all") params.set("category", categoryFilter);

      const res = await fetch(`/api/templates?${params.toString()}`);
      const body: ApiResponse = await res.json();

      if (body.success) {
        setTemplates(body.data);
        setTotalPages(body.pagination.totalPages);
      }
    } catch {
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, activeTab, categoryFilter]);

  React.useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  React.useEffect(() => {
    const fetchCounts = async () => {
      try {
        const statuses = ["APPROVED", "PENDING", "REJECTED", "DRAFT"];
        const results = await Promise.all(
          statuses.map(async (status) => {
            const params = new URLSearchParams({ status, limit: "1" });
            const res = await fetch(`/api/templates?${params.toString()}`);
            const body: ApiResponse = await res.json();
            return { status, count: body.pagination?.total || 0 };
          })
        );
        const newCounts: Record<string, number> = { all: 0 };
        for (const r of results) {
          newCounts[r.status] = r.count;
          newCounts.all += r.count;
        }
        setCounts(newCounts);
      } catch {
        // ignore
      }
    };
    fetchCounts();
  }, [templates]);

  React.useEffect(() => {
    setPage(1);
  }, [activeTab, categoryFilter, search]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Templates</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Create and manage your WhatsApp message templates.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild size="sm">
            <Link href="/templates/new">
              <Plus className="mr-1.5 h-4 w-4" />
              Create Template
            </Link>
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList>
            <TabsTrigger value="all">
              All
              {counts.all !== undefined && (
                <span className="ml-1.5 text-xs text-zinc-400">{counts.all}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="APPROVED">
              Approved
              {counts.APPROVED !== undefined && (
                <span className="ml-1.5 text-xs text-zinc-400">{counts.APPROVED}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="PENDING">
              Pending
              {counts.PENDING !== undefined && (
                <span className="ml-1.5 text-xs text-zinc-400">{counts.PENDING}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="REJECTED">
              Rejected
              {counts.REJECTED !== undefined && (
                <span className="ml-1.5 text-xs text-zinc-400">{counts.REJECTED}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="DRAFT">
              Draft
              {counts.DRAFT !== undefined && (
                <span className="ml-1.5 text-xs text-zinc-400">{counts.DRAFT}</span>
              )}
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
              <Input
                placeholder="Search templates..."
                className="h-8 w-48 pl-8 text-xs"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-8 w-32 text-xs">
                <Filter className="mr-1.5 h-3 w-3" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                <SelectItem value="MARKETING">Marketing</SelectItem>
                <SelectItem value="UTILITY">Utility</SelectItem>
                <SelectItem value="AUTHENTICATION">Authentication</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex rounded-md border border-zinc-200 dark:border-zinc-700">
              <button
                onClick={() => setViewMode("grid")}
                className={cn(
                  "rounded-l-md p-1.5 transition-colors",
                  viewMode === "grid"
                    ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-700"
                    : "text-zinc-400 hover:text-zinc-600"
                )}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={cn(
                  "rounded-r-md p-1.5 transition-colors",
                  viewMode === "list"
                    ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-700"
                    : "text-zinc-400 hover:text-zinc-600"
                )}
              >
                <List className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        <TabsContent value={activeTab} className="mt-4">
          {loading ? (
            viewMode === "grid" ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <TemplateCardSkeleton key={i} />
                ))}
              </div>
            ) : (
              <div className="rounded-lg border">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b bg-zinc-50 dark:bg-zinc-800">
                      <th className="p-3 font-medium text-zinc-500">Name</th>
                      <th className="p-3 font-medium text-zinc-500">Category</th>
                      <th className="p-3 font-medium text-zinc-500">Language</th>
                      <th className="p-3 font-medium text-zinc-500">Status</th>
                      <th className="p-3 font-medium text-zinc-500">Preview</th>
                      <th className="p-3 font-medium text-zinc-500">Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b">
                        <td className="p-3"><Skeleton className="h-4 w-28" /></td>
                        <td className="p-3"><Skeleton className="h-4 w-20 rounded-full" /></td>
                        <td className="p-3"><Skeleton className="h-4 w-10" /></td>
                        <td className="p-3"><Skeleton className="h-5 w-16 rounded-full" /></td>
                        <td className="p-3"><Skeleton className="h-3 w-40" /></td>
                        <td className="p-3"><Skeleton className="h-3 w-20" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : templates.length === 0 ? (
            <Card className="border-dashed">
              <div className="flex flex-col items-center gap-3 p-10 text-center">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800">
                  <FileText className="size-6 text-zinc-400" />
                </div>
                <div>
                  <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                    No templates found
                  </p>
                  <p className="mt-1 max-w-sm text-sm text-zinc-500">
                    {search
                      ? "No templates match your search. Try a different term."
                      : "Create your first WhatsApp template to get started with campaigns."}
                  </p>
                </div>
                {!search && (
                  <Button asChild size="sm">
                    <Link href="/templates/new">
                      <Plus className="mr-1.5 h-4 w-4" />
                      Create Template
                    </Link>
                  </Button>
                )}
              </div>
            </Card>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {templates.map((template) => (
                <TemplateCard key={template.id} template={template} />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b bg-zinc-50 dark:bg-zinc-800">
                    <th className="p-3 font-medium text-zinc-500">Name</th>
                    <th className="p-3 font-medium text-zinc-500">Category</th>
                    <th className="p-3 font-medium text-zinc-500">Language</th>
                    <th className="p-3 font-medium text-zinc-500">Status</th>
                    <th className="p-3 font-medium text-zinc-500">Preview</th>
                    <th className="p-3 font-medium text-zinc-500">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {templates.map((template) => (
                    <TemplateTableRow key={template.id} template={template} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>

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
