"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Activity,
  ChevronLeft,
  Globe,
  Loader2,
  Mail,
  MapPin,
  MessageSquare,
  Pencil,
  Phone,
  Plus,
  Save,
  StickyNote,
  Tag,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ContactForm,
  contactToFormDefaults,
  type ContactFormValues,
} from "@/components/contacts/contact-form";
import {
  ContactAvatar,
  ContactTags,
  OptInBadge,
} from "@/components/contacts/contact-table";
import type {
  ContactDetail,
  ContactTag,
  ConversationSummary,
  NoteItem,
  CustomField,
} from "@/components/contacts/types";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";

const CONVERSATION_STATUS: Record<string, "success" | "secondary" | "warning"> = {
  OPEN: "success",
  CLOSED: "secondary",
  PENDING: "warning",
};

interface ConversationStatusBadgeProps {
  status: string;
}

function ConversationStatusBadge({ status }: ConversationStatusBadgeProps) {
  return (
    <Badge variant={CONVERSATION_STATUS[status] ?? "secondary"}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </Badge>
  );
}

interface InfoItemProps {
  icon: typeof Phone;
  label: string;
  value: React.ReactNode;
}

function InfoItem({ icon: Icon, label, value }: InfoItemProps) {
  return (
    <div className="flex items-start gap-3 rounded-lg border p-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="truncate text-sm font-medium">{value}</div>
      </div>
    </div>
  );
}

