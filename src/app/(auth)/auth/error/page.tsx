import Link from "next/link";
import { AlertTriangle, MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";

const ERROR_MESSAGES: Record<string, string> = {
  Configuration:
    "There is a problem with the server configuration. Please contact support.",
  AccessDenied: "You do not have permission to access this resource.",
  Verification: "The verification link is invalid or has expired.",
  CredentialsSignin:
    "Sign in failed. Check your email and password and try again.",
  Default: "An unexpected error occurred. Please try again.",
};

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const key = error && ERROR_MESSAGES[error] ? error : "Default";
  const message = ERROR_MESSAGES[key];

  return (
    <div className="w-full">
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 shadow-lg shadow-emerald-500/30 ring-1 ring-white/20">
          <MessageCircle className="h-7 w-7 text-white" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white">WHAATOPRO</h1>
        <p className="mt-2 text-sm text-emerald-100/60">Authentication</p>
      </div>

      <Card className="rounded-2xl border-white/10 bg-white/95 shadow-2xl shadow-black/40 backdrop-blur">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
            <AlertTriangle className="h-6 w-6 text-amber-600" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900">Sign in error</h2>
          <p className="text-sm text-slate-500">{message}</p>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button
            asChild
            size="lg"
            className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/25 transition-all hover:from-emerald-700 hover:to-teal-700"
          >
            <Link href="/auth/login">Back to sign in</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="w-full border-slate-300 bg-transparent text-slate-700 transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
          >
            <Link href="/">Go to homepage</Link>
          </Button>
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-xs text-slate-400">
            Still having trouble? Contact our support team.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}