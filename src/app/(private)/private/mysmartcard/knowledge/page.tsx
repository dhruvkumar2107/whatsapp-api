"use client";

import * as React from "react";
import { BookOpen, Plus, Trash2, Save, Loader2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface KnowledgeDoc {
  id: string;
  title: string;
  content: string;
  sourceType: string;
  category: string;
  isActive: boolean;
}

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  product?: { name: string } | null;
}

interface Policy {
  id: string;
  type: string;
  title: string;
  content: string;
}

export default function MySmartCardKnowledgePage() {
  const [documents, setDocuments] = React.useState<KnowledgeDoc[]>([]);
  const [faqs, setFaqs] = React.useState<FAQ[]>([]);
  const [policies, setPolicies] = React.useState<Policy[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showAddDoc, setShowAddDoc] = React.useState(false);
  const [showAddFaq, setShowAddFaq] = React.useState(false);
  const [newDoc, setNewDoc] = React.useState({ title: "", content: "", category: "general" });
  const [newFaq, setNewFaq] = React.useState({ question: "", answer: "", category: "general" });
  const [saving, setSaving] = React.useState(false);

  const loadData = () => {
    fetch("/api/private/mysmartcard/knowledge")
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (body?.data) {
          setDocuments(body.data.documents || []);
          setFaqs(body.data.faqs || []);
          setPolicies(body.data.policies || []);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  React.useEffect(() => { loadData(); }, []);

  const handleAddDoc = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/private/mysmartcard/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "document", ...newDoc }),
      });
      if (res.ok) {
        toast({ title: "Document added" });
        setNewDoc({ title: "", content: "", category: "general" });
        setShowAddDoc(false);
        loadData();
      }
    } catch {
      toast({ title: "Failed to add document", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleAddFaq = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/private/mysmartcard/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "faq", ...newFaq }),
      });
      if (res.ok) {
        toast({ title: "FAQ added" });
        setNewFaq({ question: "", answer: "", category: "general" });
        setShowAddFaq(false);
        loadData();
      }
    } catch {
      toast({ title: "Failed to add FAQ", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDoc = async (id: string) => {
    try {
      await fetch(`/api/private/mysmartcard/knowledge/${id}`, { method: "DELETE" });
      loadData();
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
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Knowledge Base</h1>
        <p className="text-muted-foreground">Manage documents, FAQs, and policies for the AI agent.</p>
      </div>

      <Tabs defaultValue="documents">
        <TabsList>
          <TabsTrigger value="documents">Documents ({documents.length})</TabsTrigger>
          <TabsTrigger value="faqs">FAQs ({faqs.length})</TabsTrigger>
          <TabsTrigger value="policies">Policies ({policies.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowAddDoc(!showAddDoc)} size="sm">
              <Plus className="size-4 mr-2" /> Add Document
            </Button>
          </div>

          {showAddDoc && (
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input value={newDoc.title} onChange={(e) => setNewDoc({ ...newDoc, title: e.target.value })} placeholder="Document title" />
                </div>
                <div className="space-y-2">
                  <Label>Content</Label>
                  <Textarea value={newDoc.content} onChange={(e) => setNewDoc({ ...newDoc, content: e.target.value })} placeholder="Document content..." className="min-h-[150px]" />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleAddDoc} disabled={saving}>
                    {saving ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Save className="size-4 mr-2" />}
                    Save
                  </Button>
                  <Button variant="outline" onClick={() => setShowAddDoc(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {documents.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center">
                <BookOpen className="size-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No documents yet. Add your first knowledge document.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <Card key={doc.id}>
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0">
                        <h3 className="font-medium">{doc.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{doc.content}</p>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="secondary">{doc.category}</Badge>
                          <Badge variant="secondary">{doc.sourceType}</Badge>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteDoc(doc.id)}>
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="faqs" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowAddFaq(!showAddFaq)} size="sm">
              <Plus className="size-4 mr-2" /> Add FAQ
            </Button>
          </div>

          {showAddFaq && (
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label>Question</Label>
                  <Input value={newFaq.question} onChange={(e) => setNewFaq({ ...newFaq, question: e.target.value })} placeholder="What is an NFC card?" />
                </div>
                <div className="space-y-2">
                  <Label>Answer</Label>
                  <Textarea value={newFaq.answer} onChange={(e) => setNewFaq({ ...newFaq, answer: e.target.value })} placeholder="An NFC card is..." className="min-h-[100px]" />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleAddFaq} disabled={saving}>
                    {saving ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Save className="size-4 mr-2" />}
                    Save
                  </Button>
                  <Button variant="outline" onClick={() => setShowAddFaq(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {faqs.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center">
                <BookOpen className="size-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No FAQs yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {faqs.map((faq) => (
                <Card key={faq.id}>
                  <CardContent className="py-4">
                    <h3 className="font-medium">{faq.question}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{faq.answer}</p>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="secondary">{faq.category}</Badge>
                      {faq.product && <Badge variant="outline">{faq.product.name}</Badge>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="policies" className="space-y-4">
          {policies.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center">
                <BookOpen className="size-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No policies configured.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {policies.map((policy) => (
                <Card key={policy.id}>
                  <CardContent className="py-4">
                    <h3 className="font-medium">{policy.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{policy.content}</p>
                    <Badge variant="secondary" className="mt-2">{policy.type}</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
