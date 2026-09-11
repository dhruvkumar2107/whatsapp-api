import type { Metadata } from "next";
import { ToastProvider, Toaster } from "@/components/ui/toast";

export const metadata: Metadata = {
  title: {
    default: "WHAATOPRO",
    template: "%s | WHAATOPRO",
  },
  description: "Sign in to your WHAATOPRO account.",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <div className="relative flex min-h-svh w-full flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-emerald-950 via-teal-950 to-cyan-950 px-4 py-12">
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute -left-32 -top-32 h-96 w-96 animate-pulse rounded-full bg-emerald-500/20 blur-3xl" />
          <div className="absolute -bottom-40 -right-32 h-[28rem] w-[28rem] rounded-full bg-teal-400/15 blur-3xl" />
          <div className="absolute left-1/2 top-1/3 h-64 w-64 -translate-x-1/2 rounded-full bg-cyan-400/10 blur-3xl" />
        </div>
        <div className="relative z-10 w-full max-w-md">{children}</div>
        <p className="relative z-10 mt-8 text-center text-xs text-emerald-100/40">
          &copy; {new Date().getFullYear()} WHAATOPRO. All rights reserved.
        </p>
      </div>
      <Toaster />
    </ToastProvider>
  );
}