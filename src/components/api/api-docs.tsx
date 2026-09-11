"use client";

import * as React from "react";

interface Endpoint {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  description: string;
  permission: string;
  requestBody?: string;
  responseExample: string;
}

const ENDPOINTS: Endpoint[] = [
  {
    method: "POST",
    path: "/api/v1/messages/send",
    description:
      "Send a message to a contact. Creates the contact and conversation automatically if they do not exist.",
    permission: "messages:send",
    requestBody: `{
  "to": "+14155551234",
  "type": "TEXT",
  "text": "Hello from the API!"
}`,
    responseExample: `{
  "success": true,
  "data": {
    "messageId": "uuid",
    "status": "QUEUED"
  }
}`,
  },
  {
    method: "GET",
    path: "/api/v1/messages",
    description:
      "List messages across conversations. Supports filtering by conversation, status, and date range.",
    permission: "messages:view",
    responseExample: `{
  "success": true,
  "data": [...messages],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}`,
  },
  {
    method: "GET",
    path: "/api/v1/contacts",
    description:
      "List contacts with optional search, tag filtering, and pagination.",
    permission: "contacts:view",
    responseExample: `{
  "success": true,
  "data": [...contacts],
  "pagination": { ... }
}`,
  },
  {
    method: "POST",
    path: "/api/v1/contacts",
    description: "Create a new contact in the workspace.",
    permission: "contacts:create",
    requestBody: `{
  "name": "John Doe",
  "phone": "+14155551234",
  "email": "john@example.com"
}`,
    responseExample: `{
  "success": true,
  "data": { "id": "uuid", "name": "John Doe", "phone": "+14155551234", ... }
}`,
  },
  {
    method: "GET",
    path: "/api/v1/contacts/:id",
    description: "Get a single contact by ID.",
    permission: "contacts:view",
    responseExample: `{
  "success": true,
  "data": { "id": "uuid", "name": "John Doe", ... }
}`,
  },
  {
    method: "PUT",
    path: "/api/v1/contacts/:id",
    description: "Update an existing contact.",
    permission: "contacts:edit",
    requestBody: `{
  "name": "Jane Doe",
  "email": "jane@example.com"
}`,
    responseExample: `{
  "success": true,
  "data": { "id": "uuid", "name": "Jane Doe", ... }
}`,
  },
  {
    method: "DELETE",
    path: "/api/v1/contacts/:id",
    description: "Delete a contact and associated data.",
    permission: "contacts:delete",
    responseExample: `{
  "success": true,
  "data": { "message": "Contact deleted" }
}`,
  },
  {
    method: "GET",
    path: "/api/v1/campaigns",
    description: "List all campaigns with status filtering.",
    permission: "campaigns:view",
    responseExample: `{
  "success": true,
  "data": [...campaigns],
  "pagination": { ... }
}`,
  },
  {
    method: "POST",
    path: "/api/v1/campaigns",
    description:
      "Create a new campaign. The template must be approved.",
    permission: "campaigns:create",
    requestBody: `{
  "name": "Summer Sale",
  "templateId": "uuid",
  "contactFilter": {
    "tags": ["vip"]
  },
  "scheduledAt": "2026-09-15T10:00:00Z"
}`,
    responseExample: `{
  "success": true,
  "data": { "id": "uuid", "name": "Summer Sale", "status": "SCHEDULED", ... }
}`,
  },
  {
    method: "GET",
    path: "/api/v1/templates",
    description: "List templates with filtering by status, category, and language.",
    permission: "templates:view",
    responseExample: `{
  "success": true,
  "data": [...templates],
  "pagination": { ... }
}`,
  },
  {
    method: "GET",
    path: "/api/v1/analytics",
    description:
      "Get analytics data. Query by metric (messages, contacts, campaigns) and period (today, 7d, 30d, 90d).",
    permission: "analytics:view",
    responseExample: `{
  "success": true,
  "data": {
    "metric": "messages",
    "period": "30d",
    "total": 1250,
    "sent": 800,
    "delivered": 750,
    "read": 400,
    "failed": 50,
    "byDay": [...]
  }
}`,
  },
];

