import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validators";
import { slugify } from "@/lib/utils";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const { allowed, resetAt } = rateLimit(`register:${ip}`, 5, 60_000);
  if (!allowed) {
    return NextResponse.json(
      { success: false, error: { message: "Too many requests. Please try again later.", code: "RATE_LIMIT_EXCEEDED" } },
      { status: 429, headers: { "X-RateLimit-Remaining": "0", "X-RateLimit-Reset": String(Math.ceil(resetAt / 1000)) } }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          message: "Invalid request body.",
          code: "INVALID_JSON",
        },
      },
      { status: 400 }
    );
  }

  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    const errors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "_errors");
      if (!errors[key]) errors[key] = [];
      errors[key].push(issue.message);
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          message: "Please fix the errors below.",
          code: "VALIDATION_ERROR",
          errors,
        },
      },
      { status: 400 }
    );
  }

  const { name, email, password, workspaceName } = parsed.data;
  const normalizedEmail = email.toLowerCase();

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: "An account with this email already exists.",
            code: "EMAIL_TAKEN",
          },
        },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    let createdUserId: string | undefined;
    let createdWorkspaceId: string | undefined;

    try {
      const user = await prisma.user.create({
        data: {
          name,
          email: normalizedEmail,
          passwordHash,
        },
      });
      createdUserId = user.id;

      const baseSlug = slugify(workspaceName) || "workspace";
      let slug = baseSlug;
      let attempt = 1;
      while (
        await prisma.workspace.findUnique({
          where: { slug },
          select: { id: true },
        })
      ) {
        slug = `${baseSlug}-${attempt}`;
        attempt += 1;
      }

      const workspace = await prisma.workspace.create({
        data: {
          name: workspaceName,
          slug,
        },
      });
      createdWorkspaceId = workspace.id;

      await prisma.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId: user.id,
          role: "OWNER",
        },
      });

      return NextResponse.json(
        {
          success: true,
          data: {
            id: user.id,
            name: user.name,
            email: user.email,
            workspaceId: workspace.id,
            workspaceName: workspace.name,
          },
        },
        { status: 201 }
      );
    } catch (error) {
      if (createdWorkspaceId) {
        await prisma.workspace
          .delete({ where: { id: createdWorkspaceId } })
          .catch(() => undefined);
      }
      if (createdUserId) {
        await prisma.user
          .delete({ where: { id: createdUserId } })
          .catch(() => undefined);
      }
      throw error;
    }
  } catch (error) {
    console.error("[AUTH_REGISTER]", error);
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