"use client";

import * as React from "react";
import {
  Building2,
  Check,
  CircleUser,
  KeyRound,
  Loader2,
  Lock,
  Plus,
  Shield,
  Trash2,
  Users,
  Webhook as WebhookIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { cn, formatDate } from "@/lib/utils";

interface WorkspaceData {
  id: string;
  name: string;
  slug: string;
  timezone: string | null;
  locale: string | null;
}

interface UserData {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  image: string | null;
}

interface MemberUser {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  createdAt: string;
}

interface Member {
  id: string;
  role: string;
  createdAt: string;
  user: MemberUser;
}

interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { deliveries: number };
}

interface ApiKeyItem {
  id: string;
  name: string;
  keyPrefix: string;
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
}

interface SecurityData {
  twoFactorEnabled: boolean;
  sessions: { id: string; token: string; expires: string }[];
  apiKeys: ApiKeyItem[];
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

const WEBHOOK_EVENTS = [
  "message.received",
  "message.sent",
  "message.delivered",
  "message.read",
  "message.failed",
  "contact.created",
  "contact.updated",
  "campaign.completed",
  "campaign.failed",
];

const WEBHOOK_EVENT_LABELS: Record<string, string> = {
  "message.received": "Message received",
  "message.sent": "Message sent",
  "message.delivered": "Message delivered",
  "message.read": "Message read",
  "message.failed": "Message failed",
  "contact.created": "Contact created",
  "contact.updated": "Contact updated",
  "campaign.completed": "Campaign completed",
  "campaign.failed": "Campaign failed",
};

const ROLES = ["OWNER", "ADMIN", "MANAGER", "AGENT", "VIEWER"];

function getRoleBadgeVariant(role: string) {
  switch (role) {
    case "OWNER":
      return "default" as const;
    case "ADMIN":
      return "warning" as const;
    case "MANAGER":
      return "success" as const;
    case "AGENT":
      return "secondary" as const;
    default:
      return "outline" as const;
  }
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  const [tab, setTab] = React.useState("general");
  const [settingsLoading, setSettingsLoading] = React.useState(true);

  const [workspace, setWorkspace] = React.useState<WorkspaceData | null>(null);
  const [workspaceName, setWorkspaceName] = React.useState("");
  const [savingWorkspace, setSavingWorkspace] = React.useState(false);

  const [profile, setProfile] = React.useState<UserData | null>(null);
  const [profileName, setProfileName] = React.useState("");
  const [profilePhone, setProfilePhone] = React.useState("");
  const [savingProfile, setSavingProfile] = React.useState(false);

  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [savingPassword, setSavingPassword] = React.useState(false);

  const [members, setMembers] = React.useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = React.useState(true);
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [inviteEmail, setInviteEmail] = React.useState("");
  const [inviteName, setInviteName] = React.useState("");
  const [inviteRole, setInviteRole] = React.useState("AGENT");
  const [inviting, setInviting] = React.useState(false);
  const [updatingRoleId, setUpdatingRoleId] = React.useState<string | null>(null);
  const [removingMemberId, setRemovingMemberId] = React.useState<string | null>(null);

  const [webhooks, setWebhooks] = React.useState<Webhook[]>([]);
  const [webhooksLoading, setWebhooksLoading] = React.useState(true);
  const [webhookOpen, setWebhookOpen] = React.useState(false);
  const [webhookName, setWebhookName] = React.useState("");
  const [webhookUrl, setWebhookUrl] = React.useState("");
  const [webhookEvents, setWebhookEvents] = React.useState<string[]>([WEBHOOK_EVENTS[0]]);
  const [webhookSecret, setWebhookSecret] = React.useState("");
  const [creatingWebhook, setCreatingWebhook] = React.useState(false);
  const [togglingWebhookId, setTogglingWebhookId] = React.useState<string | null>(null);

  const [security, setSecurity] = React.useState<SecurityData | null>(null);
  const [securityLoading, setSecurityLoading] = React.useState(true);

  React.useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((body: ApiResponse<{ workspace: WorkspaceData; security: SecurityData }>) => {
        if (body.success) {
          setWorkspace(body.data.workspace);
          setWorkspaceName(body.data.workspace.name);
          setSecurity(body.data.security);
        }
      })
      .catch(() => {})
      .finally(() => {
        setSettingsLoading(false);
        setSecurityLoading(false);
      });

    fetch("/api/settings/profile")
      .then((r) => r.json())
      .then((body: ApiResponse<{ user: UserData }>) => {
        if (body.success) {
          setProfile(body.data.user);
          setProfileName(body.data.user.name ?? "");
          setProfilePhone(body.data.user.phone ?? "");
        }
      })
      .catch(() => {});

    fetch("/api/settings/members")
      .then((r) => r.json())
      .then((body: ApiResponse<Member[]>) => {
        if (body.success) setMembers(body.data);
      })
      .catch(() => {})
      .finally(() => setMembersLoading(false));

    fetch("/api/webhooks")
      .then((r) => r.json())
      .then((body: ApiResponse<Webhook[]>) => {
        if (body.success) setWebhooks(body.data);
      })
      .catch(() => {})
      .finally(() => setWebhooksLoading(false));
  }, []);

  const saveWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingWorkspace(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceName }),
      });
      const body = (await res.json()) as ApiResponse<{ workspace: WorkspaceData }> & {
        error?: { message?: string };
      };
      if (body.success) {
        setWorkspace(body.data.workspace);
        toast({ title: "Workspace updated" });
      } else {
        toast({ title: "Failed to update workspace", description: body.error?.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Something went wrong", variant: "destructive" });
    } finally {
      setSavingWorkspace(false);
    }
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await fetch("/api/settings/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: profileName, phone: profilePhone }),
      });
      const body = (await res.json()) as ApiResponse<{ user: UserData }> & {
        error?: { message?: string };
      };
      if (body.success) {
        setProfile(body.data.user);
        toast({ title: "Profile updated" });
      } else {
        toast({ title: "Failed to update profile", description: body.error?.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Something went wrong", variant: "destructive" });
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    setSavingPassword(true);
    try {
      const res = await fetch("/api/settings/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const body = (await res.json()) as ApiResponse<{ message: string }> & {
        error?: { message?: string };
      };
      if (body.success) {
        toast({ title: body.data.message });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        toast({ title: "Failed to change password", description: body.error?.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Something went wrong", variant: "destructive" });
    } finally {
      setSavingPassword(false);
    }
  };

  const inviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    try {
      const res = await fetch("/api/settings/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail,
          name: inviteName || undefined,
          role: inviteRole,
        }),
      });
      const body = (await res.json()) as ApiResponse<Member> & { error?: { message?: string } };
      if (body.success) {
        toast({ title: "Member added" });
        setInviteOpen(false);
        setInviteEmail("");
        setInviteName("");
        setInviteRole("AGENT");
        const listRes = await fetch("/api/settings/members");
        const listBody = (await listRes.json()) as ApiResponse<Member[]>;
        if (listBody.success) setMembers(listBody.data);
      } else {
        toast({ title: "Failed to add member", description: body.error?.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Something went wrong", variant: "destructive" });
    } finally {
      setInviting(false);
    }
  };

  const updateRole = async (member: Member, role: string) => {
    setUpdatingRoleId(member.id);
    try {
      const res = await fetch(`/api/settings/members/${member.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const body = (await res.json()) as ApiResponse<Member> & { error?: { message?: string } };
      if (body.success) {
        toast({ title: "Role updated" });
        setMembers((prev) => prev.map((m) => (m.id === member.id ? body.data : m)));
      } else {
        toast({ title: "Failed to update role", description: body.error?.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Something went wrong", variant: "destructive" });
    } finally {
      setUpdatingRoleId(null);
    }
  };

  const removeMember = async (member: Member) => {
    setRemovingMemberId(member.id);
    try {
      const res = await fetch(`/api/settings/members/${member.id}`, { method: "DELETE" });
      const body = (await res.json()) as ApiResponse<{ message: string }> & {
        error?: { message?: string };
      };
      if (body.success) {
        toast({ title: body.data.message });
        setMembers((prev) => prev.filter((m) => m.id !== member.id));
      } else {
        toast({ title: "Failed to remove member", description: body.error?.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Something went wrong", variant: "destructive" });
    } finally {
      setRemovingMemberId(null);
    }
  };

  const toggleWebhookEvent = (event: string) => {
    setWebhookEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  };

  const createWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingWebhook(true);
    try {
      const res = await fetch("/api/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: webhookName,
          url: webhookUrl,
          events: webhookEvents,
          secret: webhookSecret || undefined,
        }),
      });
      const body = (await res.json()) as ApiResponse<Webhook> & { error?: { message?: string } };
      if (body.success) {
        toast({ title: "Webhook created" });
        setWebhookOpen(false);
        setWebhookName("");
        setWebhookUrl("");
        setWebhookEvents([WEBHOOK_EVENTS[0]]);
        setWebhookSecret("");
        const listRes = await fetch("/api/webhooks");
        const listBody = (await listRes.json()) as ApiResponse<Webhook[]>;
        if (listBody.success) setWebhooks(listBody.data);
      } else {
        toast({ title: "Failed to create webhook", description: body.error?.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Something went wrong", variant: "destructive" });
    } finally {
      setCreatingWebhook(false);
    }
  };

  const toggleWebhook = async (webhook: Webhook) => {
    setTogglingWebhookId(webhook.id);
    try {
      const res = await fetch(`/api/webhooks/${webhook.id}/toggle`, { method: "POST" });
      const body = (await res.json()) as ApiResponse<{ id: string; isActive: boolean }>;
      if (body.success) {
        setWebhooks((prev) =>
          prev.map((w) => (w.id === webhook.id ? { ...w, isActive: body.data.isActive } : w))
        );
      }
    } catch {
      toast({ title: "Failed to toggle webhook", variant: "destructive" });
    } finally {
      setTogglingWebhookId(null);
    }
  };

  const initial = settingsLoading ? (
    <div className="grid max-w-4xl gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-44 w-full" />
      ))}
    </div>
  ) : (
    <TabsContent value="general" className="mt-0">
      <div className="grid max-w-4xl gap-6">
        <Section
          title="Workspace Name"
          description="This is the name that will be displayed in your workspace."
        >
          <form onSubmit={saveWorkspace} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="workspace-name">Workspace name</Label>
              <Input
                id="workspace-name"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                required
                minLength={2}
                maxLength={100}
              />
            </div>
            {workspace && (
              <p className="text-xs text-zinc-500">
                Slug: <span className="font-mono">{workspace.slug}</span>
              </p>
            )}
            <Button type="submit" size="sm" disabled={savingWorkspace || !workspaceName.trim()}>
              {savingWorkspace && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </form>
        </Section>

        <Section title="General Information" description="Timezone and locale preferences.">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Timezone</Label>
              <Input value={workspace?.timezone ?? "UTC"} readOnly className="bg-muted/40" />
            </div>
            <div className="space-y-2">
              <Label>Locale</Label>
              <Input value={workspace?.locale ?? "en"} readOnly className="bg-muted/40" />
            </div>
          </div>
          <p className="mt-3 text-xs text-zinc-500">
            Timezone and locale settings will be configurable in a future release.
          </p>
        </Section>
      </div>
    </TabsContent>
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Manage your workspace, profile, team, webhooks, and security.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex h-auto flex-wrap justify-start">
          <TabsTrigger value="general">
            <Building2 className="mr-1.5 h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="profile">
            <CircleUser className="mr-1.5 h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="team">
            <Users className="mr-1.5 h-4 w-4" />
            Team
          </TabsTrigger>
          <TabsTrigger value="webhooks">
            <WebhookIcon className="mr-1.5 h-4 w-4" />
            Webhooks
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="mr-1.5 h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Check className="mr-1.5 h-4 w-4" />
            Notifications
          </TabsTrigger>
        </TabsList>

        {initial}

        <TabsContent value="profile" className="mt-0">
          <div className="grid max-w-4xl gap-6">
            <Section
              title="Profile"
              description="Your personal information as it appears across the platform."
            >
              <form onSubmit={saveProfile} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="profile-name">Name</Label>
                    <Input
                      id="profile-name"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      required
                      maxLength={100}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profile-email">Email</Label>
                    <Input id="profile-email" value={profile?.email ?? ""} readOnly className="bg-muted/40" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profile-phone">Phone</Label>
                  <Input
                    id="profile-phone"
                    placeholder="+12025550134"
                    value={profilePhone}
                    onChange={(e) => setProfilePhone(e.target.value)}
                  />
                  <p className="text-xs text-zinc-500">Include your country code.</p>
                </div>
                <Button type="submit" size="sm" disabled={savingProfile || !profileName.trim()}>
                  {savingProfile && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                  Save Profile
                </Button>
              </form>
            </Section>

            <Section title="Change Password" description="Update the password for your account.">
              <form onSubmit={savePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Current password</Label>
                  <Input
                    id="current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={8}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm new password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <p className="text-xs text-zinc-500">Must be at least 8 characters.</p>
                <Button
                  type="submit"
                  size="sm"
                  disabled={savingPassword || !currentPassword || newPassword.length < 8}
                >
                  {savingPassword && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                  Change Password
                </Button>
              </form>
            </Section>
          </div>
        </TabsContent>

        <TabsContent value="team" className="mt-0">
          <div className="grid max-w-4xl gap-6">
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-base">Team Members</CardTitle>
                  <CardDescription>Manage who has access to this workspace.</CardDescription>
                </div>
                <Button size="sm" onClick={() => setInviteOpen(true)}>
                  <Plus className="mr-1.5 h-4 w-4" />
                  Invite Member
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {membersLoading ? (
                  <div className="space-y-3 p-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : members.length === 0 ? (
                  <div className="p-8 text-center text-sm text-zinc-500">
                    No members yet. Invite your team to get started.
                  </div>
                ) : (
                  <div className="divide-y">
                    {members.map((member) => (
                      <div
                        key={member.id}
                        className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <Avatar className="size-9">
                            <AvatarImage src={member.user.image ?? undefined} alt={member.user.name ?? ""} />
                            <AvatarFallback>
                              {(member.user.name || member.user.email)[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {member.user.name || member.user.email}
                            </p>
                            <p className="truncate text-xs text-zinc-500">{member.user.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={getRoleBadgeVariant(member.role)}>{member.role}</Badge>
                          <Select
                            value={member.role}
                            onValueChange={(role) => updateRole(member, role)}
                            disabled={updatingRoleId === member.id}
                          >
                            <SelectTrigger className="h-8 w-32 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ROLES.map((role) => (
                                <SelectItem key={role} value={role}>
                                  {role}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            disabled={removingMemberId === member.id}
                            onClick={() => removeMember(member)}
                            aria-label={`Remove ${member.user.name || member.user.email}`}
                          >
                            {removingMemberId === member.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4 text-destructive" />
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="webhooks" className="mt-0">
          <div className="grid max-w-4xl gap-6">
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-base">Webhooks</CardTitle>
                  <CardDescription>
                    Receive real-time events from your workspace to your own endpoint.
                  </CardDescription>
                </div>
                <Button size="sm" onClick={() => setWebhookOpen(true)}>
                  <Plus className="mr-1.5 h-4 w-4" />
                  Create Webhook
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {webhooksLoading ? (
                  <div className="space-y-3 p-4">
                    {Array.from({ length: 2 }).map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : webhooks.length === 0 ? (
                  <div className="p-8 text-center">
                    <WebhookIcon className="mx-auto size-6 text-zinc-400" />
                    <p className="mt-2 text-sm font-medium">No webhooks configured</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      Create a webhook to send workspace events to your application.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {webhooks.map((webhook) => (
                      <div
                        key={webhook.id}
                        className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{webhook.name}</p>
                            <Badge variant={webhook.isActive ? "success" : "secondary"}>
                              {webhook.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          <p className="mt-0.5 truncate text-xs text-zinc-500">{webhook.url}</p>
                          <p className="mt-0.5 truncate text-xs text-zinc-500">
                            {webhook.events.length} events ·{" "}
                            {webhook._count?.deliveries ?? 0} deliveries · created{" "}
                            {formatDate(webhook.createdAt)}
                          </p>
                        </div>
                        <Switch
                          checked={webhook.isActive}
                          disabled={togglingWebhookId === webhook.id}
                          onCheckedChange={() => toggleWebhook(webhook)}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="security" className="mt-0">
          <div className="grid max-w-4xl gap-6">
            <Section title="Two-Factor Authentication" description="Add an extra layer of security.">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800">
                    <Lock className="size-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {security?.twoFactorEnabled ? "Enabled" : "Not enabled"}
                    </p>
                    <p className="text-xs text-zinc-500">
                      Use an authenticator app to secure your account.
                    </p>
                  </div>
                </div>
                <Switch checked={security?.twoFactorEnabled ?? false} disabled />
              </div>
            </Section>

            <Section title="API Access" description="API keys and active sessions for your workspace.">
              {securityLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <p className="mb-2 text-sm font-medium">API Keys</p>
                    {!security?.apiKeys.length ? (
                      <p className="text-sm text-zinc-500">
                        No API keys. Create one from the API page.
                      </p>
                    ) : (
                      <div className="divide-y rounded-lg border">
                        {security.apiKeys.map((key) => (
                          <div
                            key={key.id}
                            className="flex items-center justify-between gap-3 p-3"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">{key.name}</p>
                              <p className="font-mono text-xs text-zinc-500">
                                {key.keyPrefix}****
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={key.isActive ? "success" : "secondary"}>
                                {key.isActive ? "Active" : "Revoked"}
                              </Badge>
                              <span className="text-xs text-zinc-500">
                                {key.lastUsedAt ? `Last used ${formatDate(key.lastUsedAt)}` : "Never used"}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="mb-2 text-sm font-medium">Active Sessions</p>
                    {!security?.sessions.length ? (
                      <p className="text-sm text-zinc-500">No active sessions found.</p>
                    ) : (
                      <div className="divide-y rounded-lg border">
                        {security.sessions.map((session) => (
                          <div key={session.id} className="flex items-center justify-between p-3">
                            <div>
                              <p className="font-mono text-xs">{session.token}</p>
                              <p className="text-xs text-zinc-500">
                                Expires {formatDate(session.expires)}
                              </p>
                            </div>
                            <KeyRound className="size-4 text-zinc-400" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Section>
          </div>
        </TabsContent>

        <TabsContent value="notifications" className="mt-0">
          <div className="grid max-w-4xl gap-6">
            <Section
              title="Notifications"
              description="Notification preferences are coming soon."
            >
              <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-10 text-center">
                <Check className="size-6 text-zinc-400" />
                <p className="text-sm font-medium">Notification preferences</p>
                <p className="max-w-sm text-xs text-zinc-500">
                  You will soon be able to configure email and in-app notifications for
                  campaigns, message failures, and other workspace events.
                </p>
              </div>
            </Section>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              Add a member to your workspace. If the user does not exist yet, an account will be
              created for them.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={inviteMember} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="teammate@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-name">Name (optional)</Label>
              <Input
                id="invite-name"
                placeholder="Jane Doe"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-role">Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger id="invite-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={inviting || !inviteEmail.trim()}>
                {inviting && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                Add Member
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={webhookOpen} onOpenChange={setWebhookOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Webhook</DialogTitle>
            <DialogDescription>
              Configure an endpoint to receive workspace events.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={createWebhook} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="webhook-name">Name</Label>
              <Input
                id="webhook-name"
                placeholder="My webhook"
                value={webhookName}
                onChange={(e) => setWebhookName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="webhook-url">Endpoint URL</Label>
              <Input
                id="webhook-url"
                type="url"
                placeholder="https://example.com/hooks/whatsapp"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="webhook-secret">Secret (optional)</Label>
              <Input
                id="webhook-secret"
                placeholder="A secret sent as X-Webhook-Secret header"
                value={webhookSecret}
                onChange={(e) => setWebhookSecret(e.target.value)}
                maxLength={256}
              />
            </div>
            <div className="space-y-2">
              <Label>Events</Label>
              <div className="grid grid-cols-2 gap-2 rounded-lg border p-3">
                {WEBHOOK_EVENTS.map((event) => (
                  <label
                    key={event}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs",
                      webhookEvents.includes(event) && "bg-muted"
                    )}
                  >
                    <Checkbox
                      checked={webhookEvents.includes(event)}
                      onCheckedChange={() => toggleWebhookEvent(event)}
                    />
                    {WEBHOOK_EVENT_LABELS[event]}
                  </label>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setWebhookOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={creatingWebhook || !webhookName.trim() || !webhookUrl.trim() || webhookEvents.length === 0}
              >
                {creatingWebhook && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                Create Webhook
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}