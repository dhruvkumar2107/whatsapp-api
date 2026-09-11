"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Ban,
  CheckCircle,
  Clock,
  FileText,
  Mail,
  MessageSquare,
  Phone,
  Shield,
  User,
  Wallet,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/toast";

interface CustomerDetail {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  avatar: string | null;
  createdAt: string;
  workspace: {
    id: string;
    name: string;
    slug: string;
    status: string;
    createdAt: string;
  };
  subscription: {
    plan: { name: string; price: number; billingCycle: string };
    status: string;
    currentPeriodEnd: string;
  } | null;
  whatsappAccount: {
    businessName: string;
    phoneNumber: string;
    status: string;
    qualityRating: string | null;
    wabaId: string;
  } | null;
  usage: {
    messagesUsed: number;
    contactsUsed: number;
  } | null;
  recentActivity: Array<{
    id: string;
    action: string;
    createdAt: string;
  }>;
}

export default function AdminCustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [customer, setCustomer] = React.useState<CustomerDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [actionLoading, setActionLoading] = React.useState(false);

  React.useEffect(() => {
    fetch(`/api/admin/customers/${id}`)
      .then((r) => r.json())
      .then((body) => {
        if (body.success) setCustomer(body.data);
        else toast({ title: "Error", description: body.error?.message || "Failed to load customer" });
      })
      .catch(() => toast({ title: "Error", description: "Failed to load customer" }))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleAction(action: "suspend" | "activate") {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/customers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const body = await res.json();
      if (body.success) {
        setCustomer((prev) => (prev ? { ...prev, workspace: { ...prev.workspace, status: action === "suspend" ? "SUSPENDED" : "ACTIVE" } } : prev));
        toast({ title: "Success", description: `Customer ${action === "suspend" ? "suspended" : "activated"}.` });
      } else {
        toast({ title: "Error", description: body.error?.message || "Action failed" });
      }
    } catch {
      toast({ title: "Error", description: "Request failed" });
    } finally {
      setActionLoading(false);
    }
  }

  function statusBadge(status: string) {
    switch (status) {
      case "ACTIVE":
        return <Badge variant="success">{status}</Badge>;
      case "SUSPENDED":
        return <Badge variant="destructive">{status}</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  }

  function whatsappBadge(status: string) {
    switch (status) {
      case "CONNECTED":
        return <Badge variant="success">{status}</Badge>;
      case "DISCONNECTED":
        return <Badge variant="destructive">{status}</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="size-4" /> Back
        </Button>
        <p className="text-muted-foreground">Customer not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="size-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">
            {customer.name || "Unnamed Customer"}
          </h1>
          <p className="text-muted-foreground">{customer.email}</p>
        </div>
        <div className="flex gap-2">
          {customer.workspace.status === "ACTIVE" ? (
            <Button
              variant="destructive"
              size="sm"
              disabled={actionLoading}
              onClick={() => handleAction("suspend")}
            >
              <Ban className="size-4" /> Suspend
            </Button>
          ) : (
            <Button
              variant="default"
              size="sm"
              disabled={actionLoading}
              onClick={() => handleAction("activate")}
            >
              <CheckCircle className="size-4" /> Activate
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/admin/audit-logs?user=${customer.id}`)}
          >
            <FileText className="size-4" /> Audit Logs
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="size-4" /> User Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <span>{customer.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Phone</span>
              <span>{customer.phone || "N/A"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created</span>
              <span>{new Date(customer.createdAt).toLocaleDateString()}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="size-4" /> Workspace
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name</span>
              <span className="font-medium">{customer.workspace.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Slug</span>
              <span>{customer.workspace.slug}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              {statusBadge(customer.workspace.status)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="size-4" /> Subscription
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {customer.subscription ? (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Plan</span>
                  <Badge variant="outline">{customer.subscription.plan.name}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Price</span>
                  <span>
                    ${Number(customer.subscription.plan.price).toFixed(2)}/
                    {customer.subscription.plan.billingCycle === "MONTHLY" ? "mo" : "yr"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  {statusBadge(customer.subscription.status)}
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Renews</span>
                  <span>{new Date(customer.subscription.currentPeriodEnd).toLocaleDateString()}</span>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground">No active subscription</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Phone className="size-4" /> WhatsApp Account
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {customer.whatsappAccount ? (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Business</span>
                  <span className="font-medium">{customer.whatsappAccount.businessName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Phone</span>
                  <span>{customer.whatsappAccount.phoneNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  {whatsappBadge(customer.whatsappAccount.status)}
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Quality</span>
                  <span>{customer.whatsappAccount.qualityRating || "N/A"}</span>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground">No WhatsApp account connected</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {!customer.recentActivity?.length ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No recent activity.
            </p>
          ) : (
            <div className="space-y-2">
              {customer.recentActivity.map((a) => (
                <div key={a.id} className="flex items-center gap-3 rounded-lg border p-3 text-sm">
                  <Clock className="size-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1">{a.action}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(a.createdAt).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
