"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  CheckCircle2,
  ContactRound,
  Loader2,
  MessageSquareText,
  Phone,
  Rocket,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

const STEPS = [
  { title: "Business Details", description: "Tell us about your workspace" },
  { title: "Connect WhatsApp", description: "Link your WhatsApp Business account" },
  { title: "Create a Template", description: "Build your first message template" },
  { title: "Add Contacts", description: "Import your contact list" },
  { title: "You're ready!", description: "Launch your first campaign" },
];

export default function OnboardingPage() {
  const [step, setStep] = React.useState(1);
  const [workspaceName, setWorkspaceName] = React.useState("");
  const [loadingName, setLoadingName] = React.useState(false);

  const progress = ((step - 1) / (STEPS.length - 1)) * 100;

  const saveWorkspaceName = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingName(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceName }),
      });
      const body = (await res.json()) as { success: boolean; error?: { message?: string } };
      if (body.success) {
        setStep(2);
      } else {
        toast({ title: "Failed to save workspace", description: body.error?.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Something went wrong", variant: "destructive" });
    } finally {
      setLoadingName(false);
    }
  };

  const stepContent = (() => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold">Welcome to Whaatopro</h2>
              <p className="mt-2 text-sm text-zinc-500">
                Let&apos;s set up your workspace so you can start sending WhatsApp messages to your
                customers in minutes.
              </p>
            </div>
            <form onSubmit={saveWorkspaceName} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="workspace-name">Business / Workspace name</Label>
                <Input
                  id="workspace-name"
                  placeholder="Acme Corporation"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  required
                  minLength={2}
                  maxLength={100}
                />
                <p className="text-xs text-zinc-500">
                  This is the name shown across your workspace.
                </p>
              </div>
              <Button type="submit" disabled={loadingName || workspaceName.trim().length < 2}>
                {loadingName && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                Continue
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </form>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3 text-zinc-500">
              <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                <Phone className="size-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Connect WhatsApp</h2>
                <p className="text-sm">
                  Link your WhatsApp Business account to start sending and receiving messages.
                </p>
              </div>
            </div>
            <Button asChild variant="outline" className="w-full">
              <Link href="/whatsapp">Set up WhatsApp</Link>
            </Button>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3 text-zinc-500">
              <div className="flex size-10 items-center justify-center rounded-xl bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400">
                <MessageSquareText className="size-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Create a Template</h2>
                <p className="text-sm">
                  Templates are pre-approved messages you can send to customers at any time.
                </p>
              </div>
            </div>
            <Button asChild variant="outline" className="w-full">
              <Link href="/templates/new">Create your first template</Link>
            </Button>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3 text-zinc-500">
              <div className="flex size-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400">
                <ContactRound className="size-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Add Contacts</h2>
                <p className="text-sm">
                  Import your customer list or add contacts manually to your workspace.
                </p>
              </div>
            </div>
            <Button asChild variant="outline" className="w-full">
              <Link href="/contacts">Add contacts</Link>
            </Button>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex size-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                <CheckCircle2 className="size-8" />
              </div>
              <div>
                <h2 className="text-xl font-bold">You&apos;re all set!</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Your workspace is ready. Head to the dashboard to start building campaigns,
                  chatbots, and automations.
                </p>
              </div>
            </div>
            <Button asChild className="w-full">
              <Link href="/dashboard">
                <Rocket className="mr-1.5 h-4 w-4" />
                Go to Dashboard
              </Link>
            </Button>
          </div>
        );

      default:
        return null;
    }
  })();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 py-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm shadow-emerald-500/20">
            <Bot className="size-5" />
          </div>
          <div>
            <p className="text-sm font-bold tracking-tight">Whaatopro Setup</p>
            <p className="text-xs text-zinc-500">Step {step} of {STEPS.length}</p>
          </div>
        </div>
        <Progress value={progress} className="w-32 sm:w-48" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            {STEPS[step - 1]?.title}
          </CardTitle>
          <CardDescription>{STEPS[step - 1]?.description}</CardDescription>
        </CardHeader>
        <CardContent>{stepContent}</CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          disabled={step <= 1}
          onClick={() => setStep((s) => Math.max(1, s - 1))}
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back
        </Button>

        {step >= 2 && step <= 4 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStep((s) => Math.min(STEPS.length, s + 1))}
          >
            Skip for now
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        )}

        {step >= 2 && step <= 4 && (
          <Button size="sm" onClick={() => setStep((s) => Math.min(STEPS.length, s + 1))}>
            Continue
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="flex items-center justify-center gap-2">
        {STEPS.map((s, i) => (
          <button
            key={s.title}
            type="button"
            aria-label={s.title}
            onClick={() => setStep(i + 1)}
            className={cn(
              "h-1.5 rounded-full transition-all",
              i + 1 === step ? "w-6 bg-primary" : "w-3 bg-muted-foreground/20"
            )}
          />
        ))}
      </div>
    </div>
  );
}