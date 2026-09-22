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

const mySmartCardPageRoutes = ["/private/mysmartcard"];
const mySmartCardApiRoutes = ["/api/private/mysmartcard"];

function isProtectedRoute(pathname: string): boolean {
  return protectedRoutes.some((route) => pathname.startsWith(route));
}

function isMySmartCardRoute(pathname: string): boolean {
  return (
    mySmartCardPageRoutes.some((route) => pathname.startsWith(route)) ||
    mySmartCardApiRoutes.some((route) => pathname.startsWith(route))
  );
}

function getSessionUser(sessionToken: string | undefined): { role?: string } | null {
  if (!sessionToken) return null;
  try {
    const parts = sessionToken.split(".");
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
      return { role: payload.role };
    }
  } catch {}
  return null;
}

export default function proxy(request: NextRequest) {
  const { nextUrl } = request;
  const pathname = nextUrl.pathname;

  const sessionToken = request.cookies.get("next-auth.session-token")?.value
    || request.cookies.get("__Secure-next-auth.session-token")?.value;

  const isLoggedIn = !!sessionToken;

  if (isProtectedRoute(pathname) && !isLoggedIn) {
    const loginUrl = new URL("/auth/login", nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith("/admin") && !isLoggedIn) {
    return NextResponse.redirect(new URL("/auth/login", nextUrl.origin));
  }

  if (isMySmartCardRoute(pathname)) {
    if (!isLoggedIn) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { success: false, error: { message: "Authentication required", code: "UNAUTHORIZED" } },
          { status: 401 }
        );
      }
      const loginUrl = new URL("/auth/login", nextUrl.origin);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    const user = getSessionUser(sessionToken);
    const allowedRoles = ["SUPER_ADMIN", "OWNER", "ADMIN"];
    if (!user?.role || !allowedRoles.includes(user.role)) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { success: false, error: { message: "Insufficient permissions", code: "FORBIDDEN" } },
          { status: 403 }
        );
      }
      return NextResponse.redirect(new URL("/dashboard", nextUrl.origin));
    }
  }

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
    "/private/mysmartcard/:path*",
    "/api/private/mysmartcard/:path*",
  ],
};
