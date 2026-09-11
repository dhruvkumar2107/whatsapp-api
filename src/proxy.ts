import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const protectedRoutes = [
  "/dashboard",
  "/admin",
  "/settings",
  "/inbox",
  "/contacts",
  "/campaigns",
  "/templates",
  "/chatbot",
  "/automation",
  "/whatsapp",
  "/analytics",
  "/billing",
  "/support",
  "/onboarding",
];

function isProtectedRoute(pathname: string): boolean {
  return protectedRoutes.some((route) => pathname.startsWith(route));
}

export const proxy = auth((req) => {
  const isLoggedIn = !!req.auth;
  const { nextUrl } = req;
  const origin = process.env.NEXTAUTH_URL || nextUrl.origin;
  const pathname = nextUrl.pathname;

  // Redirect unauthenticated users away from protected routes
  if (isProtectedRoute(pathname) && !isLoggedIn) {
    const loginUrl = new URL("/auth/login", origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Admin routes require SUPER_ADMIN role
  if (pathname.startsWith("/admin")) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/auth/login", origin));
    }
    if ((req.auth?.user?.role as string) !== "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", origin));
    }
    return;
  }

  // Redirect authenticated users away from auth pages
  if (pathname.startsWith("/auth") && isLoggedIn) {
    const role = req.auth?.user?.role as string;
    return NextResponse.redirect(
      new URL(role === "SUPER_ADMIN" ? "/admin" : "/dashboard", origin)
    );
  }
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/settings/:path*",
    "/inbox/:path*",
    "/contacts/:path*",
    "/campaigns/:path*",
    "/templates/:path*",
    "/chatbot/:path*",
    "/automation/:path*",
    "/whatsapp/:path*",
    "/analytics/:path*",
    "/billing/:path*",
    "/support/:path*",
    "/onboarding/:path*",
    "/auth/:path*",
  ],
};
