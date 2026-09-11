"use client"

import { cn } from "@/lib/utils"
import { Progress } from "@/components/ui/progress"

interface UsageCardProps {
  label: string
  used: number
  limit: number
  unit?: string
}

function getUsageColor(percentage: number) {
  if (percentage >= 90) return "text-red-600 dark:text-red-400"
  if (percentage >= 70) return "text-amber-600 dark:text-amber-400"
  return "text-emerald-600 dark:text-emerald-400"
}

function getProgressColor(percentage: number) {
  if (percentage >= 90) return "[&>div]:bg-red-500"
  if (percentage >= 70) return "[&>div]:bg-amber-500"
  return "[&>div]:bg-emerald-500"
}

export function UsageCard({ label, used, limit, unit }: UsageCardProps) {
  const isUnlimited = limit === -1
  const percentage = isUnlimited ? 0 : Math.min(100, Math.round((used / limit) * 100))
  const remaining = isUnlimited ? -1 : Math.max(0, limit - used)

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {!isUnlimited && (
          <p className={cn("text-xs font-semibold tabular-nums", getUsageColor(percentage))}>
            {percentage}%
          </p>
        )}
      </div>

      <div className="mt-3">
        {isUnlimited ? (
          <p className="text-2xl font-bold tracking-tight">
            {used.toLocaleString()}
            <span className="ml-1 text-sm font-normal text-muted-foreground">
              {unit || "used"}
            </span>
          </p>
        ) : (
          <>
            <p className="text-2xl font-bold tracking-tight tabular-nums">
              {used.toLocaleString()}
              <span className="text-base font-normal text-muted-foreground">
                {" "}
                / {limit.toLocaleString()}
              </span>
            </p>
            <Progress
              value={percentage}
              className={cn("mt-2 h-2", getProgressColor(percentage))}
            />
            <p className="mt-2 text-xs text-muted-foreground">
              {remaining.toLocaleString()} {unit || "remaining"}
            </p>
          </>
        )}
      </div>
    </div>
  )
}
