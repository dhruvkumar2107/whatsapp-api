import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const PASSWORD = 'mysmartcard123'

async function main() {
  console.log('[seed] Creating MySmartCard admin user...')

  const passwordHash = await bcrypt.hash(PASSWORD, 12)

  const user = await prisma.user.upsert({
    where: { email: 'mysmartcard@whatifys.com' },
    update: { name: 'MySmartCard Admin', passwordHash, emailVerified: new Date() },
    create: {
      name: 'MySmartCard Admin',
      email: 'mysmartcard@whatifys.com',
      passwordHash,
      emailVerified: new Date(),
    },
  })

  const workspace = await prisma.workspace.upsert({
    where: { slug: 'mysmartcard' },
    update: {},
    create: {
      name: 'MySmartCard',
      slug: 'mysmartcard',
      businessProfile: { type: 'mysmartcard' },
    },
  })

  await prisma.workspaceMember.upsert({
    where: { workspaceId_userId: { workspaceId: workspace.id, userId: user.id } },
    update: { role: 'OWNER' },
    create: { workspaceId: workspace.id, userId: user.id, role: 'OWNER' },
  })

  console.log(`[seed] MySmartCard admin ready:`)
  console.log(`[seed]   Email: mysmartcard@whatifys.com`)
  console.log(`[seed]   Password: ${PASSWORD}`)
  console.log(`[seed]   Role: OWNER`)
  console.log(`[seed]   Login at: https://whatifys.com/auth/login`)
  console.log(`[seed]   Dashboard at: https://whatifys.com/private/mysmartcard`)
}

main()
  .catch((e) => {
    console.error('[seed] Failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
