import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const proxy = auth((req) => {
  const isLoggedIn = !!req.auth;
  const { nextUrl } = req;
  const origin = process.env.NEXTAUTH_URL || nextUrl.origin;

  if (nextUrl.pathname.startsWith("/dashboard")) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/auth/login", origin));
    }
    return;
  }

  if (nextUrl.pathname.startsWith("/admin")) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/auth/login", origin));
    }
    if ((req.auth?.user?.role as string) !== "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", origin));
    }
    return;
  }

  if (nextUrl.pathname.startsWith("/auth") && isLoggedIn) {
    const role = req.auth?.user?.role as string;
    return NextResponse.redirect(
      new URL(role === "SUPER_ADMIN" ? "/admin" : "/dashboard", origin)
    );
  }
});

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/auth/:path*"],
};