import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import { auth } from "@/lib/auth";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "WHAATOPRO - WhatsApp API. Automation. CRM. All in One.",
  description:
    "WHAATOPRO is the all-in-one WhatsApp platform for teams. Send and automate WhatsApp messages, manage contacts, run campaigns and build chatbots with the WhatsApp Business API.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        <SessionProvider session={session}>
          <TooltipProvider delayDuration={300}>{children}</TooltipProvider>
        </SessionProvider>
        <Toaster />
      </body>
    </html>
  );
}