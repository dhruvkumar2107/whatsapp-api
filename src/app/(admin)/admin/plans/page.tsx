"use client";

import * as React from "react";
import { Pencil, Plus, Trash2, CreditCard } from "lucide-react";

import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";

interface Plan {
  id: string;
  name: string;
  price: number;
  billingCycle: string;
  contactLimit: number;
  messageLimit: number;
  apiLimit: number;
  agentLimit: number;
  automationLimit: number;
  chatbotLimit: number;
  features: Record<string, boolean> | null;
  isActive: boolean;
}

const emptyPlan: Partial<Plan> = {
  name: "",
  price: 0,
  billingCycle: "MONTHLY",
  contactLimit: 100,
  messageLimit: 250,
  apiLimit: 1,
  agentLimit: 1,
  automationLimit: 1,
  chatbotLimit: 1,
  features: {},
};

export default function AdminPlansPage() {
  const [plans, setPlans] = React.useState<Plan[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingPlan, setEditingPlan] = React.useState<Plan | null>(null);
  const [form, setForm] = React.useState<Partial<Plan>>(emptyPlan);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    fetchPlans();
  }, []);

  function fetchPlans() {
    setLoading(true);
    fetch("/api/admin/plans")
      .then((r) => r.json())
      .then((body) => {
        if (body.success) setPlans(body.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  function openCreate() {
    setEditingPlan(null);
    setForm({ ...emptyPlan });
    setDialogOpen(true);
  }

  function openEdit(plan: Plan) {
    setEditingPlan(plan);
    setForm({ ...plan });
    setDialogOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const isEdit = !!editingPlan;
      const url = isEdit ? `/api/admin/plans/${editingPlan.id}` : "/api/admin/plans";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const body = await res.json();
      if (body.success) {
        toast({ title: "Success", description: `Plan ${isEdit ? "updated" : "created"}.` });
        setDialogOpen(false);
        fetchPlans();
      } else {
        toast({ title: "Error", description: body.error?.message || "Failed" });
      }
    } catch {
      toast({ title: "Error", description: "Request failed" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this plan?")) return;
    try {
      const res = await fetch(`/api/admin/plans/${id}`, { method: "DELETE" });
      const body = await res.json();
      if (body.success) {
        toast({ title: "Success", description: "Plan deleted." });
        fetchPlans();
      } else {
        toast({ title: "Error", description: body.error?.message || "Failed" });
      }
    } catch {
      toast({ title: "Error", description: "Request failed" });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Plans</h1>
          <p className="text-muted-foreground">
            Manage subscription plans and pricing.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="size-4" /> Create Plan
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !plans.length ? (
            <div className="flex flex-col items-center gap-2 py-12">
              <CreditCard className="size-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No plans created yet.</p>
              <Button size="sm" onClick={openCreate}>
                <Plus className="size-4" /> Create Plan
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead>Cycle</TableHead>
                  <TableHead className="text-right">Contacts</TableHead>
                  <TableHead className="text-right">Messages</TableHead>
                  <TableHead className="text-right">API Keys</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell className="font-medium">{plan.name}</TableCell>
                    <TableCell className="text-right">
                      ${Number(plan.price).toFixed(2)}
                    </TableCell>
                    <TableCell>{plan.billingCycle}</TableCell>
                    <TableCell className="text-right">
                      {plan.contactLimit === -1 ? "Unlimited" : plan.contactLimit.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {plan.messageLimit === -1 ? "Unlimited" : plan.messageLimit.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {plan.apiLimit === -1 ? "Unlimited" : plan.apiLimit}
                    </TableCell>
                    <TableCell>
                      {plan.isActive ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="size-8" onClick={() => openEdit(plan)}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="size-8 text-destructive" onClick={() => handleDelete(plan.id)}>
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingPlan ? "Edit Plan" : "Create Plan"}</DialogTitle>
            <DialogDescription>
              {editingPlan ? "Update plan details." : "Add a new subscription plan."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Name</Label>
              <Input
                value={form.name ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Plan name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Price ($)</Label>
                <Input
                  type="number"
                  value={form.price ?? 0}
                  onChange={(e) => setForm((f) => ({ ...f, price: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="grid gap-2">
                <Label>Billing Cycle</Label>
                <Select
                  value={form.billingCycle ?? "MONTHLY"}
                  onValueChange={(v) => setForm((f) => ({ ...f, billingCycle: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                    <SelectItem value="YEARLY">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>Contacts</Label>
                <Input
                  type="number"
                  value={form.contactLimit ?? 100}
                  onChange={(e) => setForm((f) => ({ ...f, contactLimit: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div className="grid gap-2">
                <Label>Messages</Label>
                <Input
                  type="number"
                  value={form.messageLimit ?? 250}
                  onChange={(e) => setForm((f) => ({ ...f, messageLimit: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div className="grid gap-2">
                <Label>API Keys</Label>
                <Input
                  type="number"
                  value={form.apiLimit ?? 1}
                  onChange={(e) => setForm((f) => ({ ...f, apiLimit: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>Agents</Label>
                <Input
                  type="number"
                  value={form.agentLimit ?? 1}
                  onChange={(e) => setForm((f) => ({ ...f, agentLimit: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div className="grid gap-2">
                <Label>Automations</Label>
                <Input
                  type="number"
                  value={form.automationLimit ?? 1}
                  onChange={(e) => setForm((f) => ({ ...f, automationLimit: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div className="grid gap-2">
                <Label>Chatbots</Label>
                <Input
                  type="number"
                  value={form.chatbotLimit ?? 1}
                  onChange={(e) => setForm((f) => ({ ...f, chatbotLimit: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : editingPlan ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
