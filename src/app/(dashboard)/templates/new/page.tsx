"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Loader2,
  Save,
  Send,
  Type,
  Image,
  Film,
  FileText,
  MousePointerClick,
  Phone,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { TemplatePreview } from "@/components/templates/template-preview";
import { cn } from "@/lib/utils";

interface ButtonConfig {
  type: "QUICK_REPLY" | "PHONE_NUMBER" | "URL";
  text: string;
  url?: string;
  phoneNumber?: string;
}

interface HeaderConfig {
  type: "text" | "image" | "video" | "document";
  text?: string;
  imageUrl?: string;
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

function countVariables(text: string): number {
  const matches = text.match(/\{\{(\d+)\}\}/g);
  if (!matches) return 0;
  const nums = matches.map((m) => parseInt(m.replace(/\D/g, "")));
  return Math.max(...nums, 0);
}

export default function NewTemplatePage() {
  const router = useRouter();
  const [saving, setSaving] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const [name, setName] = React.useState("");
  const [category, setCategory] = React.useState<string>("MARKETING");
  const [language, setLanguage] = React.useState("en");
  const [header, setHeader] = React.useState<HeaderConfig>({ type: "text" });
  const [bodyText, setBodyText] = React.useState("");
  const [footer, setFooter] = React.useState("");
  const [buttons, setButtons] = React.useState<ButtonConfig[]>([]);

  const bodyVariableCount = countVariables(bodyText);
  const headerVariableCount = header.type === "text" ? countVariables(header.text || "") : 0;

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = "Template name is required";
    if (name.length > 100) newErrors.name = "Name must be 100 characters or less";
    if (!bodyText.trim()) newErrors.body = "Body text is required";
    if (bodyText.length > 1024)
      newErrors.body = "Body text must be 1024 characters or less";
    if (header.type === "text" && (header.text?.length || 0) > 60)
      newErrors.header = "Header text must be 60 characters or less";
    if (footer.length > 60)
      newErrors.footer = "Footer must be 60 characters or less";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const buildComponents = () => {
    const components: Array<{
      type: string;
      text?: string;
      parameters?: Array<{ type: string; text?: string }>;
    }> = [];

    if (header.type === "text" && header.text) {
      components.push({ type: "HEADER", text: header.text });
    } else if (header.type === "image" && header.imageUrl) {
      components.push({
        type: "HEADER",
        text: "",
        parameters: [{ type: "image", text: header.imageUrl }],
      });
    } else if (header.type === "video" && header.imageUrl) {
      components.push({
        type: "HEADER",
        text: "",
        parameters: [{ type: "video", text: header.imageUrl }],
      });
    } else if (header.type === "document" && header.imageUrl) {
      components.push({
        type: "HEADER",
        text: "",
        parameters: [{ type: "document", text: header.imageUrl }],
      });
    }

    components.push({ type: "BODY", text: bodyText });

    if (footer) {
      components.push({ type: "FOOTER", text: footer });
    }

    if (buttons.length > 0) {
      const btnTexts = buttons.map((b) => ({
        type: "button",
        text: b.text,
      }));
      components.push({
        type: "BUTTONS",
        text: JSON.stringify(btnTexts),
      });
    }

    return components;
  };

  const handleSave = async (status: "DRAFT" | "SUBMIT") => {
    if (!validate()) return;
    setSaving(true);

    try {
      const payload = {
        name: name.trim(),
        language,
        category,
        components: buildComponents(),
      };

      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body = await res.json();
      if (!body.success) {
        setErrors({ submit: body.error?.message || "Failed to create template" });
        return;
      }

      if (status === "SUBMIT" && body.data?.id) {
        const submitRes = await fetch(`/api/templates/${body.data.id}/submit`, {
          method: "POST",
        });
        if (!submitRes.ok) {
          setErrors({ submit: "Template created but submission failed. You can submit later." });
          return;
        }
      }

      router.push("/templates");
    } catch {
      setErrors({ submit: "An unexpected error occurred" });
    } finally {
      setSaving(false);
    }
  };

  const addButton = (type: ButtonConfig["type"]) => {
    if (buttons.length >= 3) return;
    const newBtn: ButtonConfig = { type, text: "" };
    setButtons([...buttons, newBtn]);
  };

  const removeButton = (index: number) => {
    setButtons(buttons.filter((_, i) => i !== index));
  };

  const updateButton = (index: number, updates: Partial<ButtonConfig>) => {
    setButtons(
      buttons.map((b, i) => (i === index ? { ...b, ...updates } : b))
    );
  };

  const previewVariables: Record<string, string> = {};
  for (let i = 1; i <= Math.max(bodyVariableCount, headerVariableCount); i++) {
    previewVariables[String(i)] = `Example ${i}`;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/templates">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create Template</h1>
          <p className="text-sm text-zinc-500">
            Design a WhatsApp message template for your campaigns.
          </p>
        </div>
      </div>

      {errors.submit && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {errors.submit}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Template Name</Label>
                <Input
                  id="name"
                  placeholder="e.g. welcome_message"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  error={!!errors.name}
                />
                {errors.name && (
                  <p className="text-xs text-red-500">{errors.name}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={category} onValueChange={(v) => setCategory(v)}>
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
              <CardTitle className="text-base">Header</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                {[
                  { type: "text" as const, icon: Type, label: "Text" },
                  { type: "image" as const, icon: Image, label: "Image" },
                  { type: "video" as const, icon: Film, label: "Video" },
                  { type: "document" as const, icon: FileText, label: "Document" },
                ].map(({ type, icon: Icon, label }) => (
                  <button
                    key={type}
                    onClick={() => setHeader({ ...header, type })}
                    className={cn(
                      "flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                      header.type === type
                        ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                        : "border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </button>
                ))}
              </div>

              {header.type === "text" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Header Text</Label>
                    <span className="text-xs text-zinc-400">
                      {(header.text || "").length}/60
                    </span>
                  </div>
                  <Input
                    placeholder="e.g. Your order is confirmed!"
                    value={header.text || ""}
                    onChange={(e) => setHeader({ ...header, text: e.target.value })}
                    error={!!errors.header}
                  />
                  {errors.header && (
                    <p className="text-xs text-red-500">{errors.header}</p>
                  )}
                </div>
              )}

              {header.type !== "text" && header.type !== "document" && (
                <div className="space-y-2">
                  <Label>Media URL (optional)</Label>
                  <Input
                    placeholder="https://example.com/image.jpg"
                    value={header.imageUrl || ""}
                    onChange={(e) =>
                      setHeader({ ...header, imageUrl: e.target.value })
                    }
                  />
                  <p className="text-xs text-zinc-400">
                    Leave empty to use a placeholder in preview
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Body</CardTitle>
                {bodyVariableCount > 0 && (
                  <Badge variant="secondary" className="text-[10px]">
                    {bodyVariableCount} variable{bodyVariableCount !== 1 ? "s" : ""}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Message Text</Label>
                <span className="text-xs text-zinc-400">
                  {bodyText.length}/1024
                </span>
              </div>
              <Textarea
                placeholder="Hello {{1}}, your order #{{2}} has been confirmed. Thank you for your purchase!"
                className="min-h-[160px] font-mono text-sm"
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                error={!!errors.body}
              />
              {errors.body && (
                <p className="text-xs text-red-500">{errors.body}</p>
              )}
              <p className="text-xs text-zinc-400">
                Use {"{{1}}"}, {"{{2}}"}, etc. for dynamic variables that will be replaced
                with actual values when sending.
              </p>
              {bodyVariableCount > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {Array.from({ length: bodyVariableCount }).map((_, i) => (
                    <Badge key={i} variant="outline" className="text-[10px] font-mono">
                      {"{"}{"{"}{i + 1}{"}"}{"}"}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Footer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Footer Text (optional)</Label>
                <span className="text-xs text-zinc-400">
                  {(footer || "").length}/60
                </span>
              </div>
              <Input
                placeholder="Tap to unsubscribe"
                value={footer}
                onChange={(e) => setFooter(e.target.value)}
                error={!!errors.footer}
              />
              {errors.footer && (
                <p className="text-xs text-red-500">{errors.footer}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Buttons</CardTitle>
                <span className="text-xs text-zinc-400">
                  {buttons.length}/3
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {buttons.map((btn, i) => (
                <div key={i} className="flex items-start gap-3 rounded-lg border p-3">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">
                        {btn.type === "QUICK_REPLY"
                          ? "Quick Reply"
                          : btn.type === "PHONE_NUMBER"
                            ? "Call"
                            : "URL"}
                      </Badge>
                    </div>
                    <Input
                      placeholder="Button text"
                      value={btn.text}
                      onChange={(e) => updateButton(i, { text: e.target.value })}
                    />
                    {btn.type === "URL" && (
                      <Input
                        placeholder="https://example.com"
                        value={btn.url || ""}
                        onChange={(e) => updateButton(i, { url: e.target.value })}
                      />
                    )}
                    {btn.type === "PHONE_NUMBER" && (
                      <Input
                        placeholder="+1234567890"
                        value={btn.phoneNumber || ""}
                        onChange={(e) =>
                          updateButton(i, { phoneNumber: e.target.value })
                        }
                      />
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="mt-0.5 shrink-0 text-red-500 hover:text-red-600"
                    onClick={() => removeButton(i)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              {buttons.length < 3 && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addButton("QUICK_REPLY")}
                  >
                    <MousePointerClick className="mr-1.5 h-3.5 w-3.5" />
                    Quick Reply
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addButton("URL")}
                  >
                    <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                    URL
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addButton("PHONE_NUMBER")}
                  >
                    <Phone className="mr-1.5 h-3.5 w-3.5" />
                    Call
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-6 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <TemplatePreview
                  header={
                    header.type === "text" && header.text
                      ? { type: "text", text: header.text }
                      : header.type !== "text"
                        ? { type: header.type, imageUrl: header.imageUrl }
                        : null
                  }
                  body={bodyText ? { text: bodyText } : null}
                  footer={footer || null}
                  buttons={
                    buttons.length > 0
                      ? buttons.map((b) => ({
                          type: b.type,
                          text: b.text || "Button",
                        }))
                      : null
                  }
                  variables={previewVariables}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  className="w-full"
                  onClick={() => handleSave("DRAFT")}
                  disabled={saving}
                >
                  {saving ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-1.5 h-4 w-4" />
                  )}
                  Save as Draft
                </Button>
                <Button
                  className="w-full"
                  variant="default"
                  onClick={() => handleSave("SUBMIT")}
                  disabled={saving}
                >
                  {saving ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-1.5 h-4 w-4" />
                  )}
                  Submit for Review
                </Button>
                <p className="text-center text-[10px] text-zinc-400">
                  Submitting sends the template to Meta for approval. This may
                  take up to 24 hours.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
