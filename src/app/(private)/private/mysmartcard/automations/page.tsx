"use client";

import * as React from "react";
import { Zap, Plus, Loader2, Save, Trash2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";

interface Automation {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  trigger: unknown;
  actions: unknown;
  lastExecutedAt: string | null;
  createdAt: string;
}

export default function MySmartCardAutomationsPage() {
  const [automations, setAutomations] = React.useState<Automation[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showAdd, setShowAdd] = React.useState(false);
  const [form, setForm] = React.useState({ name: "", description: "" });
  const [saving, setSaving] = React.useState(false);

  const loadAutomations = () => {
    fetch("/api/private/mysmartcard/automations")
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => { if (body?.data) setAutomations(body.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  React.useEffect(() => { loadAutomations(); }, []);

  const handleCreate = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/private/mysmartcard/automations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          trigger: { type: "manual" },
          actions: [],
        }),
      });
      if (res.ok) {
        toast({ title: "Automation created" });
        setShowAdd(false);
        setForm({ name: "", description: "" });
        loadAutomations();
      }
    } catch {
      toast({ title: "Failed to create automation", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    try {
      await fetch(`/api/private/mysmartcard/automations/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      loadAutomations();
    } catch {}
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
          <h1 className="text-2xl font-bold tracking-tight">Automations</h1>
          <p className="text-muted-foreground">Automated workflows for MySmartCard conversations and leads.</p>
        </div>
        <Button onClick={() => setShowAdd(!showAdd)}>
          <Plus className="size-4 mr-2" /> Create Automation
        </Button>
      </div>

      {showAdd && (
        <Card>
          <CardHeader>
            <CardTitle>New Automation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="New Lead Follow-up" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Automatically follow up with new leads..." />
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

      {automations.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <Zap className="size-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No automations yet. Create your first automation.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {automations.map((auto) => (
            <Card key={auto.id}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{auto.name}</h3>
                      <Badge variant={auto.isActive ? "default" : "secondary"}>
                        {auto.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{auto.description || "No description"}</p>
                    {auto.lastExecutedAt && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Last executed: {new Date(auto.lastExecutedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <Switch
                    checked={auto.isActive}
                    onCheckedChange={() => handleToggle(auto.id, auto.isActive)}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
