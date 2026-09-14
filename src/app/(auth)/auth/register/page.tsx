"use client";

import Image from "next/image";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowRight,
  Building2,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Mail,
  User,
} from "lucide-react";

import { registerSchema, type RegisterInput } from "@/lib/validators";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [isPending, setIsPending] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      workspaceName: "",
    },
  });

  async function onSubmit(values: RegisterInput) {
    setServerError(null);
    setIsPending(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const json: {
        success: boolean;
        error?: { message: string };
      } = await response.json();

      if (!response.ok || !json.success) {
        setServerError(json.error?.message ?? "Something went wrong. Please try again.");
        return;
      }

      toast({
        title: "Account created",
        description: "You can now sign in with your new credentials.",
        variant: "default",
      });

      router.push("/auth/login");
      router.refresh();
    } catch {
      setServerError("Network error. Please check your connection and try again.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="w-full">
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-lg ring-1 ring-black/5">
          <Image
            src="/logo.png"
            alt="WHAATOPRO"
            width={48}
            height={48}
            className="h-12 w-12 object-contain"
          />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white">
          WHAATOPRO
        </h1>
        <p className="mt-2 text-sm text-emerald-100/60">
          Start your free workspace in minutes
        </p>
      </div>

      <Card className="rounded-2xl border-white/10 bg-white/95 shadow-2xl shadow-black/40 backdrop-blur">
        <CardHeader>
          <h2 className="text-xl font-semibold text-slate-900">Create your account</h2>
          <p className="text-sm text-slate-500">
            We&apos;ll create a workspace and get you signed up in no time.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            <div className="space-y-2">
              <Label htmlFor="name" className="text-slate-700">
                Full name
              </Label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="name"
                  type="text"
                  autoComplete="name"
                  placeholder="Jane Doe"
                  className="h-11 pl-10"
                  error={!!errors.name}
                  disabled={isPending}
                  {...register("name")}
                />
              </div>
              {errors.name && (
                <p className="text-xs font-medium text-red-600">{errors.name.message}</p>
              )}
            </div>

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
                <p className="text-xs font-medium text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-700">
                Password
              </Label>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  className="h-11 pl-10 pr-10"
                  error={!!errors.password}
                  disabled={isPending}
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition-colors hover:text-slate-600"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs font-medium text-red-600">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-slate-700">
                Confirm password
              </Label>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Re-enter your password"
                  className="h-11 pl-10 pr-10"
                  error={!!errors.confirmPassword}
                  disabled={isPending}
                  {...register("confirmPassword")}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition-colors hover:text-slate-600"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-xs font-medium text-red-600">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="workspaceName" className="text-slate-700">
                Workspace / business name
              </Label>
              <div className="relative">
                <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="workspaceName"
                  type="text"
                  autoComplete="organization"
                  placeholder="Acme Inc."
                  className="h-11 pl-10"
                  error={!!errors.workspaceName}
                  disabled={isPending}
                  {...register("workspaceName")}
                />
              </div>
              {errors.workspaceName && (
                <p className="text-xs font-medium text-red-600">
                  {errors.workspaceName.message}
                </p>
              )}
            </div>

            {serverError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700">
                {serverError}
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              disabled={isPending}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/25 transition-all hover:from-emerald-700 hover:to-teal-700 disabled:opacity-60"
            >
              {isPending ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                <>
                  Create account
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex-col gap-4 pt-2">
          <div className="flex w-full items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Already registered?
            </span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="w-full border-slate-300 bg-transparent text-slate-700 transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
          >
            <Link href="/auth/login">Sign in instead</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}