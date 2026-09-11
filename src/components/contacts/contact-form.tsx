"use client";

import * as React from "react";
import { z } from "zod";
import { Loader2, Plus, Tag, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { contactSchema } from "@/lib/validators";
import { cn } from "@/lib/utils";

import type { ContactListItem, ContactTag } from "./types";

export interface ContactFormValues {
  name: string;
  phone: string;
  email: string;
  country: string;
  source: string;
  optIn: boolean;
  tags: string[];
  customFields: { key: string; value: string }[];
  notes: string;
}

interface ContactFormProps {
  defaultValues?: Partial<ContactFormValues>;
  availableTags: ContactTag[];
  onSubmit: (values: ContactFormValues) => Promise<void> | void;
  onCancel?: () => void;
  submitLabel?: string;
}

const formSchema = contactSchema.extend({
  country: z.string().max(100).optional().or(z.literal("")),
  source: z.string().max(120).optional().or(z.literal("")),
  optIn: z.boolean().optional(),
});

const EMPTY_VALUES: ContactFormValues = {
  name: "",
  phone: "",
  email: "",
  country: "",
  source: "",
  optIn: false,
  tags: [],
  customFields: [],
  notes: "",
};

export function contactToFormDefaults(
  contact: ContactListItem
): ContactFormValues {
  return {
    name: contact.name ?? "",
    phone: contact.phone,
    email: contact.email ?? "",
    country: contact.country ?? "",
    source: contact.source ?? "",
    optIn: contact.optIn,
    tags: contact.tags.map((tag) => tag.name),
    customFields: [],
    notes: "",
  };
}

function TagMultiSelect({
  tags,
  value,
  onChange,
}: {
  tags: ContactTag[];
  value: string[];
  onChange: (values: string[]) => void;
}) {
  const available = tags.filter((tag) => !value.includes(tag.name));

  return (
    <div className="space-y-2">
      <div className="relative z-10 flex flex-wrap items-center gap-1.5">
        {value.map((name) => {
          const tag = tags.find((t) => t.name === name);
          return (
            <Badge key={name} variant="secondary" className="gap-1 pr-1">
              <span
                className="size-1.5 rounded-full"
                style={{ backgroundColor: tag?.color || "#64748b" }}
              />
              {name}
              <button
                type="button"
                onClick={() => onChange(value.filter((v) => v !== name))}
                className="rounded-sm p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                aria-label={`Remove tag ${name}`}
              >
                <X className="size-3" />
              </button>
            </Badge>
          );
        })}
        {value.length === 0 && (
          <span className="text-xs text-muted-foreground">
            No tags selected
          </span>
        )}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2 text-muted-foreground"
          >
            <Tag className="size-4" />
            {available.length > 0 ? "Add tags" : "All tags selected"}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>Select tags</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {tags.length === 0 && (
            <div className="px-2 py-1.5 text-sm text-muted-foreground">
              No tags yet. Create them after saving.
            </div>
          )}
          {tags.map((tag) => (
            <DropdownMenuCheckboxItem
              key={tag.id}
              checked={value.includes(tag.name)}
              onCheckedChange={(checked) => {
                if (checked) {
                  onChange([...value, tag.name]);
                } else {
                  onChange(value.filter((v) => v !== tag.name));
                }
              }}
            >
              <span className="flex items-center gap-2">
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: tag.color || "#64748b" }}
                />
                {tag.name}
              </span>
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function ContactForm({
  defaultValues,
  availableTags,
  onSubmit,
  onCancel,
  submitLabel = "Save contact",
}: ContactFormProps) {
  const merged = React.useMemo<ContactFormValues>(() => {
    const base = { ...EMPTY_VALUES, ...defaultValues };
    return {
      ...base,
      tags: base.tags ?? [],
      customFields: base.customFields ?? [],
    };
  }, [defaultValues]);

  const [name, setName] = React.useState(merged.name);
  const [phone, setPhone] = React.useState(merged.phone);
  const [email, setEmail] = React.useState(merged.email);
  const [country, setCountry] = React.useState(merged.country);
  const [source, setSource] = React.useState(merged.source);
  const [optIn, setOptIn] = React.useState(merged.optIn);
  const [tags, setTags] = React.useState<string[]>(merged.tags);
  const [customFields, setCustomFields] = React.useState<
    { key: string; value: string }[]
  >(merged.customFields);
  const [notes, setNotes] = React.useState(merged.notes);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [submitting, setSubmitting] = React.useState(false);

  const setCustomField = (index: number, key: string, value: string) => {
    setCustomFields((prev) =>
      prev.map((field, i) => (i === index ? { key, value } : field))
    );
  };

  const removeCustomField = (index: number) => {
    setCustomFields((prev) => prev.filter((_, i) => i !== index));
  };

  const addCustomField = () => {
    setCustomFields((prev) => [...prev, { key: "", value: "" }]);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrors({});

    const customFieldsRecord: Record<string, string> = {};
    for (const field of customFields) {
      if (field.key.trim()) {
        customFieldsRecord[field.key.trim()] = field.value;
      }
    }

    const result = formSchema.safeParse({
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      country: country.trim(),
      source: source.trim(),
      optIn,
      tags,
      customFields: customFieldsRecord,
      notes: notes.trim() ? notes.trim() : undefined,
    });

    if (!result.success) {
      const nextErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = String(issue.path[0] ?? "name");
        if (!nextErrors[key]) nextErrors[key] = issue.message;
      }
      setErrors(nextErrors);
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        country: country.trim(),
        source: source.trim(),
        optIn,
        tags,
        customFields: customFields.filter((field) => field.key.trim()),
        notes: notes.trim(),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <fieldset className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor="contact-name">Full name</Label>
          <Input
            id="contact-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="John Doe"
          />
          {errors.name && (
            <p className="text-xs text-destructive">{errors.name}</p>
          )}
        </fieldset>

        <fieldset className="grid gap-1.5">
          <Label htmlFor="contact-phone">Phone number</Label>
          <Input
            id="contact-phone"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="+15551234567"
            inputMode="tel"
          />
          {errors.phone && (
            <p className="text-xs text-destructive">{errors.phone}</p>
          )}
        </fieldset>

        <fieldset className="grid gap-1.5">
          <Label htmlFor="contact-email">Email</Label>
          <Input
            id="contact-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="john@example.com"
          />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email}</p>
          )}
        </fieldset>

        <fieldset className="grid gap-1.5">
          <Label htmlFor="contact-country">Country</Label>
          <Input
            id="contact-country"
            value={country}
            onChange={(event) => setCountry(event.target.value)}
            placeholder="United States"
          />
        </fieldset>

        <fieldset className="grid gap-1.5">
          <Label htmlFor="contact-source">Source</Label>
          <Input
            id="contact-source"
            value={source}
            onChange={(event) => setSource(event.target.value)}
            placeholder="Import, Web form, WhatsApp..."
          />
        </fieldset>
      </div>

      <fieldset className="grid gap-1.5">
        <Label>Tags</Label>
        <TagMultiSelect tags={availableTags} value={tags} onChange={setTags} />
      </fieldset>

      <fieldset className="grid gap-2">
        <div className="flex items-center justify-between">
          <Label>Custom fields</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={addCustomField}
            className="gap-1.5 text-muted-foreground"
          >
            <Plus className="size-4" />
            Add field
          </Button>
        </div>
        {customFields.length === 0 && (
          <p className="text-xs text-muted-foreground">
            No custom fields. Add one to store extra information.
          </p>
        )}
        <div className="grid gap-2">
          {customFields.map((field, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                value={field.key}
                onChange={(event) =>
                  setCustomField(index, event.target.value, field.value)
                }
                placeholder="Field name"
                className="flex-1"
              />
              <Input
                value={field.value}
                onChange={(event) =>
                  setCustomField(index, field.key, event.target.value)
                }
                placeholder="Value"
                className="flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeCustomField(index)}
                aria-label="Remove field"
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      </fieldset>

      <fieldset className="grid gap-1.5">
        <Label htmlFor="contact-notes">Notes</Label>
        <Textarea
          id="contact-notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Add a note about this contact..."
          rows={3}
        />
        {errors.notes && (
          <p className="text-xs text-destructive">{errors.notes}</p>
        )}
      </fieldset>

      <div className="flex items-center justify-between rounded-lg border p-3">
        <div>
          <Label htmlFor="contact-optin">Opted in to messaging</Label>
          <p className="text-xs text-muted-foreground">
            Contact agreed to receive WhatsApp messages
          </p>
        </div>
        <Switch
          id="contact-optin"
          checked={optIn}
          onCheckedChange={setOptIn}
        />
      </div>

      <div
        className={cn(
          "flex items-center justify-end gap-2 pt-1",
          onCancel ? "" : "hidden"
        )}
      >
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={submitting}>
          {submitting && <Loader2 className="size-4 animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}