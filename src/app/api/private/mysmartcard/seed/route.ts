import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'

export async function POST() {
  try {
    const passwordHash = await bcrypt.hash('password123', 12)

    const user = await prisma.user.upsert({
      where: { email: 'admin@whaatopro.com' },
      update: { passwordHash, emailVerified: new Date() },
      create: {
        name: 'Admin',
        email: 'admin@whaatopro.com',
        passwordHash,
        emailVerified: new Date(),
      },
    })

    let workspace = await prisma.workspace.findFirst({
      where: { members: { some: { userId: user.id } } },
    })

    if (!workspace) {
      workspace = await prisma.workspace.create({
        data: {
          name: 'MySmartCard',
          slug: 'mysmartcard-' + Date.now(),
        },
      })
    }

    await prisma.workspaceMember.upsert({
      where: { workspaceId_userId: { workspaceId: workspace.id, userId: user.id } },
      update: { role: 'OWNER' },
      create: { workspaceId: workspace.id, userId: user.id, role: 'OWNER' },
    })

    const mySmartCard = await prisma.mySmartCardWorkspace.findUnique({
      where: { workspaceId: workspace.id },
    })

    if (!mySmartCard) {
      const created = await prisma.mySmartCardWorkspace.create({
        data: {
          workspaceId: workspace.id,
          businessName: 'MySmartCard',
        },
      })

      await prisma.mySmartCardAIConfig.create({
        data: {
          workspaceId: created.id,
          agentName: 'MySmartCard Assistant',
          systemInstructions: 'You are the official MySmartCard WhatsApp assistant. Help customers with products, pricing, orders, and support. Be friendly and professional.',
          modelProvider: 'gemini',
          modelId: 'gemini-3.6-flash',
        },
      })
    }

    return NextResponse.json({
      success: true,
      credentials: {
        email: 'admin@whaatopro.com',
        password: 'password123',
      },
      dashboard: 'https://whatifys.com/private/mysmartcard',
    })
  } catch (error) {
    console.error('[Seed]', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
