"use client";

import * as React from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  Plus,
  Search,
  Tag,
  Trash2,
  Upload,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  ContactForm,
  contactToFormDefaults,
  type ContactFormValues,
} from "@/components/contacts/contact-form";
import { ContactImportDialog } from "@/components/contacts/contact-import-dialog";
import { ContactTable } from "@/components/contacts/contact-table";
import type {
  ContactListItem,
  ContactListResponse,
  ContactTag,
  PaginationMeta,
} from "@/components/contacts/types";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";

const SOURCE_OPTIONS = ["Import", "Manual", "WhatsApp", "Web form", "API"];

const SORT_OPTIONS = [
  { value: "createdL", label: "Created (newest first)" },
  { value: "createdO", label: "Created (oldest first)" },
  { value: "nameA", label: "Name (A-Z)" },
  { value: "nameZ", label: "Name (Z-A)" },
  { value: "lastMessageD", label: "Last message (newest)" },
  { value: "lastMessageO", label: "Last message (oldest)" },
];

function buildQuery(params: {
  page: number;
  search: string;
  tagId: string;
  source: string;
  optIn: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
}) {
  const query = new URLSearchParams();
  query.set("page", String(params.page));
  query.set("limit", "20");
  if (params.search) query.set("search", params.search);
  if (params.tagId !== "all") query.set("tag", params.tagId);
  if (params.source !== "all") query.set("source", params.source);
  if (params.optIn !== "all") query.set("optIn", params.optIn);
  query.set("sortBy", params.sortBy);
  query.set("sortOrder", params.sortOrder);
  return query;
}

function getPageNumbers(current: number, total: number): number[] {
  const windowSize = 5;
  const start = Math.max(1, Math.min(current - 2, total - windowSize + 1));
  const end = Math.min(total, start + windowSize - 1);
  const pages: number[] = [];
  for (let i = start; i <= end; i++) pages.push(i);
  return pages;
}

