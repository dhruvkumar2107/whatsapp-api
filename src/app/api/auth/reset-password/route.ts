import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const { allowed, resetAt } = rateLimit(
    `reset-password:${ip}`,
    5,
    60_000
  );
  if (!allowed) {
    return NextResponse.json(
      {
        success: false,
        error: {
          message: "Too many requests. Please try again later.",
          code: "RATE_LIMIT_EXCEEDED",
        },
      },
      {
        status: 429,
        headers: {
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil(resetAt / 1000)),
        },
      }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: { message: "Invalid request body.", code: "INVALID_JSON" },
      },
      { status: 400 }
    );
  }

  const { token, password } = body as { token?: string; password?: string };

  if (!token || typeof token !== "string") {
    return NextResponse.json(
      {
        success: false,
        error: { message: "Token is required.", code: "TOKEN_REQUIRED" },
      },
      { status: 400 }
    );
  }

  if (
    !password ||
    typeof password !== "string" ||
    password.length < 8 ||
    password.length > 128
  ) {
    return NextResponse.json(
      {
        success: false,
        error: {
          message: "Password must be between 8 and 128 characters.",
          code: "INVALID_PASSWORD",
        },
      },
      { status: 400 }
    );
  }

  try {
    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token: hashedToken },
    });

    if (!resetToken) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: "Invalid or expired reset token.",
            code: "INVALID_TOKEN",
          },
        },
        { status: 400 }
      );
    }

    if (resetToken.expiresAt < new Date()) {
      // Delete expired token
      await prisma.passwordResetToken.delete({
        where: { id: resetToken.id },
      });
      return NextResponse.json(
        {
          success: false,
          error: {
            message: "Reset token has expired. Please request a new one.",
            code: "TOKEN_EXPIRED",
          },
        },
        { status: 400 }
      );
    }

    // Update the user's password
    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.delete({
        where: { id: resetToken.id },
      }),
    ]);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[RESET_PASSWORD]", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          message: "Something went wrong. Please try again.",
          code: "INTERNAL_ERROR",
        },
      },
      { status: 500 }
    );
  }
}
