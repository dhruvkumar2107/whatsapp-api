"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"

interface AgentData {
  agent: {
    id: string
    name: string | null
    email: string
    image: string | null
  }
  stats: {
    totalMessages: number
    outboundMessages: number
    conversationsHandled: number
    avgResponseTimeMs: number
  }
}

interface ApiResponse<T> {
  success: boolean
  data: T
}

export default function AgentsPage() {
  const [agents, setAgents] = React.useState<AgentData[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    fetch("/api/analytics/agents?days=30")
      .then((r) => r.json())
      .then((body: ApiResponse<{ agents: AgentData[] }>) => {
        if (body.success) setAgents(body.data.agents || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Agent Management</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Performance overview of your workspace agents.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Agent Performance (Last 30 Days)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : agents.length === 0 ? (
            <div className="p-8 text-center text-sm text-zinc-500">
              No agents found. Add team members with AGENT, MANAGER, or ADMIN roles.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Agent</TableHead>
                    <TableHead className="text-right">Conversations</TableHead>
                    <TableHead className="text-right">Messages</TableHead>
                    <TableHead className="text-right">Outbound</TableHead>
                    <TableHead className="text-right">Avg Response</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agents.map((entry) => (
                    <TableRow key={entry.agent.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="size-8">
                            <AvatarFallback>
                              {(entry.agent.name || entry.agent.email)[0]?.toUpperCase() || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {entry.agent.name || entry.agent.email}
                            </p>
                            <p className="truncate text-xs text-zinc-500">{entry.agent.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{entry.stats.conversationsHandled}</TableCell>
                      <TableCell className="text-right">{entry.stats.totalMessages}</TableCell>
                      <TableCell className="text-right">{entry.stats.outboundMessages}</TableCell>
                      <TableCell className="text-right">
                        {entry.stats.avgResponseTimeMs
                          ? `${Math.round(entry.stats.avgResponseTimeMs / 60000)}m`
                          : "N/A"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
