"use client";

import * as React from "react";
import Papa from "papaparse";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  Upload,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";

type FieldKey =
  | "name"
  | "phone"
  | "email"
  | "tags"
  | "country"
  | "source"
  | "optIn";

interface FieldOption {
  key: FieldKey;
  label: string;
  required: boolean;
}

const FIELD_OPTIONS: FieldOption[] = [
  { key: "name", label: "Name", required: true },
  { key: "phone", label: "Phone number", required: true },
  { key: "email", label: "Email", required: false },
  { key: "tags", label: "Tags", required: false },
  { key: "country", label: "Country", required: false },
  { key: "source", label: "Source", required: false },
  { key: "optIn", label: "Opt-in status", required: false },
];

interface ImportSummary {
  total: number;
  valid: number;
  invalid: number;
  duplicates: number;
  created: number;
  updated: number;
  skipped: number;
}

interface ImportResult {
  row: number;
  status: "valid" | "invalid" | "duplicate";
  errors: string[];
}

interface ImportResponse {
  success: boolean;
  data?: {
    summary: ImportSummary;
    results: ImportResult[];
  };
  error?: { message?: string };
}

function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function autoMap(headers: string[]): Record<FieldKey, string | null> {
  const map: Record<FieldKey, string | null> = {
    name: null,
    phone: null,
    email: null,
    tags: null,
    country: null,
    source: null,
    optIn: null,
  };

  for (const header of headers) {
    const normalized = normalizeHeader(header);
    if (!map.name && /name|fullname|contactname/.test(normalized)) {
      map.name = header;
    }
    if (
      !map.phone &&
      /phone|mobile|whatsapp|tel|number/.test(normalized) &&
      !/count|record|id$/.test(normalized)
    ) {
      map.phone = header;
    }
    if (!map.email && /email|mail/.test(normalized)) {
      map.email = header;
    }
    if (!map.tags && /tag|label/.test(normalized)) {
      map.tags = header;
    }
    if (!map.country && /country|nation|region/.test(normalized)) {
      map.country = header;
    }
    if (!map.source && /source|origin|channel/.test(normalized)) {
      map.source = header;
    }
    if (!map.optIn && /opt[_-]?in|optin|consent|subscribed/.test(normalized)) {
      map.optIn = header;
    }
  }

  return map;
}

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

interface ContactImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}

