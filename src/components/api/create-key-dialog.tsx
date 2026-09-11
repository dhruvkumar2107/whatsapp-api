"use client";

import * as React from "react";
import { Copy, Loader2, Check, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import { PERMISSIONS } from "@/lib/constants";

const PERMISSION_OPTIONS = [
  { value: PERMISSIONS.MESSAGES_SEND, label: "Messages - Send", group: "Messages" },
  { value: PERMISSIONS.MESSAGES_VIEW, label: "Messages - View", group: "Messages" },
  { value: PERMISSIONS.CONTACTS_VIEW, label: "Contacts - View", group: "Contacts" },
  { value: PERMISSIONS.CONTACTS_CREATE, label: "Contacts - Create", group: "Contacts" },
  { value: PERMISSIONS.CONTACTS_EDIT, label: "Contacts - Edit", group: "Contacts" },
  { value: PERMISSIONS.CONTACTS_DELETE, label: "Contacts - Delete", group: "Contacts" },
  { value: PERMISSIONS.CAMPAIGNS_VIEW, label: "Campaigns - View", group: "Campaigns" },
  { value: PERMISSIONS.CAMPAIGNS_CREATE, label: "Campaigns - Create", group: "Campaigns" },
  { value: PERMISSIONS.TEMPLATES_VIEW, label: "Templates - View", group: "Templates" },
  { value: PERMISSIONS.WEBHOOKS_VIEW, label: "Webhooks - View", group: "Webhooks" },
];

interface CreateKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function CreateKeyDialog({ open, onOpenChange, onCreated }: CreateKeyDialogProps) {
  const [name, setName] = React.useState("");
  const [permissions, setPermissions] = React.useState<string[]>([]);
  const [expiresAt, setExpiresAt] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [createdKey, setCreatedKey] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  const reset = () => {
    setName("");
    setPermissions([]);
    setExpiresAt("");
    setCreatedKey(null);
    setCopied(false);
  };

  const handleOpenChange = (value: boolean) => {
    if (!value) reset();
    onOpenChange(value);
  };

  const togglePermission = (value: string) => {
    setPermissions((prev) =>
      prev.includes(value) ? prev.filter((p) => p !== value) : [...prev, value]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const body: Record<string, unknown> = { name, permissions };
      if (expiresAt) {
        body.expiresAt = new Date(expiresAt).toISOString();
      }

      const response = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast({
          variant: "destructive",
          title: "Could not create API key",
          description: result.error?.message ?? "Something went wrong",
        });
        return;
      }

      setCreatedKey(result.data.key);
      onCreated();
    } catch {
      toast({
        variant: "destructive",
        title: "Could not create API key",
        description: "An unexpected error occurred",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyKey = async () => {
    if (!createdKey) return;
    await navigator.clipboard.writeText(createdKey);
    setCopied(true);
    toast({ title: "API key copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };

  const grouped = PERMISSION_OPTIONS.reduce<Record<string, typeof PERMISSION_OPTIONS>>(
    (acc, opt) => {
      if (!acc[opt.group]) acc[opt.group] = [];
      acc[opt.group].push(opt);
      return acc;
    },
    {}
  );

  if (createdKey) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>API Key Created</DialogTitle>
            <DialogDescription>
              Copy your API key now. You will not be able to see it again.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-amber-500/50 bg-amber-500/5 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-500" />
              <p className="text-sm text-amber-600 dark:text-amber-400">
                This is the only time your full API key will be displayed. Store it
                securely. If you lose it, you will need to create a new key.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Input
              readOnly
              value={createdKey}
              className="font-mono text-xs"
            />
            <Button type="button" size="icon" variant="outline" onClick={copyKey}>
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            </Button>
          </div>
          <DialogFooter>
            <Button type="button" onClick={() => handleOpenChange(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create API Key</DialogTitle>
          <DialogDescription>
            Generate a new API key to access the WhatsApp API programmatically.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="key-name">Name</Label>
            <Input
              id="key-name"
              placeholder="e.g. Production Backend"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              A descriptive name to identify this key.
            </p>
          </div>

          <div className="space-y-3">
            <Label>Permissions</Label>
            {Object.entries(grouped).map(([group, options]) => (
              <div key={group} className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {group}
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {options.map((opt) => (
                    <label
                      key={opt.value}
                      className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted/50 cursor-pointer"
                    >
                      <Checkbox
                        checked={permissions.includes(opt.value)}
                        onCheckedChange={() => togglePermission(opt.value)}
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="key-expires">Expiry Date (optional)</Label>
            <Input
              id="key-expires"
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
            />
            <p className="text-xs text-muted-foreground">
              Leave empty for a key that does not expire.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !name || permissions.length === 0}>
              {loading && <Loader2 className="size-4 animate-spin" />}
              Create Key
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
