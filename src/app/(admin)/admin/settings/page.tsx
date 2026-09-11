"use client";

import * as React from "react";
import { Save } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/toast";

interface Settings {
  platformName: string;
  supportEmail: string;
  timezone: string;
  maintenanceMode: boolean;
  registrationOpen: boolean;
  whatsappAppId: string;
  dashboardRateLimit: string;
  webhookTimeout: string;
  emailFrom: string;
  emailEnabled: boolean;
  emailDailyDigest: boolean;
  featureInbox: boolean;
  featureCampaigns: boolean;
  featureChatbot: boolean;
  featureAutomation: boolean;
  featureTemplates: boolean;
  featureApiKeys: boolean;
}

const defaultSettings: Settings = {
  platformName: "WHAATOPRO",
  supportEmail: "support@whaatopro.com",
  timezone: "UTC",
  maintenanceMode: false,
  registrationOpen: true,
  whatsappAppId: "",
  dashboardRateLimit: "60",
  webhookTimeout: "15000",
  emailFrom: "no-reply@whaatopro.com",
  emailEnabled: true,
  emailDailyDigest: true,
  featureInbox: true,
  featureCampaigns: true,
  featureChatbot: true,
  featureAutomation: true,
  featureTemplates: true,
  featureApiKeys: true,
};

const STORAGE_KEY = "whaatopro-admin-settings";

export default function AdminSettingsPage() {
  const [settings, setSettings] = React.useState<Settings>(defaultSettings);
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setSettings({ ...defaultSettings, ...JSON.parse(raw) });
      }
    } catch {
      // ignore corrupt storage
    }
    setLoaded(true);
  }, []);

  React.useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // ignore quota errors
    }
  }, [settings, loaded]);

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((s) => ({ ...s, [key]: value }));
  }

  function handleSave() {
    toast({ title: "Settings saved", description: "Platform settings have been updated." });
  }

  if (!loaded) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage platform-wide configuration.
          </p>
        </div>
        <Button onClick={handleSave}>
          <Save className="size-4" /> Save Changes
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">General</CardTitle>
            <CardDescription>Basic platform settings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>Platform Name</Label>
              <Input
                value={settings.platformName}
                onChange={(e) => update("platformName", e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Support Email</Label>
              <Input
                value={settings.supportEmail}
                onChange={(e) => update("supportEmail", e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Timezone</Label>
              <Select
                value={settings.timezone}
                onValueChange={(v) => update("timezone", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UTC">UTC</SelectItem>
                  <SelectItem value="America/New_York">America/New_York</SelectItem>
                  <SelectItem value="America/Chicago">America/Chicago</SelectItem>
                  <SelectItem value="America/Denver">America/Denver</SelectItem>
                  <SelectItem value="America/Los_Angeles">America/Los_Angeles</SelectItem>
                  <SelectItem value="Europe/London">Europe/London</SelectItem>
                  <SelectItem value="Europe/Paris">Europe/Paris</SelectItem>
                  <SelectItem value="Asia/Kolkata">Asia/Kolkata</SelectItem>
                  <SelectItem value="Asia/Dubai">Asia/Dubai</SelectItem>
                  <SelectItem value="Asia/Singapore">Asia/Singapore</SelectItem>
                  <SelectItem value="Australia/Sydney">Australia/Sydney</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Separator />
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Maintenance Mode</p>
                <p className="text-xs text-muted-foreground">
                  Temporarily disable customer access.
                </p>
              </div>
              <Switch
                checked={settings.maintenanceMode}
                onCheckedChange={(v) => update("maintenanceMode", v)}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Registration Open</p>
                <p className="text-xs text-muted-foreground">
                  Allow new customer sign-ups.
                </p>
              </div>
              <Switch
                checked={settings.registrationOpen}
                onCheckedChange={(v) => update("registrationOpen", v)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Platform Configuration</CardTitle>
            <CardDescription>Integration and infrastructure settings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>WhatsApp App ID</Label>
              <Input
                value={settings.whatsappAppId}
                onChange={(e) => update("whatsappAppId", e.target.value)}
                placeholder="Meta app ID"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Dashboard Rate Limit (req/min)</Label>
                <Input
                  type="number"
                  value={settings.dashboardRateLimit}
                  onChange={(e) => update("dashboardRateLimit", e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>Webhook Timeout (ms)</Label>
                <Input
                  type="number"
                  value={settings.webhookTimeout}
                  onChange={(e) => update("webhookTimeout", e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Email Settings</CardTitle>
            <CardDescription>Outbound email configuration.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>From Address</Label>
              <Input
                value={settings.emailFrom}
                onChange={(e) => update("emailFrom", e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Email Notifications</p>
                <p className="text-xs text-muted-foreground">
                  Send transactional emails.
                </p>
              </div>
              <Switch
                checked={settings.emailEnabled}
                onCheckedChange={(v) => update("emailEnabled", v)}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Daily Digest</p>
                <p className="text-xs text-muted-foreground">
                  Send usage digests to admins.
                </p>
              </div>
              <Switch
                checked={settings.emailDailyDigest}
                onCheckedChange={(v) => update("emailDailyDigest", v)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Feature Flags</CardTitle>
            <CardDescription>Enable or disable platform features.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(
              [
                ["featureInbox", "Inbox"],
                ["featureCampaigns", "Campaigns"],
                ["featureChatbot", "Chatbot Builder"],
                ["featureAutomation", "Automation"],
                ["featureTemplates", "Message Templates"],
                ["featureApiKeys", "REST API & API Keys"],
              ] as Array<[keyof Settings, string]>
            ).map(([key, label]) => (
              <div key={key} className="flex items-center justify-between rounded-lg border p-3">
                <p className="text-sm font-medium">{label}</p>
                <Switch
                  checked={settings[key] as boolean}
                  onCheckedChange={(v) => update(key, v as Settings[keyof Settings])}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}