export function ContactImportDialog({
  open,
  onOpenChange,
  onImported,
}: ContactImportDialogProps) {
  const [dragActive, setDragActive] = React.useState(false);
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [parseError, setParseError] = React.useState<string | null>(null);
  const [headers, setHeaders] = React.useState<string[]>([]);
  const [rows, setRows] = React.useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = React.useState<Record<FieldKey, string | null>>(
    { name: null, phone: null, email: null, tags: null, country: null, source: null, optIn: null }
  );
  const [review, setReview] = React.useState<ImportResponse["data"] | null>(null);
  const [validating, setValidating] = React.useState(false);
  const [importing, setImporting] = React.useState(false);
  const [duplicateStrategy, setDuplicateStrategy] = React.useState<
    "skip" | "update"
  >("skip");

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const reset = React.useCallback(() => {
    setDragActive(false);
    setFileName(null);
    setParseError(null);
    setHeaders([]);
    setRows([]);
    setMapping({
      name: null,
      phone: null,
      email: null,
      tags: null,
      country: null,
      source: null,
      optIn: null,
    });
    setReview(null);
    setValidating(false);
    setImporting(false);
    setDuplicateStrategy("skip");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  React.useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  const parseFile = (file: File) => {
    if (!/\.csv$/i.test(file.name) && file.type !== "text/csv") {
      setParseError("Please choose a CSV file (.csv)");
      return;
    }

    setParseError(null);
    setFileName(file.name);
    setReview(null);

    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const result = Papa.parse<Record<string, string>>(text, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim(),
      });

      const data = result.data.filter((row) =>
        Object.values(row).some(
          (value) => value && String(value).trim() !== ""
        )
      );

      if (data.length === 0) {
        setParseError("The CSV file appears to be empty");
        setRows([]);
        setHeaders([]);
        return;
      }

      const fields = (result.meta.fields ?? []).filter(Boolean);
      setHeaders(fields);
      setRows(data);
      setMapping(autoMap(fields));
    };
    reader.readAsText(file);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (file) parseFile(file);
  };

  const buildContacts = () => {
    const contacts: Record<string, unknown>[] = [];

    for (const row of rows) {
      const name = mapping.name ? String(row[mapping.name] ?? "").trim() : "";
      const phone = mapping.phone
        ? String(row[mapping.phone] ?? "").trim()
        : "";
      const email = mapping.email
        ? String(row[mapping.email] ?? "").trim()
        : "";
      const tagsRaw = mapping.tags
        ? String(row[mapping.tags] ?? "").trim()
        : "";
      const country = mapping.country
        ? String(row[mapping.country] ?? "").trim()
        : "";
      const source = mapping.source
        ? String(row[mapping.source] ?? "").trim()
        : "";
      const optInRaw = mapping.optIn
        ? String(row[mapping.optIn] ?? "")
            .trim()
            .toLowerCase()
        : "";

      if (!name && !phone) continue;

      contacts.push({
        name,
        phone,
        email: email || undefined,
        tags: tagsRaw
          ? tagsRaw.split(",").map((tag) => tag.trim()).filter(Boolean)
          : undefined,
        country: country || undefined,
        source: source || undefined,
        optIn: ["true", "yes", "1", "y"].includes(optInRaw),
      });
    }

    return contacts;
  };

  const handleValidate = async () => {
    if (!mapping.name || !mapping.phone) {
      setParseError(
        "Map both the Name and Phone columns before validating"
      );
      return;
    }

    const contacts = buildContacts();
    if (contacts.length === 0) {
      setParseError("No rows with a name or phone were found in the CSV");
      return;
    }

    setValidating(true);
    setParseError(null);
    try {
      const response = await fetch("/api/contacts/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contacts,
          mode: "validate",
          duplicateStrategy,
        }),
      });
      const body: ImportResponse = await response.json();

      if (!response.ok || !body.success || !body.data) {
        toast({
          variant: "destructive",
          title: "Validation failed",
          description:
            body.error?.message ?? "Could not validate the imported contacts",
        });
        return;
      }

      setReview(body.data);
    } catch {
      setParseError("Could not validate the file. Please try again.");
    } finally {
      setValidating(false);
    }
  };

  const handleImport = async () => {
    if (!review) return;
    const contacts = buildContacts();

    setImporting(true);
    try {
      const response = await fetch("/api/contacts/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contacts,
          mode: "import",
          duplicateStrategy,
        }),
      });
      const body: ImportResponse = await response.json();

      if (!response.ok || !body.success || !body.data) {
        toast({
          variant: "destructive",
          title: "Import failed",
          description: body.error?.message ?? "Could not import contacts",
        });
        return;
      }

      const summary = body.data.summary;
      toast({
        title: "Import complete",
        description:
          `Created ${summary.created}, updated ${summary.updated} ` +
          `(${summary.invalid} invalid, ${summary.duplicates} duplicate)`,
      });
      onImported();
      onOpenChange(false);
    } catch {
      toast({
        variant: "destructive",
        title: "Import failed",
        description: "Unexpected error while importing contacts",
      });
    } finally {
      setImporting(false);
    }
  };

  const downloadErrorReport = () => {
    if (!review) return;

    const invalidRows = review.results.filter(
      (result) => result.status === "invalid" || result.status === "duplicate"
    );

    const csv = [
      "row,status,error",
      ...invalidRows.map((result) =>
        [
          result.row + 1,
          result.status,
          csvCell(result.errors.join("; ")),
        ].join(",")
      ),
    ].join("\r\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "import-errors.csv";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const downloadTemplate = () => {
    const csv = [
      "name,phone,email,tags,country,source,opt_in",
      `"John Doe",+15551234567,john@example.com,"vip,customer",United States,Import,true`,
    ].join("\r\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "contact-import-template.csv";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Import contacts</DialogTitle>
          <DialogDescription>
            Upload a CSV file, map its columns, then validate before importing.
          </DialogDescription>
        </DialogHeader>

        <div className="grid max-h-[70vh] gap-5 overflow-y-auto pr-1">
          <div
            role="button"
            tabIndex={0}
            onDragOver={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors",
              dragActive
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-muted-foreground/50"
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) parseFile(file);
              }}
            />
            {fileName ? (
              <>
                <FileText className="size-8 text-emerald-500" />
                <p className="text-sm font-medium">{fileName}</p>
                <p className="text-xs text-muted-foreground">
                  {rows.length.toLocaleString()} rows parsed. Click to replace.
                </p>
              </>
            ) : (
              <>
                <Upload className="size-8 text-muted-foreground" />
                <p className="text-sm font-medium">
                  Drag and drop your CSV file here
                </p>
                <p className="text-xs text-muted-foreground">
                  or click to browse
                </p>
              </>
            )}
          </div>

          {!fileName && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mx-auto gap-2"
              onClick={downloadTemplate}
            >
              <Download className="size-4" />
              Download CSV template
            </Button>
          )}

          {parseError && (
            <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              <AlertTriangle className="size-4 shrink-0" />
              {parseError}
            </div>
          )}

          {fileName && !review && (
            <>
              <div className="grid gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Column mapping</h3>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1.5 text-xs"
                    onClick={() => setMapping(autoMap(headers))}
                  >
                    Auto-detect
                  </Button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {FIELD_OPTIONS.map((option) => (
                    <div
                      key={option.key}
                      className="flex items-center justify-between gap-3 rounded-lg border p-2.5"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{option.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {option.required ? "Required" : "Optional"}
                        </p>
                      </div>
                      <Select
                        value={mapping[option.key] ?? "skip"}
                        onValueChange={(value) =>
                          setMapping((prev) => ({
                            ...prev,
                            [option.key]: value === "skip" ? null : value,
                          }))
                        }
                      >
                        <SelectTrigger className="w-44">
                          <SelectValue placeholder="Select a column" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="skip">(skip)</SelectItem>
                          {headers.map((header) => (
                            <SelectItem key={header} value={header}>
                              {header}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-3">
                <h3 className="text-sm font-semibold">
                  Preview
                  <span className="ml-2 font-normal text-muted-foreground">
                    first {Math.min(10, rows.length)} rows
                  </span>
                </h3>
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b bg-muted/50">
                      <tr>
                        <th className="px-3 py-2 font-medium text-muted-foreground">
                          #
                        </th>
                        {FIELD_OPTIONS.map((option) => (
                          <th
                            key={option.key}
                            className="px-3 py-2 font-medium text-muted-foreground"
                          >
                            {option.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.slice(0, 10).map((row, index) => (
                        <tr key={index} className="border-b last:border-0">
                          <td className="px-3 py-2 text-muted-foreground">
                            {index + 1}
                          </td>
                          {FIELD_OPTIONS.map((option) => {
                            const column = mapping[option.key];
                            const value = column
                              ? String(row[column] ?? "")
                              : "";
                            return (
                              <td
                                key={option.key}
                                className="max-w-[180px] truncate px-3 py-2"
                              >
                                {value}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setFileName(null);
                      setRows([]);
                      setHeaders([]);
                      setReview(null);
                    }}
                  >
                    Change file
                  </Button>
                  <Button
                    type="button"
                    onClick={handleValidate}
                    disabled={validating || rows.length === 0}
                  >
                    {validating && (
                      <Loader2 className="size-4 animate-spin" />
                    )}
                    Validate
                  </Button>
                </div>
              </div>
            </>
          )}

          {review && (
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <SummaryCard
                  label="Total rows"
                  value={review.summary.total}
                  tone="default"
                />
                <SummaryCard
                  label="Valid"
                  value={review.summary.valid}
                  tone="success"
                  icon={CheckCircle2}
                />
                <SummaryCard
                  label="Invalid"
                  value={review.summary.invalid}
                  tone="destructive"
                  icon={XCircle}
                />
                <SummaryCard
                  label="Duplicates"
                  value={review.summary.duplicates}
                  tone="warning"
                  icon={AlertTriangle}
                />
              </div>

              {review.results.some(
                (result) => result.status === "invalid"
              ) && (
                <div className="rounded-md border p-3">
                  <p className="mb-2 text-sm font-semibold">
                    Invalid rows
                  </p>
                  <div className="max-h-40 space-y-1 overflow-y-auto">
                    {review.results
                      .filter((result) => result.status === "invalid")
                      .slice(0, 50)
                      .map((result) => (
                        <div
                          key={result.row}
                          className="flex gap-2 rounded bg-muted/40 px-2 py-1 text-xs"
                        >
                          <span className="shrink-0 font-medium">
                            Row {result.row + 1}
                          </span>
                          <span className="text-muted-foreground">
                            {result.errors.join("; ")}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Duplicate handling</p>
                  <p className="text-xs text-muted-foreground">
                    Choose what happens when a phone number already exists
                  </p>
                </div>
                <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
                  {(["skip", "update"] as const).map((strategy) => (
                    <button
                      key={strategy}
                      type="button"
                      onClick={() => setDuplicateStrategy(strategy)}
                      className={cn(
                        "rounded-md px-3 py-1 text-xs font-semibold capitalize transition-colors",
                        duplicateStrategy === strategy
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {strategy === "skip" ? "Skip" : "Update"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={downloadErrorReport}
                  disabled={
                    review.results.filter(
                      (result) =>
                        result.status === "invalid" ||
                        result.status === "duplicate"
                    ).length === 0
                  }
                >
                  <Download className="size-4" />
                  Download error report
                </Button>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setReview(null)}
                  >
                    <ArrowLeft className="size-4" />
                    Back
                  </Button>
                  <Button
                    type="button"
                    onClick={handleImport}
                    disabled={
                      importing || review.summary.valid === 0
                    }
                  >
                    {importing && (
                      <Loader2 className="size-4 animate-spin" />
                    )}
                    Import {review.summary.valid > 0 && review.summary.valid !== review.summary.total
                      ? `${review.summary.valid} valid`
                      : "contacts"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SummaryCard({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string;
  value: number;
  tone: "default" | "success" | "destructive" | "warning";
  icon?: typeof CheckCircle2;
}) {
  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center gap-1.5">
        {Icon && (
          <Icon
            className={cn(
              "size-4",
              tone === "success" && "text-emerald-600",
              tone === "destructive" && "text-red-600",
              tone === "warning" && "text-amber-600"
            )}
          />
        )}
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
      <p
        className={cn(
          "mt-1 text-2xl font-bold tabular-nums",
          tone === "success" && "text-emerald-600",
          tone === "destructive" && "text-red-600",
          tone === "warning" && "text-amber-600"
        )}
      >
        {value.toLocaleString()}
      </p>
    </div>
  );
}