"use client";

import * as React from "react";
import Link from "next/link";
import { MoreHorizontal, Pencil, Trash2, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn, formatDate } from "@/lib/utils";

import type { ContactListItem, ContactTag } from "./types";
import { getInitials } from "./types";

export function ContactAvatar({
  name,
  className,
}: {
  name: string | null;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-sm font-semibold text-emerald-700 dark:text-emerald-400",
        className
      )}
    >
      {getInitials(name)}
    </div>
  );
}

export function ContactTags({ tags }: { tags: ContactTag[] }) {
  if (tags.length === 0) {
    return <span className="text-xs text-muted-foreground">No tags</span>;
  }

  return (
    <div className="flex max-w-[200px] flex-wrap items-center gap-1">
      {tags.slice(0, 2).map((tag) => (
        <Badge key={tag.id} variant="secondary" className="gap-1">
          <span
            className="size-1.5 rounded-full"
            style={{ backgroundColor: tag.color || "#64748b" }}
          />
          {tag.name}
        </Badge>
      ))}
      {tags.length > 2 && <Badge variant="outline">+{tags.length - 2}</Badge>}
    </div>
  );
}

export function OptInBadge({ optIn }: { optIn: boolean }) {
  return (
    <Badge variant={optIn ? "success" : "secondary"}>
      {optIn ? "Opted in" : "No opt-in"}
    </Badge>
  );
}

interface ContactTableProps {
  contacts: ContactListItem[];
  loading: boolean;
  hasAnyContacts: boolean;
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: (ids: string[]) => void;
  onEdit: (contact: ContactListItem) => void;
  onDelete: (contact: ContactListItem) => void;
}

function ContactRowActions({
  contact,
  onEdit,
  onDelete,
}: {
  contact: ContactListItem;
  onEdit: (contact: ContactListItem) => void;
  onDelete: (contact: ContactListItem) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className="size-8">
          <MoreHorizontal className="size-4" />
          <span className="sr-only">Actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={`/contacts/${contact.id}`}>View details</Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onEdit(contact)}>
          <Pencil className="size-4" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onSelect={() => onDelete(contact)}
        >
          <Trash2 className="size-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function EmptyState({ hasAnyContacts }: { hasAnyContacts: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
        <Users className="size-7" />
      </div>
      <div>
        <p className="font-semibold">
          {hasAnyContacts ? "No contacts found" : "No contacts yet"}
        </p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
          {hasAnyContacts
            ? "Try adjusting your search or filters to find contacts."
            : "Add your first contact manually or import a CSV file to get started."}
        </p>
      </div>
    </div>
  );
}

export function ContactTable({
  contacts,
  loading,
  hasAnyContacts,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onEdit,
  onDelete,
}: ContactTableProps) {
  const allOnPageSelected =
    contacts.length > 0 &&
    contacts.every((contact) => selectedIds.includes(contact.id));
  const someOnPageSelected = contacts.some((contact) =>
    selectedIds.includes(contact.id)
  );

  return (
    <>
      <div className="hidden overflow-hidden rounded-xl border bg-card md:block">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-10">
                <Checkbox
                  aria-label="Select all contacts"
                  checked={
                    allOnPageSelected
                      ? true
                      : someOnPageSelected
                        ? "indeterminate"
                        : false
                  }
                  onCheckedChange={() =>
                    onToggleSelectAll(contacts.map((contact) => contact.id))
                  }
                />
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Opt-in</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 6 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Skeleton className="size-4 rounded-sm" />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Skeleton className="size-9 rounded-full" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-28" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-36" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="size-8 rounded-md" />
                  </TableCell>
                </TableRow>
              ))
            ) : contacts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="p-0">
                  <EmptyState hasAnyContacts={hasAnyContacts} />
                </TableCell>
              </TableRow>
            ) : (
              contacts.map((contact) => (
                <TableRow key={contact.id} className="group">
                  <TableCell>
                    <Checkbox
                      aria-label={`Select ${contact.name ?? contact.phone}`}
                      checked={selectedIds.includes(contact.id)}
                      onCheckedChange={() => onToggleSelect(contact.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/contacts/${contact.id}`}
                      className="flex items-center gap-3 rounded-md hover:opacity-80"
                    >
                      <ContactAvatar name={contact.name} />
                      <span className="font-medium">
                        {contact.name || "Unnamed contact"}
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {contact.phone}
                  </TableCell>
                  <TableCell className="max-w-[180px] truncate text-xs text-muted-foreground">
                    {contact.email || "—"}
                  </TableCell>
                  <TableCell>
                    <ContactTags tags={contact.tags} />
                  </TableCell>
                  <TableCell className="text-xs">
                    {contact.source || "—"}
                  </TableCell>
                  <TableCell>
                    <OptInBadge optIn={contact.optIn} />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDate(contact.createdAt)}
                  </TableCell>
                  <TableCell>
                    <ContactRowActions
                      contact={contact}
                      onEdit={onEdit}
                      onDelete={onDelete}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="grid gap-3 md:hidden">
        {loading
          ? Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="flex items-center gap-3 rounded-xl border bg-card p-4"
              >
                <Skeleton className="size-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="size-8 rounded-md" />
              </div>
            ))
          : contacts.length === 0
            ? (
                <div className="rounded-xl border bg-card">
                  <EmptyState hasAnyContacts={hasAnyContacts} />
                </div>
              )
            : contacts.map((contact) => (
                <div
                  key={contact.id}
                  className="rounded-xl border bg-card p-4"
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      aria-label="Select contact"
                      checked={selectedIds.includes(contact.id)}
                      onCheckedChange={() => onToggleSelect(contact.id)}
                      className="mt-1"
                    />
                    <Link
                      href={`/contacts/${contact.id}`}
                      className="min-w-0 flex-1 hover:opacity-80"
                    >
                      <div className="flex items-center gap-3">
                        <ContactAvatar name={contact.name} />
                        <div className="min-w-0">
                          <p className="truncate font-medium">
                            {contact.name || "Unnamed contact"}
                          </p>
                          <p className="truncate font-mono text-xs text-muted-foreground">
                            {contact.phone}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {contact.tags.length > 0 ? (
                          <ContactTags tags={contact.tags} />
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            No tags
                          </span>
                        )}
                        <OptInBadge optIn={contact.optIn} />
                        {contact.source && (
                          <span className="text-xs text-muted-foreground">
                            {contact.source}
                          </span>
                        )}
                      </div>
                    </Link>
                    <ContactRowActions
                      contact={contact}
                      onEdit={onEdit}
                      onDelete={onDelete}
                    />
                  </div>
                </div>
              ))}
      </div>
    </>
  );
}