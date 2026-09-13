import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { sendEmail, renderPasswordResetEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const { allowed, resetAt } = await rateLimit(
    `forgot-password:${ip}`,
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

  const { email } = body as { email?: string };

  if (!email || typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json(
      {
        success: true,
        message:
          "If an account exists with that email, a reset link has been sent.",
      },
      { status: 200 }
    );
  }

  const normalizedEmail = email.toLowerCase();

  try {
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true },
    });

    if (user) {
      // Delete any existing tokens for this user
      await prisma.passwordResetToken.deleteMany({
        where: { userId: user.id },
      });

      // Generate a random token
      const rawToken = crypto.randomBytes(32).toString("hex");
      const hashedToken = crypto
        .createHash("sha256")
        .update(rawToken)
        .digest("hex");

      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          token: hashedToken,
          expiresAt,
        },
      });

      // Send email with reset link
      const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/auth/reset-password?token=${rawToken}`;
      const emailContent = renderPasswordResetEmail(resetUrl);
      await sendEmail({ ...emailContent, to: user.email });
    }
  } catch (error) {
    console.error("[FORGOT_PASSWORD]", error);
  }

  // Always return the same response to prevent user enumeration
  return NextResponse.json(
    {
      success: true,
      message:
        "If an account exists with that email, a reset link has been sent.",
    },
    { status: 200 }
  );
}
