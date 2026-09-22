const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  console.log('[seed] Connecting to database...')

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
  console.log('[seed] User:', user.email)

  const workspace = await prisma.workspace.upsert({
    where: { slug: 'mysmartcard-admin' },
    update: {},
    create: {
      name: 'MySmartCard Admin',
      slug: 'mysmartcard-admin',
    },
  })

  await prisma.workspaceMember.upsert({
    where: { workspaceId_userId: { workspaceId: workspace.id, userId: user.id } },
    update: { role: 'OWNER' },
    create: { workspaceId: workspace.id, userId: user.id, role: 'OWNER' },
  })
  console.log('[seed] Workspace + membership created')

  const existing = await prisma.mySmartCardWorkspace.findUnique({ where: { workspaceId: workspace.id } })
  if (!existing) {
    await prisma.mySmartCardWorkspace.create({
      data: {
        workspaceId: workspace.id,
        businessName: 'MySmartCard',
      },
    })
    await prisma.mySmartCardAIConfig.create({
      data: {
        workspaceId: workspace.id,
        agentName: 'MySmartCard Assistant',
        systemInstructions: 'You are the official MySmartCard WhatsApp assistant. Help customers with products, pricing, orders, and support. Be friendly and professional.',
        modelProvider: 'gemini',
        modelId: 'gemini-2.0-flash',
      },
    })
    console.log('[seed] MySmartCard workspace + AI config created')
  } else {
    console.log('[seed] MySmartCard workspace already exists')
  }

  console.log('[seed] DONE - Login with: admin@whaatopro.com / password123')
}

main()
  .catch((e) => { console.error('[seed] FAILED:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