export default function ContactsPage() {
  const [contacts, setContacts] = React.useState<ContactListItem[]>([]);
  const [pagination, setPagination] = React.useState<PaginationMeta | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [tagId, setTagId] = React.useState("all");
  const [source, setSource] = React.useState("all");
  const [optIn, setOptIn] = React.useState("all");
  const [sort, setSort] = React.useState("createdL");
  const [page, setPage] = React.useState(1);

  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [workspaceTags, setWorkspaceTags] = React.useState<ContactTag[]>([]);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [editContact, setEditContact] = React.useState<ContactListItem | null>(null);
  const [deleteContact, setDeleteContact] = React.useState<ContactListItem | null>(null);
  const [importOpen, setImportOpen] = React.useState(false);
  const [bulkTagOpen, setBulkTagOpen] = React.useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = React.useState(false);
  const [bulkTagIds, setBulkTagIds] = React.useState<string[]>([]);
  const [bulkBusy, setBulkBusy] = React.useState(false);

  const { sortBy, sortOrder } = React.useMemo(() => {
    switch (sort) {
      case "createdO":
        return { sortBy: "created", sortOrder: "asc" as const };
      case "nameA":
        return { sortBy: "name", sortOrder: "asc" as const };
      case "nameZ":
        return { sortBy: "name", sortOrder: "desc" as const };
      case "lastMessageD":
        return { sortBy: "lastMessage", sortOrder: "desc" as const };
      case "lastMessageO":
        return { sortBy: "lastMessage", sortOrder: "asc" as const };
      default:
        return { sortBy: "created", sortOrder: "desc" as const };
    }
  }, [sort]);

  const fetchTags = React.useCallback(async () => {
    try {
      const response = await fetch("/api/tags");
      const body: { success: boolean; data?: ContactTag[] } = await response.json();
      if (response.ok && body.success) setWorkspaceTags(body.data ?? []);
    } catch {
      // Tags are non-critical; keep whatever we have.
    }
  }, []);

  const fetchContacts = React.useCallback(
    async (abortSignal?: AbortSignal) => {
      setLoading(true);
      setError(null);
      try {
        const query = buildQuery({ page, search, tagId, source, optIn, sortBy, sortOrder });
        const response = await fetch(`/api/contacts?${query.toString()}`, {
          signal: abortSignal,
        });
        const body: ContactListResponse = await response.json();

        if (!response.ok || !body.success) {
          setError(body.error?.message ?? "Could not load contacts");
          setContacts([]);
          return;
        }

        setContacts(body.data);
        setPagination(body.pagination ?? null);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError("Could not load contacts");
        setContacts([]);
      } finally {
        setLoading(false);
      }
    },
    [page, search, tagId, source, optIn, sortBy, sortOrder]
  );

  React.useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  React.useEffect(() => {
    const controller = new AbortController();
    fetchContacts(controller.signal);
    return () => controller.abort();
  }, [fetchContacts]);

  React.useEffect(() => {
    setSelectedIds([]);
  }, [search, tagId, source, optIn]);

  React.useEffect(() => {
    if (searchInput === search) return;
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput, search]);

  const applyTagFilter = (value: string) => {
    setTagId(value);
    setPage(1);
  };

  const applySourceFilter = (value: string) => {
    setSource(value);
    setPage(1);
  };

  const applyOptInFilter = (value: string) => {
    setOptIn(value);
    setPage(1);
  };

  const applySort = (value: string) => {
    setSort(value);
    setPage(1);
  };

  const clearSelection = () => setSelectedIds([]);

  const handleCreate = async (values: ContactFormValues) => {
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

    const response = await fetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await response.json();

    if (!response.ok || !result.success) {
      toast({
        variant: "destructive",
        title: "Could not create contact",
        description: result.error?.message ?? "Something went wrong",
      });
      throw new Error(result.error?.message ?? "Create failed");
    }

    toast({ title: "Contact created" });
    setCreateOpen(false);
    fetchContacts();
  };

  const handleUpdate = async (contact: ContactListItem, values: ContactFormValues) => {
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

    const response = await fetch(`/api/contacts/${contact.id}`, {
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
    setEditContact(null);
    fetchContacts();
  };

  const handleDelete = async (contact: ContactListItem) => {
    const response = await fetch(`/api/contacts/${contact.id}`, {
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
    setDeleteContact(null);
    setSelectedIds((prev) => prev.filter((id) => id !== contact.id));
    fetchContacts();
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setBulkBusy(true);
    try {
      const response = await fetch("/api/contacts/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete",
          contactIds: selectedIds,
        }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        toast({
          variant: "destructive",
          title: "Could not delete contacts",
          description: result.error?.message ?? "Something went wrong",
        });
        return;
      }

      toast({ title: result.data?.message ?? "Contacts deleted" });
      clearSelection();
      setBulkDeleteOpen(false);
      fetchContacts();
    } finally {
      setBulkBusy(false);
    }
  };

  const handleBulkTag = async () => {
    if (selectedIds.length === 0 || bulkTagIds.length === 0) return;
    setBulkBusy(true);
    try {
      const response = await fetch("/api/contacts/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "tag",
          contactIds: selectedIds,
          tagIds: bulkTagIds,
        }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        toast({
          variant: "destructive",
          title: "Could not tag contacts",
          description: result.error?.message ?? "Something went wrong",
        });
        return;
      }

      toast({ title: result.data?.message ?? "Contacts tagged" });
      setBulkTagOpen(false);
      setBulkTagIds([]);
      clearSelection();
      fetchContacts();
    } finally {
      setBulkBusy(false);
    }
  };

  const goToExport = () => {
    const query = buildQuery({ page: 1, search, tagId, source, optIn, sortBy, sortOrder });
    window.open(`/api/contacts/export?${query.toString()}`, "_blank");
  };

  const hasAnyContacts = (pagination?.total ?? 0) > 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Contacts</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage the people you communicate with on WhatsApp.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={goToExport}>
            <Download className="size-4" />
            Export
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setImportOpen(true)}
          >
            <Upload className="size-4" />
            Import
          </Button>
          <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Add Contact
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
        <div className="relative flex-1 lg:max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search by name, phone, or email..."
            className="pl-9"
          />
        </div>

        <Select value={tagId} onValueChange={applyTagFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="All tags" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All tags</SelectItem>
            {workspaceTags.map((tag) => (
              <SelectItem key={tag.id} value={tag.id}>
                {tag.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={source} onValueChange={applySourceFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="All sources" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sources</SelectItem>
            {SOURCE_OPTIONS.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={optIn} onValueChange={applyOptInFilter}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="Any opt-in" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any opt-in</SelectItem>
            <SelectItem value="true">Opted in</SelectItem>
            <SelectItem value="false">Not opted in</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sort} onValueChange={applySort}>
          <SelectTrigger className="w-full sm:w-52">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-card px-4 py-2.5">
          <p className="flex items-center gap-2 text-sm font-medium">
            <Users className="size-4 text-muted-foreground" />
            {selectedIds.length} selected
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setBulkTagOpen(true)}
            >
              <Tag className="size-4" />
              Bulk Tag
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => setBulkDeleteOpen(true)}
            >
              <Trash2 className="size-4" />
              Bulk Delete
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={goToExport}>
              <Download className="size-4" />
              Export
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={clearSelection}>
              Clear
            </Button>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <ContactTable
        contacts={contacts}
        loading={loading}
        hasAnyContacts={hasAnyContacts}
        selectedIds={selectedIds}
        onToggleSelect={(id) =>
          setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
          )
        }
        onToggleSelectAll={(ids) => {
          const allSelected = ids.every((id) => selectedIds.includes(id));
          setSelectedIds((prev) =>
            allSelected ? prev.filter((id) => !ids.includes(id)) : [...new Set([...prev, ...ids])]
          );
        }}
        onEdit={(contact) => setEditContact(contact)}
        onDelete={(contact) => setDeleteContact(contact)}
      />

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Showing{" "}
            {(pagination.page - 1) * pagination.limit + 1}–
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
            {pagination.total.toLocaleString()}
          </p>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-8"
              disabled={!pagination.hasPrev || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              aria-label="Previous page"
            >
              <ChevronLeft className="size-4" />
            </Button>
            {getPageNumbers(pagination.page, pagination.totalPages).map((pageNumber) => (
              <Button
                key={pageNumber}
                type="button"
                variant={pageNumber === pagination.page ? "default" : "outline"}
                size="icon"
                className="size-8"
                onClick={() => setPage(pageNumber)}
              >
                {pageNumber}
              </Button>
            ))}
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-8"
              disabled={!pagination.hasNext || loading}
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              aria-label="Next page"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add contact</DialogTitle>
            <DialogDescription>
              Create a new contact in this workspace.
            </DialogDescription>
          </DialogHeader>
          <ContactForm
            availableTags={workspaceTags}
            onSubmit={handleCreate}
            onCancel={() => setCreateOpen(false)}
            submitLabel="Create contact"
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={editContact !== null}
        onOpenChange={(open) => {
          if (!open) setEditContact(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit contact</DialogTitle>
            <DialogDescription>
              Update the contact details for {editContact?.name || "this contact"}.
            </DialogDescription>
          </DialogHeader>
          {editContact && (
            <ContactForm
              defaultValues={contactToFormDefaults(editContact)}
              availableTags={workspaceTags}
              onSubmit={(values) => handleUpdate(editContact, values)}
              onCancel={() => setEditContact(null)}
              submitLabel="Save changes"
            />
          )}
        </DialogContent>
      </Dialog>

      <ContactImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={fetchContacts}
      />

      <AlertDialog
        open={deleteContact !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteContact(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete contact?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {deleteContact?.name || "this contact"},
              along with their tags, custom fields, and notes. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteContact && handleDelete(deleteContact)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.length} contacts?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the selected contacts and their associated
              data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkBusy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={bulkBusy}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {bulkBusy && <Loader2 className="size-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={bulkTagOpen} onOpenChange={setBulkTagOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tag {selectedIds.length} contacts</DialogTitle>
            <DialogDescription>
              Choose one or more tags to apply to the selected contacts.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-2">
            {workspaceTags.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No tags yet. Create tags to organize contacts.
              </p>
            )}
            {workspaceTags.map((tag) => {
              const isSelected = bulkTagIds.includes(tag.id);
              return (
                <Badge
                  key={tag.id}
                  variant={isSelected ? "default" : "secondary"}
                  className={cn(
                    "cursor-pointer select-none gap-1.5",
                    isSelected && "bg-emerald-600 hover:bg-emerald-600"
                  )}
                  onClick={() =>
                    setBulkTagIds((prev) =>
                      prev.includes(tag.id)
                        ? prev.filter((id) => id !== tag.id)
                        : [...prev, tag.id]
                    )
                  }
                >
                  <span
                    className="size-1.5 rounded-full"
                    style={{ backgroundColor: tag.color || "#fff" }}
                  />
                  {tag.name}
                </Badge>
              );
            })}
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setBulkTagOpen(false);
                setBulkTagIds([]);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleBulkTag}
              disabled={bulkBusy || bulkTagIds.length === 0}
            >
              {bulkBusy && <Loader2 className="size-4 animate-spin" />}
              Apply tags
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}