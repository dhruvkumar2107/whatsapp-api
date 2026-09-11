"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Save,
  Send,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { TemplatePreview } from "@/components/templates/template-preview";
import { formatDate } from "@/lib/utils";

interface Template {
  id: string;
  name: string;
  category: string;
  language: string;
  status: string;
  header: { type?: string; text?: string; imageUrl?: string } | null;
  body: { text?: string } | null;
  footer: string | null;
  buttons: Array<{
    type: string;
    text?: string;
    url?: string;
    phoneNumber?: string;
  }> | null;
  rejectionReason: string | null;
  metaTemplateId: string | null;
  createdAt: string;
  updatedAt: string;
}

const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "es", name: "Spanish" },
  { code: "pt", name: "Portuguese" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "it", name: "Italian" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "zh", name: "Chinese" },
  { code: "ar", name: "Arabic" },
  { code: "hi", name: "Hindi" },
  { code: "ru", name: "Russian" },
  { code: "nl", name: "Dutch" },
  { code: "tr", name: "Turkish" },
  { code: "id", name: "Indonesian" },
];

const CATEGORIES = [
  { value: "MARKETING", label: "Marketing" },
  { value: "UTILITY", label: "Utility" },
  { value: "AUTHENTICATION", label: "Authentication" },
] as const;

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

