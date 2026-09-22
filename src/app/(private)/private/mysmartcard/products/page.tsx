"use client";

import * as React from "react";
import { Package, Plus, Pencil, Trash2, Loader2, Save } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  discountedPrice: number | null;
  isAvailable: boolean;
  sortOrder: number;
  _count: { faqs: number; leads: number };
}

export default function MySmartCardProductsPage() {
  const [products, setProducts] = React.useState<Product[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showAdd, setShowAdd] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({ name: "", description: "", price: "", discountedPrice: "", purchaseUrl: "", isAvailable: true });
  const [saving, setSaving] = React.useState(false);

  const loadProducts = () => {
    fetch("/api/private/mysmartcard/products")
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => { if (body?.data) setProducts(body.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  React.useEffect(() => { loadProducts(); }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const url = editingId ? `/api/private/mysmartcard/products/${editingId}` : "/api/private/mysmartcard/products";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          price: parseFloat(form.price) || 0,
          discountedPrice: form.discountedPrice ? parseFloat(form.discountedPrice) : null,
          purchaseUrl: form.purchaseUrl,
          isAvailable: form.isAvailable,
        }),
      });
      if (res.ok) {
        toast({ title: editingId ? "Product updated" : "Product created" });
        setShowAdd(false);
        setEditingId(null);
        setForm({ name: "", description: "", price: "", discountedPrice: "", purchaseUrl: "", isAvailable: true });
        loadProducts();
      }
    } catch {
      toast({ title: "Failed to save product", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingId(product.id);
    setForm({
      name: product.name,
      description: product.description,
      price: String(product.price),
      discountedPrice: product.discountedPrice ? String(product.discountedPrice) : "",
      purchaseUrl: "",
      isAvailable: product.isAvailable,
    });
    setShowAdd(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    try {
      await fetch(`/api/private/mysmartcard/products/${id}`, { method: "DELETE" });
      loadProducts();
    } catch {}
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="size-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Products</h1>
          <p className="text-muted-foreground">Manage MySmartCard products for AI responses.</p>
        </div>
        <Button onClick={() => { setShowAdd(!showAdd); setEditingId(null); setForm({ name: "", description: "", price: "", discountedPrice: "", purchaseUrl: "", isAvailable: true }); }}>
          <Plus className="size-4 mr-2" /> Add Product
        </Button>
      </div>

      {showAdd && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? "Edit Product" : "New Product"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Product Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="NFC Smart Card" />
              </div>
              <div className="space-y-2">
                <Label>Price</Label>
                <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="29.99" />
              </div>
              <div className="space-y-2">
                <Label>Discounted Price (optional)</Label>
                <Input type="number" value={form.discountedPrice} onChange={(e) => setForm({ ...form, discountedPrice: e.target.value })} placeholder="19.99" />
              </div>
              <div className="space-y-2">
                <Label>Purchase URL</Label>
                <Input value={form.purchaseUrl} onChange={(e) => setForm({ ...form, purchaseUrl: e.target.value })} placeholder="https://..." />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Product description..." className="min-h-[100px]" />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Save className="size-4 mr-2" />}
                {editingId ? "Update" : "Create"}
              </Button>
              <Button variant="outline" onClick={() => { setShowAdd(false); setEditingId(null); }}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {products.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <Package className="size-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No products yet. Add your first product.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <Card key={product.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <h3 className="font-semibold">{product.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{product.description || "No description"}</p>
                    <div className="flex items-center gap-2 mt-3">
                      {product.discountedPrice ? (
                        <>
                          <span className="text-lg font-bold">${product.discountedPrice}</span>
                          <span className="text-sm text-muted-foreground line-through">${product.price}</span>
                        </>
                      ) : (
                        <span className="text-lg font-bold">${product.price}</span>
                      )}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Badge variant={product.isAvailable ? "default" : "secondary"}>
                        {product.isAvailable ? "Available" : "Unavailable"}
                      </Badge>
                      <Badge variant="outline">{product._count.leads} leads</Badge>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(product)}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(product.id)}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
