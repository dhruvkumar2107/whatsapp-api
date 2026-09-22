"use client";

import * as React from "react";
import { FileText, Plus, Loader2, Save } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";

interface Template {
  id: string;
  name: string;
  category: string;
  language: string;
  status: string;
  body: unknown;
  createdAt: string;
}

export default function MySmartCardTemplatesPage() {
  const [templates, setTemplates] = React.useState<Template[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showAdd, setShowAdd] = React.useState(false);
  const [form, setForm] = React.useState({ name: "", category: "UTILITY", bodyText: "" });
  const [saving, setSaving] = React.useState(false);

  const loadTemplates = () => {
    fetch("/api/private/mysmartcard/templates")
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => { if (body?.data) setTemplates(body.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  React.useEffect(() => { loadTemplates(); }, []);

  const handleCreate = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/private/mysmartcard/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          category: form.category,
          body: { text: form.bodyText },
        }),
      });
      if (res.ok) {
        toast({ title: "Template created" });
        setShowAdd(false);
        setForm({ name: "", category: "UTILITY", bodyText: "" });
        loadTemplates();
      }
    } catch {
      toast({ title: "Failed to create template", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="size-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Templates</h1>
          <p className="text-muted-foreground">WhatsApp message templates for MySmartCard.</p>
        </div>
        <Button onClick={() => setShowAdd(!showAdd)}>
          <Plus className="size-4 mr-2" /> Add Template
        </Button>
      </div>

      {showAdd && (
        <Card>
          <CardHeader>
            <CardTitle>New Template</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Template Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="welcome_message" />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="UTILITY">Utility</option>
                  <option value="MARKETING">Marketing</option>
                  <option value="AUTHENTICATION">Authentication</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Body Text</Label>
              <Textarea
                value={form.bodyText}
                onChange={(e) => setForm({ ...form, bodyText: e.target.value })}
                placeholder="Hi {{1}}, welcome to MySmartCard!..."
                className="min-h-[150px]"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={saving}>
                {saving ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Save className="size-4 mr-2" />}
                Create
              </Button>
              <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {templates.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <FileText className="size-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No templates yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {templates.map((tpl) => (
            <Card key={tpl.id}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{tpl.name}</h3>
                      <Badge variant="secondary">{tpl.category}</Badge>
                      <Badge variant={tpl.status === "APPROVED" ? "default" : "outline"}>{tpl.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">Language: {tpl.language}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