export default function ContactDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const contactId = params?.id ?? "";

  const [contact, setContact] = React.useState<ContactDetail | null>(null);
  const [workspaceTags, setWorkspaceTags] = React.useState<ContactTag[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState("overview");

  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  const [newNote, setNewNote] = React.useState("");
  const [addingNote, setAddingNote] = React.useState(false);

  const [fieldKey, setFieldKey] = React.useState("");
  const [fieldValue, setFieldValue] = React.useState("");
  const [addingField, setAddingField] = React.useState(false);

  const fetchContact = React.useCallback(async () => {
    if (!contactId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/contacts/${contactId}`);
      const body: {
        success: boolean;
        data?: ContactDetail;
        error?: { message?: string };
      } = await response.json();

      if (!response.ok || !body.success || !body.data) {
        setError(body.error?.message ?? "Could not load contact");
        setContact(null);
        return;
      }

      setContact(body.data);
    } catch {
      setError("Could not load contact");
      setContact(null);
    } finally {
      setLoading(false);
    }
  }, [contactId]);

  const fetchTags = React.useCallback(async () => {
    try {
      const response = await fetch("/api/tags");
      const body: { success: boolean; data?: ContactTag[] } = await response.json();
      if (response.ok && body.success) setWorkspaceTags(body.data ?? []);
    } catch {
      // Non-critical
    }
  }, []);

  React.useEffect(() => {
    fetchContact();
    fetchTags();
  }, [fetchContact, fetchTags]);

  const refresh = () => {
    fetchContact();
    fetchTags();
  };

  const handleUpdate = async (values: ContactFormValues) => {
    const body = {
      name: values.name,
      phone: values.phone,
      email: values.email,
      country: values.country,
      source: values.source,
      optIn: values.optIn,
      tags: values.tags,
      customFields: Object.fromEntries(
        values.customFields
          .filter((field) => field.key.trim())
          .map((field) => [field.key.trim(), field.value])
      ),
      notes: values.notes,
    };

    const response = await fetch(`/api/contacts/${contactId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await response.json();

    if (!response.ok || !result.success) {
      toast({
        variant: "destructive",
        title: "Could not update contact",
        description: result.error?.message ?? "Something went wrong",
      });
      throw new Error(result.error?.message ?? "Update failed");
    }

    toast({ title: "Contact updated" });
    setEditOpen(false);
    refresh();
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const response = await fetch(`/api/contacts/${contactId}`, {
        method: "DELETE",
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        toast({
          variant: "destructive",
          title: "Could not delete contact",
          description: result.error?.message ?? "Something went wrong",
        });
        return;
      }

      toast({ title: "Contact deleted" });
      router.push("/contacts");
    } finally {
      setDeleting(false);
    }
  };

  const addTag = async (name: string) => {
    const response = await fetch(`/api/contacts/${contactId}/tags`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tagNames: [name] }),
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
      toast({
        variant: "destructive",
        title: "Could not add tag",
        description: result.error?.message ?? "Something went wrong",
      });
      return;
    }
    refresh();
  };

  const removeTag = async (tagId: string) => {
    const response = await fetch(`/api/contacts/${contactId}/tags`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tagIds: [tagId] }),
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
      toast({
        variant: "destructive",
        title: "Could not remove tag",
        description: result.error?.message ?? "Something went wrong",
      });
      return;
    }
    refresh();
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setAddingNote(true);
    try {
      const response = await fetch(`/api/contacts/${contactId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newNote.trim() }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        toast({
          variant: "destructive",
          title: "Could not add note",
          description: result.error?.message ?? "Something went wrong",
        });
        return;
      }

      setNewNote("");
      refresh();
    } finally {
      setAddingNote(false);
    }
  };

  const handleAddField = async () => {
    if (!fieldKey.trim()) return;
    if (!contact) return;

    setAddingField(true);
    try {
      const nextFields: Record<string, string> = {};
      for (const field of contact.customFields) {
        if (field.fieldName !== fieldKey.trim()) {
          nextFields[field.fieldName] = field.fieldValue;
        }
      }
      nextFields[fieldKey.trim()] = fieldValue.trim();

      const response = await fetch(`/api/contacts/${contactId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customFields: nextFields }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        toast({
          variant: "destructive",
          title: "Could not save custom field",
          description: result.error?.message ?? "Something went wrong",
        });
        return;
      }

      setFieldKey("");
      setFieldValue("");
      refresh();
    } finally {
      setAddingField(false);
    }
  };

  const handleRemoveField = async (field: CustomField) => {
    if (!contact) return;

    const nextFields: Record<string, string> = {};
    for (const existing of contact.customFields) {
      if (existing.fieldName !== field.fieldName) {
        nextFields[existing.fieldName] = existing.fieldValue;
      }
    }

    const response = await fetch(`/api/contacts/${contactId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customFields: nextFields }),
    });
    const result = await response.json();

    if (!response.ok || !result.success) {
      toast({
        variant: "destructive",
        title: "Could not remove custom field",
        description: result.error?.message ?? "Something went wrong",
      });
      return;
    }
    refresh();
  };

  if (loading) {
    return <DetailSkeleton />;
  }

  if (error || !contact) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
        <MessageSquare className="size-8 text-muted-foreground" />
        <div>
          <p className="font-semibold">Contact not found</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link href="/contacts">Back to contacts</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm" className="gap-1.5 -ml-2">
          <Link href="/contacts">
            <ChevronLeft className="size-4" />
            Contacts
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="size-4" />
            Edit
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-4" />
            Delete
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
          <ContactAvatar name={contact.name} className="size-14 text-lg" />
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
              {contact.name || "Unnamed contact"}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="font-mono">{contact.phone}</span>
              {contact.email && <span>{contact.email}</span>}
              {contact.country && <span>{contact.country}</span>}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <ContactTags tags={contact.tags} />
              <OptInBadge optIn={contact.optIn} />
              {contact.source && (
                <Badge variant="outline">{contact.source}</Badge>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/inbox?phone=${encodeURIComponent(contact.phone)}`}>
                <MessageSquare className="size-4" />
                Message
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start overflow-x-auto sm:w-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="notes">
            Notes
            {contact.notes.length > 0 && (
              <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold">
                {contact.notes.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="conversations">
            Conversations
            {contact.conversationCount > 0 && (
              <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold">
                {contact.conversationCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Contact information</CardTitle>
              <CardDescription>Details stored for this contact</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                <InfoItem icon={Phone} label="Phone" value={contact.phone} />
                <InfoItem icon={Mail} label="Email" value={contact.email || "—"} />
                <InfoItem
                  icon={Globe}
                  label="Country"
                  value={contact.country || "—"}
                />
                <InfoItem
                  icon={MapPin}
                  label="Source"
                  value={contact.source || "—"}
                />
                <InfoItem
                  icon={Users}
                  label="Conversations"
                  value={String(contact.conversationCount)}
                />
                <InfoItem
                  icon={MessageSquare}
                  label="Last message"
                  value={
                    contact.lastMessageAt
                      ? formatRelativeTime(contact.lastMessageAt)
                      : "Never"
                  }
                />
                <InfoItem
                  icon={Activity}
                  label="Created"
                  value={formatDate(contact.createdAt)}
                />
                <InfoItem icon={Tag} label="Opt-in" value={<OptInBadge optIn={contact.optIn} />} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Custom fields</CardTitle>
                <CardDescription>Extra information about this contact</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {contact.customFields.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No custom fields yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {contact.customFields.map((field) => (
                    <div
                      key={field.id}
                      className="flex items-center justify-between gap-2 rounded-md border px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-muted-foreground">
                          {field.fieldName}
                        </p>
                        <p className="truncate text-sm">{field.fieldValue}</p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemoveField(field)}
                        aria-label={`Remove ${field.fieldName}`}
                      >
                        <X className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2 border-t pt-3">
                <div className="flex gap-2">
                  <Input
                    value={fieldKey}
                    onChange={(event) => setFieldKey(event.target.value)}
                    placeholder="Field name"
                    className="flex-1"
                  />
                </div>
                <div className="flex gap-2">
                  <Input
                    value={fieldValue}
                    onChange={(event) => setFieldValue(event.target.value)}
                    placeholder="Value"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddField}
                    disabled={addingField || !fieldKey.trim()}
                  >
                    {addingField ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Save className="size-4" />
                    )}
                    Save
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-3">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle>Tags</CardTitle>
                  <CardDescription>
                    Organize contacts by topic or list
                  </CardDescription>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="outline" size="sm">
                      <Plus className="size-4" />
                      Add tags
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>All workspace tags</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {workspaceTags.length === 0 && (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        No tags in this workspace yet.
                      </div>
                    )}
                    {workspaceTags.map((tag) => {
                      const present = contact.tags.some((t) => t.id === tag.id);
                      return (
                        <DropdownMenuCheckboxItem
                          key={tag.id}
                          checked={present}
                          onCheckedChange={() => {
                            if (present) removeTag(tag.id);
                            else addTag(tag.name);
                          }}
                        >
                          {tag.name}
                        </DropdownMenuCheckboxItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent>
              {contact.tags.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No tags assigned yet.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {contact.tags.map((tag) => (
                    <Badge key={tag.id} variant="secondary" className="gap-1.5 pr-1">
                      <span
                        className="size-1.5 rounded-full"
                        style={{ backgroundColor: tag.color || "#64748b" }}
                      />
                      {tag.name}
                      <button
                        type="button"
                        onClick={() => removeTag(tag.id)}
                        className="rounded-sm p-0.5 text-muted-foreground hover:bg-accent hover:text-destructive"
                        aria-label={`Remove tag ${tag.name}`}
                      >
                        <X className="size-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes" className="mt-4 space-y-4">
          <Card>
            <CardContent className="space-y-3 p-4 sm:p-5">
              <Textarea
                value={newNote}
                onChange={(event) => setNewNote(event.target.value)}
                placeholder="Write a note about this contact..."
                rows={3}
              />
              <div className="flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddNote}
                  disabled={addingNote || !newNote.trim()}
                >
                  {addingNote && <Loader2 className="size-4 animate-spin" />}
                  Add note
                </Button>
              </div>
            </CardContent>
          </Card>

          {contact.notes.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
                <StickyNote className="size-6 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No notes yet. Add internal notes about this contact.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {contact.notes.map((note) => (
                <NoteItemCard key={note.id} note={note} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="conversations" className="mt-4 space-y-3">
          {contact.conversations.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
                <MessageSquare className="size-6 text-muted-foreground" />
                <p className="text-sm font-medium">No conversations yet</p>
                <p className="text-sm text-muted-foreground">
                  Conversations with this contact will appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            contact.conversations.map((conversation) => (
              <ConversationItemCard
                key={conversation.id}
                conversation={conversation}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <ActivityTimeline
            contactCreatedAt={contact.createdAt}
            contactUpdatedAt={contact.updatedAt}
            notes={contact.notes}
            conversations={contact.conversations}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit contact</DialogTitle>
            <DialogDescription>
              Update the details for {contact.name || "this contact"}.
            </DialogDescription>
          </DialogHeader>
          <ContactForm
            defaultValues={contactToFormDefaults(contact)}
            availableTags={workspaceTags}
            onSubmit={handleUpdate}
            onCancel={() => setEditOpen(false)}
            submitLabel="Save changes"
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this contact?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {contact.name || "this contact"},
              along with all associated tags, custom fields, and notes. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="size-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function NoteItemCard({ note }: { note: NoteItem }) {
  return (
    <Card>
      <CardContent className="space-y-2 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-sm font-medium">
            <StickyNote className="size-4 text-muted-foreground" />
            {note.user?.name || note.user?.email || "Unknown user"}
          </p>
          <span className="text-xs text-muted-foreground">
            {formatRelativeTime(note.createdAt)}
          </span>
        </div>
        <p className="whitespace-pre-wrap text-sm">{note.content}</p>
      </CardContent>
    </Card>
  );
}

function ConversationItemCard({
  conversation,
}: {
  conversation: ConversationSummary;
}) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-3 p-4 sm:p-5">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <ConversationStatusBadge status={conversation.status} />
            {conversation.whatsappAccount && (
              <span className="font-mono text-xs text-muted-foreground">
                {conversation.whatsappAccount.phoneNumber}
              </span>
            )}
            {conversation.unreadCount && conversation.unreadCount > 0 ? (
              <Badge className="bg-emerald-600">
                {conversation.unreadCount} unread
              </Badge>
            ) : null}
          </div>
          <p className="truncate text-sm">
            {conversation.lastMessagePreview || "No messages yet"}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatRelativeTime(conversation.lastMessageAt ?? conversation.createdAt)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

interface ActivityEvent {
  id: string;
  at: string;
  kind: "created" | "updated" | "note" | "conversation";
  text: string;
  detail?: string;
}

function ActivityTimeline({
  contactCreatedAt,
  contactUpdatedAt,
  notes,
  conversations,
}: {
  contactCreatedAt: string;
  contactUpdatedAt?: string | null;
  notes: NoteItem[];
  conversations: ConversationSummary[];
}) {
  const events = React.useMemo<ActivityEvent[]>(() => {
    const list: ActivityEvent[] = [
      {
        id: "created",
        at: contactCreatedAt,
        kind: "created",
        text: "Contact created",
      },
    ];

    if (contactUpdatedAt) {
      list.push({
        id: "updated",
        at: contactUpdatedAt,
        kind: "updated",
        text: "Contact updated",
      });
    }

    for (const note of notes) {
      list.push({
        id: `note-${note.id}`,
        at: note.createdAt,
        kind: "note",
        text: "Note added",
        detail: note.content,
      });
    }

    for (const conversation of conversations) {
      list.push({
        id: `conversation-${conversation.id}`,
        at: conversation.lastMessageAt ?? conversation.createdAt,
        kind: "conversation",
        text: "New conversation",
        detail: conversation.lastMessagePreview || undefined,
      });
    }

    return list.sort(
      (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()
    );
  }, [contactCreatedAt, contactUpdatedAt, notes, conversations]);

  return (
    <Card>
      <CardContent className="p-5">
        {events.length === 0 && (
          <p className="text-sm text-muted-foreground">No activity yet.</p>
        )}
        <ol className="relative space-y-6 border-l border-border pl-6">
          {events.map((event) => (
            <li key={event.id} className="relative">
              <span className="absolute -left-[31px] flex size-5 items-center justify-center rounded-full border bg-card">
                <EventIcon kind={event.kind} />
              </span>
              <div className="flex flex-wrap items-center justify-between gap-1">
                <p className="text-sm font-medium">{event.text}</p>
                <span className="text-xs text-muted-foreground">
                  {formatDate(event.at)} · {formatRelativeTime(event.at)}
                </span>
              </div>
              {event.detail && (
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {event.detail}
                </p>
              )}
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

function EventIcon({ kind }: { kind: ActivityEvent["kind"] }) {
  const className = "size-3 text-muted-foreground";
  switch (kind) {
    case "created":
      return <UserPlus className={className} />;
    case "updated":
      return <Pencil className={className} />;
    case "note":
      return <StickyNote className={className} />;
    case "conversation":
      return <MessageSquare className={className} />;
  }
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="h-8 w-24">
        <Skeleton className="h-8 w-24" />
      </div>
      <Skeleton className="h-28 w-full rounded-xl" />
      <div className="flex gap-2">
        {[0, 1, 2, 3].map((item) => (
          <Skeleton key={item} className="h-9 w-24 rounded-lg" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-64 w-full rounded-xl lg:col-span-2" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    </div>
  );
}