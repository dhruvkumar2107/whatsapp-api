"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Users,
  Tag,
  Calendar,
  FileText,
  AlertTriangle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { TemplatePreview } from "@/components/templates/template-preview";
import { cn } from "@/lib/utils";

interface Template {
  id: string;
  name: string;
  category: string;
  language: string;
  status: string;
  header: { type?: string; text?: string } | null;
  body: { text?: string } | null;
  footer: string | null;
}

interface TagItem {
  id: string;
  name: string;
}

const STEPS = [
  { id: 1, label: "Details", icon: FileText },
  { id: 2, label: "Audience", icon: Users },
  { id: 3, label: "Template", icon: FileText },
  { id: 4, label: "Schedule", icon: Calendar },
  { id: 5, label: "Review", icon: Check },
] as const;

export default function NewCampaignPage() {
  const router = useRouter();
  const [step, setStep] = React.useState(1);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [audienceType, setAudienceType] = React.useState<"all" | "tags">("all");
  const [selectedTags, setSelectedTags] = React.useState<string[]>([]);
  const [templateId, setTemplateId] = React.useState("");
  const [sendNow, setSendNow] = React.useState(true);
  const [scheduledDate, setScheduledDate] = React.useState("");
  const [scheduledTime, setScheduledTime] = React.useState("09:00");

  const [templates, setTemplates] = React.useState<Template[]>([]);
  const [templatesLoading, setTemplatesLoading] = React.useState(false);
  const [tags, setTags] = React.useState<TagItem[]>([]);
  const [contactCount, setContactCount] = React.useState<number | null>(null);
  const [countLoading, setCountLoading] = React.useState(false);
  const [largeAudienceWarning, setLargeAudienceWarning] = React.useState(false);

  React.useEffect(() => {
    const fetchTemplates = async () => {
      setTemplatesLoading(true);
      try {
        const res = await fetch(
          "/api/templates?status=APPROVED&limit=100"
        );
        const body = await res.json();
        if (body.success) setTemplates(body.data);
      } catch {
        // ignore
      } finally {
        setTemplatesLoading(false);
      }
    };
    fetchTemplates();
  }, []);

  React.useEffect(() => {
    const fetchTags = async () => {
      try {
        const res = await fetch("/api/contacts/tags");
        if (res.ok) {
          const body = await res.json();
          if (body.success) setTags(body.data || []);
        }
      } catch {
        // ignore
      }
    };
    fetchTags();
  }, []);

  React.useEffect(() => {
    const fetchCount = async () => {
      setCountLoading(true);
      try {
        const params = new URLSearchParams();
        if (audienceType === "tags" && selectedTags.length > 0) {
          params.set("tags", selectedTags.join(","));
        }
        const res = await fetch(
          `/api/contacts/count?${params.toString()}`
        );
        if (res.ok) {
          const body = await res.json();
          if (body.success) {
            setContactCount(body.data?.count ?? 0);
            setLargeAudienceWarning((body.data?.count ?? 0) > 10000);
          }
        }
      } catch {
        setContactCount(null);
      } finally {
        setCountLoading(false);
      }
    };
    fetchCount();
  }, [audienceType, selectedTags]);

  const selectedTemplate = templates.find((t) => t.id === templateId);

  const canProceed = () => {
    switch (step) {
      case 1:
        return name.trim().length > 0;
      case 2:
        return true;
      case 3:
        return !!templateId;
      case 4:
        return sendNow || (scheduledDate.length > 0 && scheduledTime.length > 0);
      case 5:
        return true;
      default:
        return false;
    }
  };

  const handleCreate = async () => {
    setSaving(true);
    setError(null);

    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        description: description.trim() || undefined,
        templateId,
      };

      if (audienceType === "tags" && selectedTags.length > 0) {
        payload.contactFilter = { tags: selectedTags };
      }

      if (!sendNow) {
        const dt = new Date(`${scheduledDate}T${scheduledTime}`);
        payload.scheduledAt = dt.toISOString();
      }

      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body = await res.json();
      if (!body.success) {
        setError(body.error?.message || "Failed to create campaign");
        return;
      }

      if (sendNow && body.data?.id) {
        const startRes = await fetch(`/api/campaigns/${body.data.id}/start`, {
          method: "POST",
        });
        if (!startRes.ok) {
          setError("Campaign created but could not be started. You can start it from the campaign details page.");
        }
      }

      router.push("/campaigns");
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  };

  const toggleTag = (tagName: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagName)
        ? prev.filter((t) => t !== tagName)
        : [...prev, tagName]
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/campaigns">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New Campaign</h1>
          <p className="text-sm text-zinc-500">
            Set up a new broadcast campaign in a few steps.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {STEPS.map((s, i) => (
          <React.Fragment key={s.id}>
            <button
              onClick={() => s.id < step && setStep(s.id)}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                step === s.id
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : step > s.id
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
                    : "text-zinc-400"
              )}
            >
              {step > s.id ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <s.icon className="h-3.5 w-3.5" />
              )}
              {s.label}
            </button>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "h-px flex-1",
                  step > s.id ? "bg-emerald-200" : "bg-zinc-200 dark:bg-zinc-700"
                )}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Campaign Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Campaign Name</Label>
              <Input
                placeholder="e.g. Black Friday Sale 2024"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea
                placeholder="Brief description of this campaign..."
                className="min-h-[80px]"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Audience</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <button
                onClick={() => setAudienceType("all")}
                className={cn(
                  "flex-1 rounded-lg border p-4 text-left transition-colors",
                  audienceType === "all"
                    ? "border-zinc-900 bg-zinc-50 dark:border-zinc-100 dark:bg-zinc-800"
                    : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                )}
              >
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span className="text-sm font-medium">All Contacts</span>
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  Send to every contact in your workspace
                </p>
              </button>
              <button
                onClick={() => setAudienceType("tags")}
                className={cn(
                  "flex-1 rounded-lg border p-4 text-left transition-colors",
                  audienceType === "tags"
                    ? "border-zinc-900 bg-zinc-50 dark:border-zinc-100 dark:bg-zinc-800"
                    : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                )}
              >
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  <span className="text-sm font-medium">By Tags</span>
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  Target contacts with specific tags
                </p>
              </button>
            </div>

            {audienceType === "tags" && (
              <div className="space-y-2">
                <Label>Select Tags</Label>
                <div className="flex flex-wrap gap-2">
                  {tags.length === 0 ? (
                    <p className="text-xs text-zinc-400">
                      No tags found. Create tags in the Contacts section.
                    </p>
                  ) : (
                    tags.map((tag) => (
                      <button
                        key={tag.id}
                        onClick={() => toggleTag(tag.name)}
                        className={cn(
                          "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                          selectedTags.includes(tag.name)
                            ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                            : "border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400"
                        )}
                      >
                        <Tag className="h-3 w-3" />
                        {tag.name}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            <Separator />

            <div className="flex items-center gap-2 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/50">
              {countLoading ? (
                <Skeleton className="h-4 w-32" />
              ) : (
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-zinc-500" />
                  <span className="text-zinc-500">Matching contacts:</span>
                  <span className="font-semibold">
                    {contactCount !== null ? contactCount.toLocaleString() : "Unknown"}
                  </span>
                </div>
              )}
            </div>

            {largeAudienceWarning && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  This is a large audience. Campaigns with over 10,000 recipients
                  may take longer to process. Consider splitting into smaller
                  batches for better delivery tracking.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Select Template</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {templatesLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg border p-3">
                    <Skeleton className="h-4 w-4 rounded-full" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-16 rounded-full" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                ))}
              </div>
            ) : templates.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <FileText className="h-8 w-8 text-zinc-300" />
                <p className="text-sm font-medium">No approved templates</p>
                <p className="text-xs text-zinc-500">
                  Create and get a template approved before starting a campaign.
                </p>
                <Button asChild variant="outline" size="sm">
                  <Link href="/templates/new">Create Template</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {templates.map((template) => {
                  const bodyText =
                    typeof template.body === "object" && template.body?.text
                      ? template.body.text
                      : "";
                  const preview =
                    bodyText.length > 60 ? bodyText.slice(0, 60) + "..." : bodyText;

                  return (
                    <button
                      key={template.id}
                      onClick={() => setTemplateId(template.id)}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors",
                        templateId === template.id
                          ? "border-zinc-900 bg-zinc-50 dark:border-zinc-100 dark:bg-zinc-800"
                          : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                      )}
                    >
                      <div className="mt-0.5">
                        <div
                          className={cn(
                            "h-4 w-4 rounded-full border-2",
                            templateId === template.id
                              ? "border-zinc-900 dark:border-zinc-100"
                              : "border-zinc-300"
                          )}
                        >
                          {templateId === template.id && (
                            <div className="h-full w-full rounded-full bg-zinc-900 dark:bg-zinc-100" />
                          )}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {template.name}
                          </span>
                          <Badge variant="outline" className="text-[10px]">
                            {template.category}
                          </Badge>
                          <span className="text-[10px] text-zinc-400">
                            {template.language}
                          </span>
                        </div>
                        {preview && (
                          <p className="mt-1 text-xs text-zinc-500 truncate">
                            {preview}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Schedule</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <button
                onClick={() => setSendNow(true)}
                className={cn(
                  "flex-1 rounded-lg border p-4 text-left transition-colors",
                  sendNow
                    ? "border-zinc-900 bg-zinc-50 dark:border-zinc-100 dark:bg-zinc-800"
                    : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                )}
              >
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded-full border-2 border-emerald-500 bg-emerald-500" />
                  <span className="text-sm font-medium">Send Now</span>
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  Start sending immediately after creation
                </p>
              </button>
              <button
                onClick={() => setSendNow(false)}
                className={cn(
                  "flex-1 rounded-lg border p-4 text-left transition-colors",
                  !sendNow
                    ? "border-zinc-900 bg-zinc-50 dark:border-zinc-100 dark:bg-zinc-800"
                    : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                )}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "h-4 w-4 rounded-full border-2",
                      !sendNow
                        ? "border-zinc-900 bg-zinc-900 dark:border-zinc-100 dark:bg-zinc-100"
                        : "border-zinc-300"
                    )}
                  />
                  <span className="text-sm font-medium">Schedule</span>
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  Pick a date and time to send
                </p>
              </button>
            </div>

            {!sendNow && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Time</Label>
                  <Input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {step === 5 && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 flex flex-col gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Campaign Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-zinc-500">Name</p>
                    <p className="font-medium">{name}</p>
                  </div>
                  <div>
                    <p className="text-zinc-500">Status</p>
                    <Badge variant="outline">{sendNow ? "Will run immediately" : "Scheduled"}</Badge>
                  </div>
                  {description && (
                    <div className="col-span-2">
                      <p className="text-zinc-500">Description</p>
                      <p>{description}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Audience Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-zinc-500" />
                  <span className="text-zinc-500">Target:</span>
                  <span className="font-medium">
                    {audienceType === "all"
                      ? "All contacts"
                      : selectedTags.length > 0
                        ? `Contacts tagged: ${selectedTags.join(", ")}`
                        : "All contacts (no tags selected)"}
                  </span>
                </div>
                {contactCount !== null && (
                  <div className="mt-2 flex items-center gap-2 text-sm">
                    <span className="text-zinc-500">Estimated recipients:</span>
                    <span className="font-semibold text-lg">
                      {contactCount.toLocaleString()}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {!sendNow && scheduledDate && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Schedule</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">
                    {new Date(`${scheduledDate}T${scheduledTime}`).toLocaleString(
                      "en-US",
                      {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      }
                    )}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="lg:col-span-1">
            {selectedTemplate && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Template Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-3">
                    <Badge variant="outline" className="mb-1">
                      {selectedTemplate.category}
                    </Badge>
                    <p className="text-xs text-zinc-500">
                      {selectedTemplate.name} ({selectedTemplate.language})
                    </p>
                  </div>
                  <TemplatePreview
                    header={selectedTemplate.header}
                    body={selectedTemplate.body}
                    footer={selectedTemplate.footer}
                  />
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between border-t pt-4">
        <Button
          variant="outline"
          disabled={step === 1}
          onClick={() => setStep((s) => Math.max(1, s - 1))}
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back
        </Button>
        {step < 5 ? (
          <Button
            disabled={!canProceed()}
            onClick={() => setStep((s) => Math.min(5, s + 1))}
          >
            Next
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        ) : (
          <Button
            disabled={saving}
            onClick={handleCreate}
          >
            {saving ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Check className="mr-1.5 h-4 w-4" />
            )}
            {sendNow ? "Create & Start" : "Schedule Campaign"}
          </Button>
        )}
      </div>
    </div>
  );
}
