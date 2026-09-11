"use client"

import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface PlanCardProps {
  name: string
  price: number
  billingCycle: string
  features: string[]
  isCurrent?: boolean
  onSelect?: () => void
  loading?: boolean
}

export function PlanCard({
  name,
  price,
  billingCycle,
  features,
  isCurrent = false,
  onSelect,
  loading = false,
}: PlanCardProps) {
  const isEnterprise = price === 0 && name.toUpperCase() === "ENTERPRISE"
  const cycleLabel = billingCycle === "MONTHLY" ? "/mo" : "/yr"

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl border bg-card p-6 shadow-sm transition-all",
        isCurrent && "ring-2 ring-primary shadow-md",
        !isCurrent && "hover:shadow-md"
      )}
    >
      {isCurrent && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 px-3">
          Current Plan
        </Badge>
      )}

      <div className="mt-2 text-center">
        <h3 className="text-lg font-semibold">{name}</h3>
        <div className="mt-3">
          <span className="text-4xl font-bold tracking-tight">
            {isEnterprise ? "Custom" : `$${price}`}
          </span>
          {!isEnterprise && (
            <span className="text-sm text-muted-foreground">{cycleLabel}</span>
          )}
        </div>
      </div>

      <div className="mt-6 flex-1">
        <ul className="space-y-3">
          {features.map((feature) => (
            <li key={feature} className="flex items-start gap-2.5 text-sm">
              <Check className="mt-0.5 size-4 shrink-0 text-emerald-500" />
              <span className="text-muted-foreground">{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-8">
        {isCurrent ? (
          <Button variant="outline" className="w-full" disabled>
            Current Plan
          </Button>
        ) : (
          <Button
            className="w-full"
            variant={isEnterprise ? "outline" : "default"}
            onClick={onSelect}
            disabled={loading}
          >
            {isEnterprise ? "Contact Sales" : "Select Plan"}
          </Button>
        )}
      </div>
    </div>
  )
}
