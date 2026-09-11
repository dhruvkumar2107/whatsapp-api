'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Phone,
  Link2,
  Unlink,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Building2,
  Hash,
  Shield,
  Activity,
  MessageSquare,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge, type BadgeProps } from '@/components/ui/badge'

interface WhatsAppAccountInfo {
  id: string
  businessName: string
  phoneNumber: string
  phoneNumberId: string
  wabaId: string
  status: string
  qualityRating: string | null
  messagingLimit: number | null
  connectedAt: string | null
}

function getStatusConfig(status: string) {
  switch (status) {
    case 'CONNECTED':
      return {
        label: 'Connected',
        variant: 'success' as const,
        icon: CheckCircle,
        description: 'Your WhatsApp Business account is connected and ready to use.',
      }
    case 'DISCONNECTED':
      return {
        label: 'Disconnected',
        variant: 'destructive' as const,
        icon: XCircle,
        description: 'Your WhatsApp Business account is not connected.',
      }
    case 'CONNECTING':
      return {
        label: 'Connecting',
        variant: 'warning' as const,
        icon: Loader2,
        description: 'Connection in progress...',
      }
    case 'NEEDS_VERIFICATION':
      return {
        label: 'Needs Verification',
        variant: 'warning' as const,
        icon: AlertTriangle,
        description: 'Your account requires additional verification.',
      }
    case 'ERROR':
      return {
        label: 'Error',
        variant: 'destructive' as const,
        icon: XCircle,
        description: 'An error occurred with your connection.',
      }
    default:
      return {
        label: status,
        variant: 'secondary' as const,
        icon: AlertTriangle,
        description: 'Unknown status.',
      }
  }
}

function getQualityBadge(rating: string | null) {
  if (!rating) return null
  const map: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
    GREEN: { label: 'Green', variant: 'success' },
    YELLOW: { label: 'Yellow', variant: 'warning' },
    RED: { label: 'Red', variant: 'destructive' },
    UNKNOWN: { label: 'Unknown', variant: 'secondary' },
  }
  const config = map[rating.toUpperCase()] || map.UNKNOWN
  return <Badge variant={config.variant}>{config.label}</Badge>
}

export default function WhatsAppPage() {
  const [account, setAccount] = useState<WhatsAppAccountInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/whatsapp/status')
      const data = await response.json()

      if (data.success && data.data) {
        setAccount(data.data)
      } else {
        setAccount(null)
      }
    } catch {
      setError('Failed to fetch WhatsApp connection status.')
      setAccount(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  const handleConnect = async () => {
    try {
      setActionLoading(true)
      setError(null)
      const response = await fetch('/api/whatsapp/connect', { method: 'POST' })
      const data = await response.json()

      if (data.success && data.data?.url) {
        window.open(data.data.url, '_blank', 'width=600,height=700')
      } else {
        setError(data.error?.message || 'Failed to initiate connection.')
      }
    } catch {
      setError('Failed to initiate connection. Please try again.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDisconnect = async () => {
    if (!account) return
    try {
      setActionLoading(true)
      setError(null)
      const response = await fetch('/api/whatsapp/disconnect', { method: 'POST' })
      const data = await response.json()

      if (data.success) {
        setAccount(null)
      } else {
        setError(data.error?.message || 'Failed to disconnect.')
      }
    } catch {
      setError('Failed to disconnect. Please try again.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReconnect = async () => {
    if (!account) return
    try {
      setActionLoading(true)
      setError(null)

      await fetch('/api/whatsapp/disconnect', { method: 'POST' })

      const response = await fetch('/api/whatsapp/connect', { method: 'POST' })
      const data = await response.json()

      if (data.success && data.data?.url) {
        window.open(data.data.url, '_blank', 'width=600,height=700')
      } else {
        setError(data.error?.message || 'Failed to reconnect.')
      }
    } catch {
      setError('Failed to reconnect. Please try again.')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">WhatsApp</h1>
          <p className="text-muted-foreground">Manage your WhatsApp Business connection.</p>
        </div>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">WhatsApp</h1>
        <p className="text-muted-foreground">Manage your WhatsApp Business connection.</p>
      </div>

      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="flex items-center gap-3 p-4">
            <XCircle className="h-5 w-5 text-destructive shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {account ? (
        <ConnectedAccountView
          account={account}
          actionLoading={actionLoading}
          onDisconnect={handleDisconnect}
          onReconnect={handleReconnect}
        />
      ) : (
        <OnboardingView actionLoading={actionLoading} onConnect={handleConnect} />
      )}
    </div>
  )
}

function ConnectedAccountView({
  account,
  actionLoading,
  onDisconnect,
  onReconnect,
}: {
  account: WhatsAppAccountInfo
  actionLoading: boolean
  onDisconnect: () => void
  onReconnect: () => void
}) {
  const statusConfig = getStatusConfig(account.status)
  const StatusIcon = statusConfig.icon

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                <MessageSquare className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-lg">{account.businessName}</CardTitle>
                <CardDescription>{account.phoneNumber}</CardDescription>
              </div>
            </div>
            <Badge variant={statusConfig.variant}>
              <StatusIcon
                className={`mr-1 h-3 w-3 ${account.status === 'CONNECTING' ? 'animate-spin' : ''}`}
              />
              {statusConfig.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{statusConfig.description}</p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <InfoRow icon={Phone} label="Phone Number" value={account.phoneNumber} />
            <InfoRow icon={Hash} label="Phone Number ID" value={account.phoneNumberId} />
            <InfoRow icon={Building2} label="WABA ID" value={account.wabaId} />
            <InfoRow
              icon={Shield}
              label="Quality Rating"
              value={getQualityBadge(account.qualityRating)}
            />
            <InfoRow
              icon={Activity}
              label="Messaging Limit"
              value={
                account.messagingLimit
                  ? `${account.messagingLimit.toLocaleString()} messages / 24h`
                  : 'Unknown'
              }
            />
            <InfoRow
              icon={Link2}
              label="Connected Since"
              value={
                account.connectedAt
                  ? new Date(account.connectedAt).toLocaleDateString()
                  : 'Unknown'
              }
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={onReconnect}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Reconnect
            </Button>
            <Button
              variant="destructive"
              onClick={onDisconnect}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Unlink className="mr-2 h-4 w-4" />
              )}
              Disconnect
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function OnboardingView({
  actionLoading,
  onConnect,
}: {
  actionLoading: boolean
  onConnect: () => void
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-green-500/10 mb-6">
          <MessageSquare className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Connect your WhatsApp Business account</h2>
        <p className="text-muted-foreground max-w-md mb-8">
          Link your WhatsApp Business account to start sending and receiving messages,
          managing contacts, and running campaigns from this workspace.
        </p>
        <Button onClick={onConnect} disabled={actionLoading} size="lg">
          {actionLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Link2 className="mr-2 h-4 w-4" />
          )}
          Connect with Meta
        </Button>
        <p className="text-xs text-muted-foreground mt-4">
          You will be redirected to Facebook to authorize the connection.
        </p>
      </CardContent>
    </Card>
  )
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Phone
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border p-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="truncate text-sm font-medium">{value}</div>
      </div>
    </div>
  )
}
