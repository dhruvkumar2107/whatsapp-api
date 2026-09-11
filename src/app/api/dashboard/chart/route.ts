import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

interface DayBucket {
  date: string;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
}

function toLocalDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const workspaceId = session?.user?.workspaceId;

    if (!workspaceId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const rawDays = Number.parseInt(searchParams.get("days") ?? "30", 10);
    const days = Number.isNaN(rawDays) ? 30 : Math.min(90, Math.max(1, rawDays));

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (days - 1));

    const messages = await prisma.message.findMany({
      where: {
        conversation: { workspaceId },
        direction: "OUTBOUND",
        createdAt: { gte: start },
      },
      select: { createdAt: true, status: true },
      orderBy: { createdAt: "asc" },
    });

    const bucketMap = new Map<string, DayBucket>();
    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = toLocalDateKey(d);
      bucketMap.set(key, { date: key, sent: 0, delivered: 0, read: 0, failed: 0 });
    }

    for (const message of messages) {
      const key = toLocalDateKey(message.createdAt);
      const bucket = bucketMap.get(key);
      if (!bucket) continue;
      bucket.sent += 1;
      if (message.status === "DELIVERED" || message.status === "READ") {
        bucket.delivered += 1;
      }
      if (message.status === "READ") bucket.read += 1;
      if (message.status === "FAILED") bucket.failed += 1;
    }

    const data = Array.from(bucketMap.values());

    return NextResponse.json({ success: true, data, days });
  } catch (error) {
    console.error("Failed to fetch dashboard chart data:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}