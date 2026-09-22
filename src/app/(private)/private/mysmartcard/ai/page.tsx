"use client";

import * as React from "react";
import { Bot, Save, Loader2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";

interface AIConfig {
  agentName: string;
  personality: string;
  systemInstructions: string;
  modelProvider: string;
  modelId: string;
  temperature: number;
  maxResponseLength: number;
  fallbackBehavior: string;
  isActive: boolean;
}

export default function MySmartCardAIPage() {
  const [config, setConfig] = React.useState<AIConfig>({
    agentName: "MySmartCard Assistant",
    personality: "Friendly, Professional, Helpful, Concise",
    systemInstructions: "",
    modelProvider: "openai",
    modelId: "gpt-4o-mini",
    temperature: 0.7,
    maxResponseLength: 1024,
    fallbackBehavior: "transfer_to_human",
    isActive: true,
  });
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    fetch("/api/private/mysmartcard/ai")
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (body?.data) {
          setConfig({
            agentName: body.data.agentName || "MySmartCard Assistant",
            personality: body.data.personality || "Friendly, Professional, Helpful, Concise",
            systemInstructions: body.data.systemInstructions || "",
            modelProvider: body.data.modelProvider || "openai",
            modelId: body.data.modelId || "gpt-4o-mini",
            temperature: body.data.temperature || 0.7,
            maxResponseLength: body.data.maxResponseLength || 1024,
            fallbackBehavior: body.data.fallbackBehavior || "transfer_to_human",
            isActive: body.data.isActive ?? true,
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/private/mysmartcard/ai", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        toast({ title: "AI configuration saved successfully" });
      } else {
        toast({ title: "Failed to save configuration", variant: "destructive" });
      }
    } catch {
      toast({ title: "Failed to save configuration", variant: "destructive" });
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
          <h1 className="text-2xl font-bold tracking-tight">AI Agent Configuration</h1>
          <p className="text-muted-foreground">Configure your MySmartCard AI assistant.</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Save className="size-4 mr-2" />}
          Save Changes
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="size-5" />
              Agent Identity
            </CardTitle>
            <CardDescription>Basic agent configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Agent Name</Label>
              <Input
                value={config.agentName}
                onChange={(e) => setConfig({ ...config, agentName: e.target.value })}
                placeholder="MySmartCard Assistant"
              />
            </div>
            <div className="space-y-2">
              <Label>Personality</Label>
              <Input
                value={config.personality}
                onChange={(e) => setConfig({ ...config, personality: e.target.value })}
                placeholder="Friendly, Professional, Helpful"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Active</Label>
                <p className="text-xs text-muted-foreground">Enable or disable the AI agent</p>
              </div>
              <Switch
                checked={config.isActive}
                onCheckedChange={(checked) => setConfig({ ...config, isActive: checked })}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Model Configuration</CardTitle>
            <CardDescription>Configure the AI model settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Provider</Label>
              <Input
                value={config.modelProvider}
                onChange={(e) => setConfig({ ...config, modelProvider: e.target.value })}
                placeholder="openai"
              />
            </div>
            <div className="space-y-2">
              <Label>Model ID</Label>
              <Input
                value={config.modelId}
                onChange={(e) => setConfig({ ...config, modelId: e.target.value })}
                placeholder="gpt-4o-mini"
              />
            </div>
            <div className="space-y-2">
              <Label>Temperature ({config.temperature})</Label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={config.temperature}
                onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label>Max Response Length</Label>
              <Input
                type="number"
                value={config.maxResponseLength}
                onChange={(e) => setConfig({ ...config, maxResponseLength: parseInt(e.target.value) || 1024 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Fallback Behavior</Label>
              <select
                value={config.fallbackBehavior}
                onChange={(e) => setConfig({ ...config, fallbackBehavior: e.target.value })}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="transfer_to_human">Transfer to Human</option>
                <option value="send_generic_response">Send Generic Response</option>
                <option value="no_response">No Response</option>
              </select>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>System Instructions</CardTitle>
          <CardDescription>
            Define how the AI agent should behave. This is the system prompt used for all conversations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={config.systemInstructions}
            onChange={(e) => setConfig({ ...config, systemInstructions: e.target.value })}
            placeholder="You are the official MySmartCard WhatsApp assistant..."
            className="min-h-[300px] font-mono text-sm"
          />
        </CardContent>
      </Card>
    </div>
  );
}