export default function TemplateDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [template, setTemplate] = React.useState<Template | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [editing, setEditing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [name, setName] = React.useState("");
  const [category, setCategory] = React.useState("MARKETING");
  const [language, setLanguage] = React.useState("en");
  const [bodyText, setBodyText] = React.useState("");
  const [footer, setFooter] = React.useState("");
  const [header, setHeader] = React.useState<{
    type?: string;
    text?: string;
  } | null>(null);

  React.useEffect(() => {
    const fetchTemplate = async () => {
      try {
        const res = await fetch(`/api/templates/${id}`);
        const body = await res.json();
        if (body.success && body.data) {
          const t = body.data as Template;
          setTemplate(t);
          setName(t.name);
          setCategory(t.category);
          setLanguage(t.language);
          setBodyText(
            typeof t.body === "object" && t.body?.text ? t.body.text : ""
          );
          setFooter(t.footer || "");
          setHeader(t.header);
        } else {
          setError("Template not found");
        }
      } catch {
        setError("Failed to load template");
      } finally {
        setLoading(false);
      }
    };
    fetchTemplate();
  }, [id]);

  const isEditable =
    template?.status === "DRAFT" || template?.status === "REJECTED";

  const handleSave = async () => {
    setSaving(true);
    try {
      const components: Array<{
        type: string;
        text?: string;
        parameters?: unknown[];
      }> = [];

      if (header) {
        components.push({ type: "HEADER", text: header.text });
      }
      components.push({ type: "BODY", text: bodyText });
      if (footer) {
        components.push({ type: "FOOTER", text: footer });
      }

      const res = await fetch(`/api/templates/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          language,
          category,
          components,
        }),
      });

      const body = await res.json();
      if (body.success) {
        setTemplate(body.data);
        setEditing(false);
      } else {
        setError(body.error?.message || "Failed to update");
      }
    } catch {
      setError("Failed to update template");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/templates/${id}/submit`, {
        method: "POST",
      });
      const body = await res.json();
      if (body.success) {
        setTemplate(body.data);
        setEditing(false);
      } else {
        setError(body.error?.message || "Failed to submit");
      }
    } catch {
      setError("Failed to submit template");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/templates/${id}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/templates");
      }
    } catch {
      setError("Failed to delete template");
    }
  };

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
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error && !template) {
    return (
      <div className="flex flex-col items-center gap-4 py-20">
        <p className="text-zinc-500">{error}</p>
        <Button asChild variant="outline" size="sm">
          <Link href="/templates">Back to templates</Link>
        </Button>
      </div>
    );
  }

  const countVariables = (text: string) => {
    const matches = text.match(/\{\{(\d+)\}\}/g);
    if (!matches) return 0;
    const nums = matches.map((m) => parseInt(m.replace(/\D/g, "")));
    return Math.max(...nums, 0);
  };

  const varCount = countVariables(bodyText);
  const previewVars: Record<string, string> = {};
  for (let i = 1; i <= varCount; i++) {
    previewVars[String(i)] = `Example ${i}`;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/templates">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{template?.name}</h1>
            {template && (
              <Badge variant={getStatusBadgeVariant(template.status)}>
                {template.status}
              </Badge>
            )}
          </div>
          <p className="text-sm text-zinc-500">
            Created {template ? formatDate(template.createdAt) : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isEditable && !editing && (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              Edit
            </Button>
          )}
          {isEditable && (
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-1.5 h-4 w-4" />
              )}
              {template?.status === "REJECTED" ? "Resubmit" : "Submit for Review"}
            </Button>
          )}
          {template?.status !== "PENDING" && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="mr-1.5 h-4 w-4" />
              Delete
            </Button>
          )}
        </div>
      </div>

      {template?.status === "REJECTED" && template.rejectionReason && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-sm font-medium text-red-800 dark:text-red-300">
            Rejection Reason
          </p>
          <p className="mt-1 text-sm text-red-700 dark:text-red-400">
            {template.rejectionReason}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 flex flex-col gap-4">
          {editing ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map((c) => (
                            <SelectItem key={c.value} value={c.value}>
                              {c.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Language</Label>
                      <Select value={language} onValueChange={setLanguage}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LANGUAGES.map((l) => (
                            <SelectItem key={l.code} value={l.code}>
                              {l.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Body</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Message Text</Label>
                    <span className="text-xs text-zinc-400">{bodyText.length}/1024</span>
                  </div>
                  <Textarea
                    className="min-h-[160px] font-mono text-sm"
                    value={bodyText}
                    onChange={(e) => setBodyText(e.target.value)}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Footer</CardTitle>
                </CardHeader>
                <CardContent>
                  <Input
                    value={footer}
                    onChange={(e) => setFooter(e.target.value)}
                    placeholder="Optional footer"
                  />
                </CardContent>
              </Card>

              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-1.5 h-4 w-4" />
                  )}
                  Save Changes
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditing(false);
                    if (template) {
                      setName(template.name);
                      setCategory(template.category);
                      setLanguage(template.language);
                      setBodyText(
                        typeof template.body === "object" && template.body?.text
                          ? template.body.text
                          : ""
                      );
                      setFooter(template.footer || "");
                      setHeader(template.header);
                    }
                  }}
                >
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-zinc-500">Category</p>
                      <Badge variant="outline" className="mt-1">
                        {template?.category}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-zinc-500">Language</p>
                      <p className="mt-1 font-medium">
                        {LANGUAGES.find((l) => l.code === template?.language)?.name ||
                          template?.language}
                      </p>
                    </div>
                    <div>
                      <p className="text-zinc-500">Meta Template ID</p>
                      <p className="mt-1 font-mono text-xs">
                        {template?.metaTemplateId || "N/A"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {header && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Header</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Badge variant="outline" className="mb-2">
                      {header.type}
                    </Badge>
                    {header.text && (
                      <p className="text-sm">{header.text}</p>
                    )}
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Body</CardTitle>
                    {varCount > 0 && (
                      <Badge variant="secondary" className="text-[10px]">
                        {varCount} variable{varCount !== 1 ? "s" : ""}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">
                    {bodyText}
                  </p>
                </CardContent>
              </Card>

              {footer && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Footer</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-zinc-500">{footer}</p>
                  </CardContent>
                </Card>
              )}

              {template?.buttons && template.buttons.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Buttons</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {template.buttons.map((btn, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 rounded border p-2 text-sm"
                      >
                        <Badge variant="outline" className="text-[10px]">
                          {btn.type}
                        </Badge>
                        {btn.text}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Timestamps</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-zinc-500">Created</p>
                      <p>{template ? formatDate(template.createdAt) : ""}</p>
                    </div>
                    <div>
                      <p className="text-zinc-500">Last Updated</p>
                      <p>{template ? formatDate(template.updatedAt) : ""}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <TemplatePreview
                  header={
                    header?.text
                      ? { type: "text", text: header.text }
                      : header?.type && header.type !== "text"
                        ? { type: header.type }
                        : null
                  }
                  body={bodyText ? { text: bodyText } : null}
                  footer={footer || null}
                  buttons={
                    template?.buttons && template.buttons.length > 0
                      ? template.buttons.map((b) => ({
                          type: b.type,
                          text: b.text || "Button",
                        }))
                      : null
                  }
                  variables={previewVars}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Template</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{template?.name}&quot;? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
