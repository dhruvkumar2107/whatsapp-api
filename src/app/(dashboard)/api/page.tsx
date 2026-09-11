"use client";

import * as React from "react";
import {
  Key,
  Loader2,
  Plus,
  Trash2,
  BookOpen,
  Copy,
  Check,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/use-toast";
import { CreateKeyDialog } from "@/components/api/create-key-dialog";
import { ApiDocs } from "@/components/api/api-docs";
import { formatDate, formatRelativeTime } from "@/lib/utils";

interface ApiKeyItem {
  id: string;
  name: string;
  key: string;
  keyPrefix: string;
  permissions: string[];
  lastUsedAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
}

function maskKey(keyPrefix: string): string {
  return `${keyPrefix}****`;
}

export default function ApiManagementPage() {
  const [keys, setKeys] = React.useState<ApiKeyItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [revokeTarget, setRevokeTarget] = React.useState<ApiKeyItem | null>(null);
  const [revoking, setRevoking] = React.useState(false);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const fetchKeys = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/api-keys");
      const body = await response.json();
      if (!response.ok || !body.success) {
        setError(body.error?.message ?? "Could not load API keys");
        setKeys([]);
        return;
      }
      setKeys(body.data);
    } catch {
      setError("Could not load API keys");
      setKeys([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    setRevoking(true);
    try {
      const response = await fetch(`/api/api-keys/${revokeTarget.id}`, {
        method: "DELETE",
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        toast({
          variant: "destructive",
          title: "Could not revoke API key",
          description: result.error?.message ?? "Something went wrong",
        });
        return;
      }

      toast({ title: "API key revoked" });
      setRevokeTarget(null);
      fetchKeys();
    } catch {
      toast({
        variant: "destructive",
        title: "Could not revoke API key",
        description: "An unexpected error occurred",
      });
    } finally {
      setRevoking(false);
    }
  };

  const copyPrefix = async (key: ApiKeyItem) => {
    await navigator.clipboard.writeText(maskKey(key.keyPrefix));
    setCopiedId(key.id);
    toast({ title: "Key prefix copied" });
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">API</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage API keys and review integration documentation.
          </p>
        </div>
      </div>

      <Tabs defaultValue="keys">
        <TabsList>
          <TabsTrigger value="keys" className="gap-2">
            <Key className="size-4" />
            API Keys
          </TabsTrigger>
          <TabsTrigger value="docs" className="gap-2">
            <BookOpen className="size-4" />
            API Docs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="keys" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>API Keys</CardTitle>
                <CardDescription>
                  Keys are used to authenticate requests to the public API.
                </CardDescription>
              </div>
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="size-4" />
                Create API Key
              </Button>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full rounded-lg" />
                  ))}
                </div>
              ) : keys.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
                  <Key className="size-10 text-muted-foreground/40" />
                  <p className="mt-3 text-sm text-muted-foreground">
                    No API keys yet. Create one to get started.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Key</TableHead>
                        <TableHead>Permissions</TableHead>
                        <TableHead className="hidden md:table-cell">Last Used</TableHead>
                        <TableHead className="hidden md:table-cell">Created</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {keys.map((k) => (
                        <TableRow key={k.id}>
                          <TableCell className="font-medium">{k.name}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
                                {maskKey(k.keyPrefix)}
                              </code>
                              <button
                                type="button"
                                onClick={() => copyPrefix(k)}
                                className="text-muted-foreground hover:text-foreground"
                              >
                                {copiedId === k.id ? (
                                  <Check className="size-3.5" />
                                ) : (
                                  <Copy className="size-3.5" />
                                )}
                              </button>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {k.permissions.length === 0 ? (
                                <span className="text-xs text-muted-foreground">None</span>
                              ) : (
                                k.permissions.slice(0, 3).map((p) => (
                                  <Badge key={p} variant="secondary" className="text-[10px]">
                                    {p}
                                  </Badge>
                                ))
                              )}
                              {k.permissions.length > 3 && (
                                <Badge variant="secondary" className="text-[10px]">
                                  +{k.permissions.length - 3}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                            {k.lastUsedAt ? formatRelativeTime(k.lastUsedAt) : "Never"}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                            {formatDate(k.createdAt)}
                          </TableCell>
                          <TableCell>
                            {k.isActive ? (
                              <Badge variant="success" className="text-[10px]">Active</Badge>
                            ) : (
                              <Badge variant="destructive" className="text-[10px]">Revoked</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {k.isActive && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 text-destructive hover:text-destructive"
                                onClick={() => setRevokeTarget(k)}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="docs" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <ApiDocs />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <CreateKeyDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={fetchKeys}
      />

      <Dialog
        open={revokeTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRevokeTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Revoke API key?</DialogTitle>
            <DialogDescription>
              This will immediately disable{" "}
              <strong>{revokeTarget?.name}</strong>. Any applications using this key
              will stop working.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRevokeTarget(null)}
              disabled={revoking}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRevoke}
              disabled={revoking}
            >
              {revoking && <Loader2 className="size-4 animate-spin" />}
              Revoke
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
