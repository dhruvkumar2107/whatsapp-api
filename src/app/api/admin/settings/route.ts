import { NextRequest } from 'next/server'
import { requireSuperAdmin } from '@/lib/admin'
import { successResponse, errorResponse } from '@/lib/api-utils'
import fs from 'fs/promises'
import path from 'path'

const SETTINGS_FILE = path.join(process.cwd(), '.admin-settings.json')

interface AdminSettings {
  platformName: string
  supportEmail: string
  timezone: string
  maintenanceMode: boolean
  registrationOpen: boolean
  whatsappAppId: string
  rateLimit: number
  webhookTimeout: number
  emailEnabled: boolean
  emailHost: string
  emailPort: number
  features: {
    chatbotEnabled: boolean
    automationEnabled: boolean
    campaignsEnabled: boolean
    apiAccessEnabled: boolean
  }
}

const DEFAULTS: AdminSettings = {
  platformName: 'WHAATOPRO',
  supportEmail: '',
  timezone: 'UTC',
  maintenanceMode: false,
  registrationOpen: true,
  whatsappAppId: '',
  rateLimit: 60,
  webhookTimeout: 30,
  emailEnabled: false,
  emailHost: '',
  emailPort: 587,
  features: {
    chatbotEnabled: true,
    automationEnabled: true,
    campaignsEnabled: true,
    apiAccessEnabled: true,
  },
}

async function readSettings(): Promise<AdminSettings> {
  try {
    const data = await fs.readFile(SETTINGS_FILE, 'utf-8')
    return { ...DEFAULTS, ...JSON.parse(data) }
  } catch {
    return DEFAULTS
  }
}

async function writeSettings(settings: AdminSettings): Promise<void> {
  await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2))
}

export async function GET() {
  try {
    await requireSuperAdmin()
    const settings = await readSettings()
    return successResponse(settings)
  } catch (error) {
    return errorResponse(error)
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireSuperAdmin()
    const body = await request.json()
    const current = await readSettings()
    const updated = { ...current, ...body }
    await writeSettings(updated)
    return successResponse(updated)
  } catch (error) {
    return errorResponse(error)
  }
}
