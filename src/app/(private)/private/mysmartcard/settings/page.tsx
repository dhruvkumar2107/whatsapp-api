"use client";

import * as React from "react";
import { Settings, Save, Loader2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";

interface SettingsData {
  workspace: {
    businessName: string;
    website: string;
    contactEmail: string;
    contactPhone: string;
    address: string;
    supportHours: string;
  } | null;
}

export default function MySmartCardSettingsPage() {
  const [settings, setSettings] = React.useState<SettingsData>({
    workspace: {
      businessName: "MySmartCard",
      website: "",
      contactEmail: "",
      contactPhone: "",
      address: "",
      supportHours: "",
    },
  });
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    fetch("/api/private/mysmartcard/settings")
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (body?.data) {
          setSettings({
            workspace: body.data.workspace || settings.workspace,
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/private/mysmartcard/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspace: settings.workspace }),
      });
      if (res.ok) {
        toast({ title: "Settings saved" });
      } else {
        toast({ title: "Failed to save settings", variant: "destructive" });
      }
    } catch {
      toast({ title: "Failed to save settings", variant: "destructive" });
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
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">MySmartCard business and system settings.</p>
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
              <Settings className="size-5" />
              Business Information
            </CardTitle>
            <CardDescription>Basic business details for MySmartCard</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Business Name</Label>
              <Input
                value={settings.workspace?.businessName || ""}
                onChange={(e) => setSettings({
                  ...settings,
                  workspace: { ...settings.workspace!, businessName: e.target.value },
                })}
              />
            </div>
            <div className="space-y-2">
              <Label>Website</Label>
              <Input
                value={settings.workspace?.website || ""}
                onChange={(e) => setSettings({
                  ...settings,
                  workspace: { ...settings.workspace!, website: e.target.value },
                })}
                placeholder="https://mysmartcard.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Contact Email</Label>
              <Input
                type="email"
                value={settings.workspace?.contactEmail || ""}
                onChange={(e) => setSettings({
                  ...settings,
                  workspace: { ...settings.workspace!, contactEmail: e.target.value },
                })}
                placeholder="support@mysmartcard.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Contact Phone</Label>
              <Input
                value={settings.workspace?.contactPhone || ""}
                onChange={(e) => setSettings({
                  ...settings,
                  workspace: { ...settings.workspace!, contactPhone: e.target.value },
                })}
                placeholder="+1 234 567 890"
              />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input
                value={settings.workspace?.address || ""}
                onChange={(e) => setSettings({
                  ...settings,
                  workspace: { ...settings.workspace!, address: e.target.value },
                })}
                placeholder="Business address"
              />
            </div>
            <div className="space-y-2">
              <Label>Support Hours</Label>
              <Input
                value={settings.workspace?.supportHours || ""}
                onChange={(e) => setSettings({
                  ...settings,
                  workspace: { ...settings.workspace!, supportHours: e.target.value },
                })}
                placeholder="Mon-Fri 9AM-6PM"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>WhatsApp Connection</CardTitle>
            <CardDescription>WhatsApp Business API configuration</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="py-6 text-center text-sm text-muted-foreground">
              <p>WhatsApp connection is managed through the main WHAATOPRO dashboard.</p>
              <Button variant="outline" className="mt-4" asChild>
                <a href="/whatsapp">Go to WhatsApp Settings</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
