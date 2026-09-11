"use client"

import * as React from "react"
import Link from "next/link"
import { CreditCard, Download, ArrowUpRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { UsageCard } from "@/components/billing/usage-card"
import { formatDate } from "@/lib/utils"

interface SubscriptionData {
  id: string
  status: string
  currentPeriodStart: string
  currentPeriodEnd: string
  plan: {
    id: string
    name: string
    price: number
    billingCycle: string
  }
}

interface UsageData {
  period: string
  currentUsage: {
    messages: number
    contacts: number
    apiCalls: number
    automations: number
  }
  planLimits: {
    messages: number
    contacts: number
    apiCalls: number
    automations: number
  }
}

interface Invoice {
  id: string
  amount: number
  status: string
  invoiceUrl: string | null
  paidAt: string | null
  createdAt: string
  subscription: {
    plan: { name: string }
  }
}

interface ApiResponse<T> {
  success: boolean
  data: T
}

export default function BillingPage() {
  const [subscription, setSubscription] = React.useState<SubscriptionData | null>(null)
  const [usage, setUsage] = React.useState<UsageData | null>(null)
  const [invoices, setInvoices] = React.useState<Invoice[]>([])
  const [loading, setLoading] = React.useState(true)
  const [usageLoading, setUsageLoading] = React.useState(true)
  const [invoiceLoading, setInvoiceLoading] = React.useState(true)

  React.useEffect(() => {
    fetch("/api/billing/subscription")
      .then((r) => r.json())
      .then((body: ApiResponse<SubscriptionData | null>) => {
        if (body.success) setSubscription(body.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  React.useEffect(() => {
    fetch("/api/billing/usage")
      .then((r) => r.json())
      .then((body: ApiResponse<UsageData>) => {
        if (body.success) setUsage(body.data)
      })
      .catch(() => {})
      .finally(() => setUsageLoading(false))
  }, [])

  React.useEffect(() => {
    fetch("/api/billing/invoices?limit=10")
      .then((r) => r.json())
      .then((body: ApiResponse<Invoice[]>) => {
        if (body.success) setInvoices(body.data)
      })
      .catch(() => {})
      .finally(() => setInvoiceLoading(false))
  }, [])

  const statusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
      case "TRIALING":
        return "success" as const
      case "PAST_DUE":
        return "warning" as const
      case "CANCELLED":
      case "PAUSED":
        return "destructive" as const
      default:
        return "secondary" as const
    }
  }

  const invoiceStatusColor = (status: string) => {
    switch (status) {
      case "PAID":
        return "success" as const
      case "PENDING":
        return "warning" as const
      case "FAILED":
        return "destructive" as const
      default:
        return "secondary" as const
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Billing & Usage
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your subscription, monitor usage, and review invoices.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="size-4" />
              Current Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-7 w-28" />
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-9 w-full" />
              </div>
            ) : subscription ? (
              <div className="space-y-4">
                <div>
                  <p className="text-2xl font-bold">{subscription.plan.name}</p>
                  <p className="text-sm text-muted-foreground">
                    ${subscription.plan.price}/{subscription.plan.billingCycle === "MONTHLY" ? "mo" : "yr"}
                  </p>
                </div>
                <Badge variant={statusColor(subscription.status)}>
                  {subscription.status}
                </Badge>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>Current period: {formatDate(subscription.currentPeriodStart)} - {formatDate(subscription.currentPeriodEnd)}</p>
                </div>
                <Button asChild variant="outline" className="w-full" size="sm">
                  <Link href="/billing/plans">
                    <ArrowUpRight className="size-4" />
                    Change Plan
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-2xl font-bold">Free</p>
                  <p className="text-sm text-muted-foreground">$0/mo</p>
                </div>
                <Badge variant="secondary">No subscription</Badge>
                <Button asChild className="w-full" size="sm">
                  <Link href="/billing/plans">Upgrade Now</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Payment Method</CardTitle>
            <CardDescription>Manage your payment details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-8 text-center">
              <CreditCard className="size-8 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">No payment method configured</p>
                <p className="text-xs text-muted-foreground">
                  Connect Stripe to enable billing and subscriptions.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold">Usage</h2>
        {usageLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <div className="space-y-3 p-5">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-7 w-24" />
                  <Skeleton className="h-2 w-full" />
                  <Skeleton className="h-3 w-28" />
                </div>
              </Card>
            ))}
          </div>
        ) : usage ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <UsageCard
              label="Messages"
              used={usage.currentUsage.messages}
              limit={usage.planLimits.messages}
            />
            <UsageCard
              label="Contacts"
              used={usage.currentUsage.contacts}
              limit={usage.planLimits.contacts}
            />
            <UsageCard
              label="API Calls"
              used={usage.currentUsage.apiCalls}
              limit={usage.planLimits.apiCalls}
            />
            <UsageCard
              label="Automations"
              used={usage.currentUsage.automations}
              limit={usage.planLimits.automations}
            />
          </div>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Invoice History</CardTitle>
          <CardDescription>Your recent invoices and billing records</CardDescription>
        </CardHeader>
        <CardContent>
          {invoiceLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-8 text-center">
              <CreditCard className="size-6 text-muted-foreground" />
              <p className="text-sm font-medium">No invoices yet</p>
              <p className="text-xs text-muted-foreground">
                Invoices will appear here after your first billing cycle.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="tabular-nums">
                      {formatDate(invoice.createdAt)}
                    </TableCell>
                    <TableCell>{invoice.subscription.plan.name}</TableCell>
                    <TableCell className="font-medium tabular-nums">
                      ${invoice.amount}
                    </TableCell>
                    <TableCell>
                      <Badge variant={invoiceStatusColor(invoice.status)}>
                        {invoice.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {invoice.invoiceUrl && (
                        <a
                          href={invoice.invoiceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <Download className="size-4" />
                        </a>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
