import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

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

export default function proxy(request: NextRequest) {
  const { nextUrl } = request;
  const pathname = nextUrl.pathname;

  // Check for session token cookie (set by NextAuth)
  const sessionToken = request.cookies.get("next-auth.session-token")?.value
    || request.cookies.get("__Secure-next-auth.session-token")?.value;

  const isLoggedIn = !!sessionToken;

  // Redirect unauthenticated users away from protected routes
  if (isProtectedRoute(pathname) && !isLoggedIn) {
    const loginUrl = new URL("/auth/login", nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Admin routes — we can only do a basic cookie check here.
  // Full role verification happens server-side in API routes and page loaders.
  // For a more robust check, decode the JWT from the session cookie.
  if (pathname.startsWith("/admin") && !isLoggedIn) {
    return NextResponse.redirect(new URL("/auth/login", nextUrl.origin));
  }

  // Redirect authenticated users away from auth pages
  if (pathname.startsWith("/auth") && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl.origin));
  }
}

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
