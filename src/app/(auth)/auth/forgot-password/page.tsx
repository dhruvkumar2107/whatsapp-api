"use client";

import Image from "next/image";
import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, LoaderCircle, Mail, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [isPending, setIsPending] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: ForgotPasswordInput) {
    setIsPending(true);
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: values.email }),
      });
      setSubmitted(true);
    } catch {
      setSubmitted(true);
    } finally {
      setIsPending(false);
    }
  }

  if (submitted) {
    return (
      <div className="w-full">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 overflow-hidden rounded-2xl shadow-lg shadow-emerald-500/30 ring-1 ring-white/20">
            <Image
              src="/logo.png"
              alt="WHAATOPRO"
              width={56}
              height={56}
              className="h-14 w-14 object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            WHAATOPRO
          </h1>
        </div>

        <Card className="rounded-2xl border-white/10 bg-white/95 shadow-2xl shadow-black/40 backdrop-blur">
          <CardHeader className="items-center text-center">
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900">Check your email</h2>
            <p className="text-sm text-slate-500">
              If an account exists with that email, we&apos;ve sent a password reset link. The link expires in 1 hour.
            </p>
          </CardHeader>
          <CardContent className="flex justify-center pt-4">
            <Button
              asChild
              variant="outline"
              size="lg"
              className="w-full border-slate-300 bg-transparent text-slate-700 transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
            >
              <Link href="/auth/login">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to login
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="mb-4 overflow-hidden rounded-2xl shadow-lg shadow-emerald-500/30 ring-1 ring-white/20">
          <Image
            src="/logo.png"
            alt="WHAATOPRO"
            width={56}
            height={56}
            className="h-14 w-14 object-contain"
          />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white">
          WHAATOPRO
        </h1>
        <p className="mt-2 text-sm text-emerald-100/60">
          Reset your password
        </p>
      </div>

      <Card className="rounded-2xl border-white/10 bg-white/95 shadow-2xl shadow-black/40 backdrop-blur">
        <CardHeader>
          <h2 className="text-xl font-semibold text-slate-900">Forgot password?</h2>
          <p className="text-sm text-slate-500">
            Enter your email address and we&apos;ll send you a link to reset your password.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-700">
                Email
              </Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  className="h-11 pl-10"
                  error={!!errors.email}
                  disabled={isPending}
                  {...register("email")}
                />
              </div>
              {errors.email && (
                <p className="text-xs font-medium text-red-600">
                  {errors.email.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={isPending}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/25 transition-all hover:from-emerald-700 hover:to-teal-700 disabled:opacity-60"
            >
              {isPending ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send reset link"
              )}
            </Button>

            <div className="flex justify-center">
              <Link
                href="/auth/login"
                className="flex items-center gap-1 text-sm text-slate-500 transition-colors hover:text-emerald-600"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to login
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
