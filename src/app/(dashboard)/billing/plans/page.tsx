"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { PlanCard } from "@/components/billing/plan-card"

interface Plan {
  id: string
  name: string
  price: number
  billingCycle: string
  contactLimit: number
  messageLimit: number
  apiLimit: number
  agentLimit: number
  automationLimit: number
  chatbotLimit: number
  features: string[] | null
}

interface SubscriptionData {
  id: string
  planId: string
  plan: { id: string; name: string }
}

interface ApiResponse<T> {
  success: boolean
  data: T
}

const PLAN_ORDER = ["FREE", "STARTER", "BUSINESS", "ENTERPRISE"]

function getDefaultFeatures(plan: Plan): string[] {
  const features: string[] = []
  features.push(`${plan.contactLimit === -1 ? "Unlimited" : plan.contactLimit.toLocaleString()} contacts`)
  features.push(`${plan.messageLimit === -1 ? "Unlimited" : plan.messageLimit.toLocaleString()} messages/day`)
  features.push(`${plan.automationLimit === -1 ? "Unlimited" : plan.automationLimit} automations`)
  features.push(`${plan.chatbotLimit === -1 ? "Unlimited" : plan.chatbotLimit} chatbots`)
  features.push(`${plan.agentLimit === -1 ? "Unlimited" : plan.agentLimit} team members`)
  features.push(`${plan.apiLimit === -1 ? "Unlimited" : plan.apiLimit} API keys`)
  return features
}

const COMPARISON_ROWS = [
  { label: "Contacts", get: (p: Plan) => p.contactLimit === -1 ? "Unlimited" : p.contactLimit.toLocaleString() },
  { label: "Messages/Day", get: (p: Plan) => p.messageLimit === -1 ? "Unlimited" : p.messageLimit.toLocaleString() },
  { label: "Team Members", get: (p: Plan) => p.agentLimit === -1 ? "Unlimited" : p.agentLimit.toLocaleString() },
  { label: "Automations", get: (p: Plan) => p.automationLimit === -1 ? "Unlimited" : p.automationLimit.toLocaleString() },
  { label: "Chatbots", get: (p: Plan) => p.chatbotLimit === -1 ? "Unlimited" : p.chatbotLimit.toLocaleString() },
  { label: "API Keys", get: (p: Plan) => p.apiLimit === -1 ? "Unlimited" : p.apiLimit.toLocaleString() },
]

export default function PlansPage() {
  const [plans, setPlans] = React.useState<Plan[]>([])
  const [subscription, setSubscription] = React.useState<SubscriptionData | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [selectingPlan, setSelectingPlan] = React.useState<string | null>(null)

  React.useEffect(() => {
    Promise.all([
      fetch("/api/billing/plans").then((r) => r.json()),
      fetch("/api/billing/subscription").then((r) => r.json()),
    ])
      .then(([plansBody, subBody]: [ApiResponse<Plan[]>, ApiResponse<SubscriptionData | null>]) => {
        if (plansBody.success) {
          const sorted = [...plansBody.data].sort((a, b) => {
            const aIdx = PLAN_ORDER.indexOf(a.name.toUpperCase())
            const bIdx = PLAN_ORDER.indexOf(b.name.toUpperCase())
            return (aIdx === -1 ? 99 : aIdx) - (bIdx === -1 ? 99 : bIdx)
          })
          setPlans(sorted)
        }
        if (subBody.success) setSubscription(subBody.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleSelectPlan = async (planId: string) => {
    setSelectingPlan(planId)
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      })
      const body = await res.json()
      if (body.success && body.data?.checkoutUrl) {
        window.location.assign(body.data.checkoutUrl)
      } else {
        window.location.reload()
      }
    } catch {
      setSelectingPlan(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Plans & Pricing
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose the plan that fits your business needs.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <div className="space-y-4 p-6">
                <Skeleton className="h-5 w-20 mx-auto" />
                <Skeleton className="h-10 w-24 mx-auto" />
                <div className="space-y-2 pt-4">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Skeleton key={j} className="h-4 w-full" />
                  ))}
                </div>
                <Skeleton className="h-9 w-full mt-4" />
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              name={plan.name}
              price={plan.price}
              billingCycle={plan.billingCycle}
              features={plan.features || getDefaultFeatures(plan)}
              isCurrent={subscription?.planId === plan.id}
              onSelect={() => handleSelectPlan(plan.id)}
              loading={selectingPlan === plan.id}
            />
          ))}
        </div>
      )}

      {!loading && plans.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Feature Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="pb-3 pr-4 text-left font-medium text-muted-foreground">
                      Feature
                    </th>
                    {plans.map((plan) => (
                      <th
                        key={plan.id}
                        className="pb-3 px-4 text-center font-medium"
                      >
                        {plan.name}
                        {subscription?.planId === plan.id && (
                          <Badge variant="default" className="ml-2 text-[10px]">
                            Current
                          </Badge>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_ROWS.map((row) => (
                    <tr key={row.label} className="border-b last:border-0">
                      <td className="py-3 pr-4 font-medium text-muted-foreground">
                        {row.label}
                      </td>
                      {plans.map((plan) => (
                        <td key={plan.id} className="py-3 px-4 text-center tabular-nums">
                          {row.get(plan)}
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr className="border-b last:border-0">
                    <td className="py-3 pr-4 font-medium text-muted-foreground">
                      Price
                    </td>
                    {plans.map((plan) => (
                      <td key={plan.id} className="py-3 px-4 text-center font-semibold">
                        {plan.price === 0 && plan.name.toUpperCase() === "ENTERPRISE"
                          ? "Custom"
                          : `$${plan.price}`}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