function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: "bg-emerald-100 text-emerald-700 border-emerald-200",
    POST: "bg-blue-100 text-blue-700 border-blue-200",
    PUT: "bg-amber-100 text-amber-700 border-amber-200",
    DELETE: "bg-red-100 text-red-700 border-red-200",
  };

  return (
    <span
      className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-bold font-mono ${
        colors[method] || "bg-gray-100 text-gray-700"
      }`}
    >
      {method}
    </span>
  );
}

function CodeBlock({ children, title }: { children: string; title?: string }) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-lg border bg-muted/50 overflow-hidden">
      {title && (
        <div className="flex items-center justify-between border-b bg-muted px-4 py-2">
          <span className="text-xs font-medium text-muted-foreground">{title}</span>
          <button
            type="button"
            onClick={handleCopy}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      )}
      <pre className="overflow-x-auto p-4 text-xs leading-relaxed">
        <code>{children}</code>
      </pre>
    </div>
  );
}

export function ApiDocs() {
  const BASE_URL = "https://your-domain.com";

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Authentication</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          All API requests must include your API key in the{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
            Authorization
          </code>{" "}
          header using the Bearer scheme.
        </p>
        <div className="mt-4">
          <CodeBlock title="Header">
{`Authorization: Bearer wapi_your_api_key_here`}
          </CodeBlock>
        </div>
        <div className="mt-4">
          <CodeBlock title="curl example">
{`curl -X GET "${BASE_URL}/api/v1/contacts" \\
  -H "Authorization: Bearer wapi_your_api_key_here" \\
  -H "Content-Type: application/json"`}
          </CodeBlock>
        </div>
      </div>

      <div className="rounded-lg border p-4 bg-amber-500/5 border-amber-500/20">
        <h3 className="text-sm font-semibold text-amber-600">Rate Limits</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          API requests are rate-limited per workspace. If you receive a{" "}
          <code className="rounded bg-muted px-1 text-xs">429</code> response, wait
          before retrying.
        </p>
      </div>

      <div>
        <h2 className="text-xl font-bold tracking-tight">Base URL</h2>
        <CodeBlock>{`${BASE_URL}/api/v1`}</CodeBlock>
      </div>

      <div>
        <h2 className="text-xl font-bold tracking-tight">Endpoints</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {ENDPOINTS.length} endpoints available.
        </p>

        <div className="mt-6 space-y-6">
          {ENDPOINTS.map((ep) => (
            <div
              key={`${ep.method}-${ep.path}`}
              className="rounded-xl border bg-card overflow-hidden"
            >
              <div className="flex flex-wrap items-center gap-3 border-b bg-muted/30 px-5 py-3">
                <MethodBadge method={ep.method} />
                <code className="text-sm font-mono font-medium">{ep.path}</code>
                <span className="ml-auto rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                  {ep.permission}
                </span>
              </div>
              <div className="space-y-4 px-5 py-4">
                <p className="text-sm text-muted-foreground">{ep.description}</p>

                {ep.requestBody && (
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Request Body
                    </p>
                    <CodeBlock>{ep.requestBody}</CodeBlock>
                  </div>
                )}

                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Response
                  </p>
                  <CodeBlock>{ep.responseExample}</CodeBlock>
                </div>

                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    curl
                  </p>
                  <CodeBlock>
{`curl -X ${ep.method} "${BASE_URL}${ep.path}" \\
  -H "Authorization: Bearer wapi_your_api_key_here" \\
  -H "Content-Type: application/json"${
    ep.requestBody
      ? ` \\
  -d '${ep.requestBody.replace(/\n/g, "\n  ")}'`
      : ""
  }`}
                  </CodeBlock>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
