import { Prisma } from '@prisma/client'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'

const DEMO_PASSWORD = 'password123'

interface PlanSeed {
  name: string
  price: number
  contactLimit: number
  messageLimit: number
  apiLimit: number
  agentLimit: number
  automationLimit: number
  chatbotLimit: number
}

const PLANS: PlanSeed[] = [
  {
    name: 'Free',
    price: 0,
    contactLimit: 100,
    messageLimit: 250,
    apiLimit: 1,
    agentLimit: 2,
    automationLimit: 1,
    chatbotLimit: 1,
  },
  {
    name: 'Starter',
    price: 29,
    contactLimit: 5000,
    messageLimit: 5000,
    apiLimit: 5,
    agentLimit: 5,
    automationLimit: 10,
    chatbotLimit: 3,
  },
  {
    name: 'Pro',
    price: 79,
    contactLimit: 20000,
    messageLimit: 25000,
    apiLimit: 10,
    agentLimit: 15,
    automationLimit: 25,
    chatbotLimit: 5,
  },
  {
    name: 'Business',
    price: 199,
    contactLimit: 50000,
    messageLimit: 50000,
    apiLimit: 20,
    agentLimit: 25,
    automationLimit: 50,
    chatbotLimit: 10,
  },
  {
    name: 'Enterprise',
    price: 499,
    contactLimit: -1,
    messageLimit: -1,
    apiLimit: -1,
    agentLimit: -1,
    automationLimit: -1,
    chatbotLimit: -1,
  },
]

const TAG_SEEDS = [
  { name: 'VIP', color: '#f59e0b' },
  { name: 'Lead', color: '#10b981' },
  { name: 'Support', color: '#3b82f6' },
  { name: 'Sales', color: '#8b5cf6' },
  { name: 'Marketing', color: '#ec4899' },
]

interface ContactSeed {
  name: string
  phone: string
  email: string
  country: string
  optIn: boolean
  tags: string[]
}

const CONTACTS: ContactSeed[] = [
  { name: 'Ava Thompson', phone: '+14155550123', email: 'ava.thompson@example.com', country: 'US', optIn: true, tags: ['VIP', 'Marketing'] },
  { name: 'Liam Rodriguez', phone: '+14155550124', email: 'liam.rodriguez@example.com', country: 'US', optIn: true, tags: ['Lead'] },
  { name: 'Priya Sharma', phone: '+919876543210', email: 'priya.sharma@example.com', country: 'India', optIn: true, tags: ['VIP', 'Sales'] },
  { name: 'Arjun Mehta', phone: '+919876543211', email: 'arjun.mehta@example.com', country: 'India', optIn: false, tags: ['Lead'] },
  { name: 'Oliver Smith', phone: '+447911123456', email: 'oliver.smith@example.com', country: 'UK', optIn: true, tags: ['Support'] },
  { name: 'Emily Clarke', phone: '+447911123457', email: 'emily.clarke@example.com', country: 'UK', optIn: true, tags: ['Sales'] },
  { name: 'Gabriel Silva', phone: '+5511998765432', email: 'gabriel.silva@example.com', country: 'Brazil', optIn: true, tags: ['Marketing'] },
  { name: 'Isabela Costa', phone: '+5511998765433', email: 'isabela.costa@example.com', country: 'Brazil', optIn: false, tags: ['Lead'] },
  { name: 'Lukas Fischer', phone: '+4915123456789', email: 'lukas.fischer@example.com', country: 'Germany', optIn: true, tags: ['VIP'] },
  { name: 'Anna Weber', phone: '+4915123456790', email: 'anna.weber@example.com', country: 'Germany', optIn: true, tags: ['Support', 'Sales'] },
  { name: 'Noah Tremblay', phone: '+14165550123', email: 'noah.tremblay@example.com', country: 'Canada', optIn: true, tags: ['Marketing', 'Lead'] },
  { name: 'Chloe Leclair', phone: '+14165550124', email: 'chloe.leclair@example.com', country: 'Canada', optIn: true, tags: ['VIP', 'Sales'] },
  { name: 'Jack Harrison', phone: '+61412345678', email: 'jack.harrison@example.com', country: 'Australia', optIn: true, tags: ['Support'] },
  { name: 'Mia Robertson', phone: '+61412345679', email: 'mia.robertson@example.com', country: 'Australia', optIn: false, tags: ['Lead'] },
  { name: 'Sofia Herrera', phone: '+5215512345678', email: 'sofia.herrera@example.com', country: 'Mexico', optIn: true, tags: ['Marketing'] },
  { name: 'Mateo Gomez', phone: '+5215512345679', email: 'mateo.gomez@example.com', country: 'Mexico', optIn: true, tags: ['Sales'] },
  { name: 'Emma Dubois', phone: '+33612345678', email: 'emma.dubois@example.com', country: 'France', optIn: true, tags: ['VIP', 'Support'] },
  { name: 'Louis Martin', phone: '+33612345679', email: 'louis.martin@example.com', country: 'France', optIn: true, tags: ['Lead'] },
  { name: 'Lucia Garcia', phone: '+34612345678', email: 'lucia.garcia@example.com', country: 'Spain', optIn: true, tags: ['Marketing'] },
  { name: 'Diego Torres', phone: '+34612345679', email: 'diego.torres@example.com', country: 'Spain', optIn: true, tags: ['Sales', 'Support'] },
]

async function seedPlans() {
  const now = new Date()
  for (const plan of PLANS) {
    const existing = await prisma.plan.findFirst({ where: { name: plan.name } })
    const data = {
      name: plan.name,
      price: plan.price,
      billingCycle: 'MONTHLY' as const,
      contactLimit: plan.contactLimit,
      messageLimit: plan.messageLimit,
      apiLimit: plan.apiLimit,
      agentLimit: plan.agentLimit,
      automationLimit: plan.automationLimit,
      chatbotLimit: plan.chatbotLimit,
      features: {
        includesApiAccess: true,
        includesAnalytics: plan.name !== 'Free',
        seeded: true,
      } as Prisma.InputJsonValue,
      isActive: true,
    }
    if (existing) {
      await prisma.plan.update({ where: { id: existing.id }, data })
    } else {
      await prisma.plan.create({ data })
    }
  }
  console.log(`[seed] Upserted ${PLANS.length} plans (Free, Starter, Pro, Business, Enterprise)`)
  return now
}

async function seedSuperAdmin() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@whaatopro.com' },
    update: { name: 'Whaatopro Admin', passwordHash, emailVerified: new Date() },
    create: {
      name: 'Whaatopro Admin',
      email: 'admin@whaatopro.com',
      passwordHash,
      emailVerified: new Date(),
    },
  })

  const adminWorkspace = await prisma.workspace.upsert({
    where: { slug: 'whaatopro-admin' },
    update: {},
    create: {
      name: 'Whaatopro Admin',
      slug: 'whaatopro-admin',
      businessProfile: { seeded: true, role: 'platform' } as Prisma.InputJsonValue,
    },
  })

  await prisma.workspaceMember.upsert({
    where: {
      workspaceId_userId: { workspaceId: adminWorkspace.id, userId: admin.id },
    },
    update: { role: 'SUPER_ADMIN' },
    create: {
      workspaceId: adminWorkspace.id,
      userId: admin.id,
      role: 'SUPER_ADMIN',
    },
  })

  console.log(`[seed] Super admin ready: admin@whaatopro.com / ${DEMO_PASSWORD}`)
}

async function seedDemoWorkspace() {
  const demoWorkspace = await prisma.workspace.upsert({
    where: { slug: 'demo-company' },
    update: {},
    create: {
      name: 'Demo Company',
      slug: 'demo-company',
      timezone: 'UTC',
      locale: 'en',
      businessProfile: {
        seed: 'demo',
        note: 'Seeded demo workspace - all data here is sample data.',
      } as Prisma.InputJsonValue,
    },
  })

  await prisma.$transaction(async (tx) => {
    const workspaceId = demoWorkspace.id

    await tx.usage.deleteMany({ where: { workspaceId } })
    await tx.auditLog.deleteMany({ where: { workspaceId } })
    await tx.notification.deleteMany({ where: { workspaceId } })
    await tx.supportTicket.deleteMany({ where: { workspaceId } })
    await tx.invoice.deleteMany({ where: { workspaceId } })
    await tx.subscription.deleteMany({ where: { workspaceId } })
    await tx.apiKey.deleteMany({ where: { workspaceId } })
    await tx.webhook.deleteMany({ where: { workspaceId } })
    await tx.automation.deleteMany({ where: { workspaceId } })
    await tx.chatbot.deleteMany({ where: { workspaceId } })
    await tx.campaign.deleteMany({ where: { workspaceId } })
    await tx.template.deleteMany({ where: { workspaceId } })
    await tx.conversation.deleteMany({ where: { workspaceId } })
    await tx.whatsAppAccount.deleteMany({ where: { workspaceId } })
    await tx.contact.deleteMany({ where: { workspaceId } })
    await tx.tag.deleteMany({ where: { workspaceId } })
    await tx.workspaceMember.deleteMany({ where: { workspaceId } })

    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12)

    const owner = await tx.user.upsert({
      where: { email: 'demo@whaatopro.com' },
      update: { name: 'Demo Owner', phone: '+14155550100', emailVerified: new Date() },
      create: {
        name: 'Demo Owner',
        email: 'demo@whaatopro.com',
        passwordHash,
        phone: '+14155550100',
        emailVerified: new Date(),
      },
    })

    const agentOne = await tx.user.upsert({
      where: { email: 'agent1@whaatopro.com' },
      update: { name: 'Demo Agent One' },
      create: {
        name: 'Demo Agent One',
        email: 'agent1@whaatopro.com',
        passwordHash,
      },
    })

    const agentTwo = await tx.user.upsert({
      where: { email: 'agent2@whaatopro.com' },
      update: { name: 'Demo Agent Two' },
      create: {
        name: 'Demo Agent Two',
        email: 'agent2@whaatopro.com',
        passwordHash,
      },
    })

    await tx.workspaceMember.upsert({
      where: { workspaceId_userId: { workspaceId, userId: owner.id } },
      update: { role: 'OWNER' },
      create: { workspaceId, userId: owner.id, role: 'OWNER' },
    })
    await tx.workspaceMember.upsert({
      where: { workspaceId_userId: { workspaceId, userId: agentOne.id } },
      update: { role: 'AGENT' },
      create: { workspaceId, userId: agentOne.id, role: 'AGENT' },
    })
    await tx.workspaceMember.upsert({
      where: { workspaceId_userId: { workspaceId, userId: agentTwo.id } },
      update: { role: 'AGENT' },
      create: { workspaceId, userId: agentTwo.id, role: 'AGENT' },
    })

    const tags: Record<string, string> = {}
    for (const tag of TAG_SEEDS) {
      const created = await tx.tag.upsert({
        where: { workspaceId_name: { workspaceId, name: tag.name } },
        update: { color: tag.color },
        create: { workspaceId, name: tag.name, color: tag.color },
      })
      tags[tag.name] = created.id
    }

    const contactIds: string[] = []
    for (const contact of CONTACTS) {
      const created = await tx.contact.upsert({
        where: { workspaceId_phone: { workspaceId, phone: contact.phone } },
        update: {
          name: contact.name,
          email: contact.email,
          country: contact.country,
          optIn: contact.optIn,
          source: 'demo_seed',
        },
        create: {
          workspaceId,
          name: contact.name,
          phone: contact.phone,
          email: contact.email,
          country: contact.country,
          optIn: contact.optIn,
          source: 'demo_seed',
        },
      })
      contactIds.push(created.id)

      for (const tagName of contact.tags) {
        const tagId = tags[tagName]
        if (!tagId) continue
        await tx.contactTag
          .create({
            data: { contactId: created.id, tagId },
          })
          .catch(() => undefined)
      }
    }

    const templateNames = ['order_confirmation', 'welcome_message', 'promotional']
    const templates: Record<string, string> = {}
    const templateBodies: Record<string, unknown> = {
      order_confirmation: {
        text: 'Hi {{1}}, your order {{2}} has been confirmed. Thank you for shopping with us!',
      },
      welcome_message: {
        text: 'Welcome {{1}}! We are excited to have you on board. Reply HELP for assistance.',
      },
      promotional: {
        text: 'Hi {{1}}, enjoy {{2}} off your next order with code SAVE{{3}}. Limited time offer!',
      },
    }
    for (const name of templateNames) {
      const existing = await tx.template.findFirst({
        where: { workspaceId, name },
      })
      if (existing) {
        await tx.template.delete({ where: { id: existing.id } })
      }
      const created = await tx.template.create({
        data: {
          workspaceId,
          name,
          category: name === 'promotional' ? 'MARKETING' : 'UTILITY',
          language: 'en',
          body: (templateBodies[name] ?? { text: 'Hi {{1}}' }) as Prisma.InputJsonValue,
          status: 'APPROVED',
        },
      })
      templates[name] = created.id
    }

    const completedCampaign = await tx.campaign.create({
      data: {
        workspaceId,
        name: 'Winter Promo Campaign (Demo)',
        templateId: templates.promotional,
        audience: { tags: ['Marketing'], include: 'all' } as Prisma.InputJsonValue,
        startedAt: new Date(),
        completedAt: new Date(),
        status: 'COMPLETED',
        totalRecipients: contactIds.length,
        sent: contactIds.length,
        delivered: Math.floor(contactIds.length * 0.97),
        read: Math.floor(contactIds.length * 0.8),
        failed: 2,
        replies: 5,
      },
    })

    const optedInContactIds = contactIds.slice(0, 16)
    for (let i = 0; i < optedInContactIds.length; i++) {
      const contactId = optedInContactIds[i]
      const delivered = i % 5 !== 0
      const read = i % 4 !== 0
      await tx.campaignRecipient.create({
        data: {
          campaignId: completedCampaign.id,
          contactId,
          status: 'DELIVERED',
          sentAt: new Date(),
          deliveredAt: delivered ? new Date() : null,
          readAt: read && delivered ? new Date() : null,
        },
      })
    }

    await tx.campaign.create({
      data: {
        workspaceId,
        name: 'New Year Campaign (Demo)',
        templateId: templates.order_confirmation,
        audience: { tags: ['VIP', 'Sales'], include: 'all' } as Prisma.InputJsonValue,
        status: 'DRAFT',
        totalRecipients: 0,
      },
    })

    const chatbots = [
      {
        name: 'Support Assistant (Demo)',
        description: 'Demo chatbot that answers common support questions.',
        isActive: true,
        isPublished: true,
      },
      {
        name: 'Sales Assistant (Demo)',
        description: 'Demo chatbot that qualifies sales leads.',
        isActive: false,
        isPublished: false,
      },
    ]

    for (const chatbot of chatbots) {
      const existing = await tx.chatbot.findFirst({
        where: { workspaceId, name: chatbot.name },
      })
      if (existing) {
        await tx.chatbot.delete({ where: { id: existing.id } })
      }
      const created = await tx.chatbot.create({
        data: {
          workspaceId,
          name: chatbot.name,
          description: chatbot.description,
          isActive: chatbot.isActive,
          isPublished: chatbot.isPublished,
        },
      })

      const start = await tx.chatbotNode.create({
        data: {
          chatbotId: created.id,
          type: 'START',
          position: { x: 100, y: 100 } as Prisma.InputJsonValue,
          data: { label: 'Start' } as Prisma.InputJsonValue,
        },
      })
      const message = await tx.chatbotNode.create({
        data: {
          chatbotId: created.id,
          type: 'MESSAGE',
          position: { x: 100, y: 220 } as Prisma.InputJsonValue,
          data: {
            label: chatbot.isActive
              ? 'Hi there! How can we help you today?'
              : 'Welcome message placeholder',
          } as Prisma.InputJsonValue,
        },
      })
      await tx.chatbotEdge.create({
        data: {
          chatbotId: created.id,
          sourceNodeId: start.id,
          targetNodeId: message.id,
          label: 'on start',
        },
      })
    }

    const automations = [
      {
        name: 'Welcome Automation (Demo)',
        description: 'Sends a welcome template when a new contact is created.',
        isActive: true,
      },
      {
        name: 'Order Follow-up (Demo)',
        description: 'Follows up with contacts tagged as VIP after a purchase.',
        isActive: false,
      },
    ]

    for (const automation of automations) {
      const existing = await tx.automation.findFirst({
        where: { workspaceId, name: automation.name },
      })
      if (existing) {
        await tx.automation.delete({ where: { id: existing.id } })
      }
      await tx.automation.create({
        data: {
          workspaceId,
          name: automation.name,
          description: automation.description,
          isActive: automation.isActive,
          trigger: {
            type: automation.isActive ? 'contact_created' : 'tag_added',
            config: { tag: 'VIP' },
          } as Prisma.InputJsonValue,
          conditions: {} as Prisma.InputJsonValue,
          actions: [
            {
              type: 'send_message',
              config: { template: 'welcome_message', language: 'en' },
              delay: 0,
            },
          ] as Prisma.InputJsonValue,
        },
      })
    }

    const freePlan = await tx.plan.findFirst({ where: { name: 'Free' } })
    if (freePlan) {
      const now = new Date()
      await tx.subscription.create({
        data: {
          workspaceId,
          planId: freePlan.id,
          status: 'ACTIVE',
          currentPeriodStart: now,
          currentPeriodEnd: new Date(
            now.getFullYear(),
            now.getMonth() + 1,
            now.getDate()
          ),
        },
      })
    }

    const period = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
    await tx.usage.upsert({
      where: { workspaceId_period: { workspaceId, period } },
      update: {},
      create: {
        workspaceId,
        period,
        messagesUsed: 1240,
        contactsUsed: CONTACTS.length,
        apiCallsUsed: 320,
        automationsUsed: 2,
      },
    })
  })

  console.log(`[seed] Demo workspace ready: demo-company (Demo Company)`)
  console.log(`[seed] Demo users: demo@whaatopro.com / agent1@whaatopro.com / agent2@whaatopro.com`)
  console.log(`[seed] Password for all demo users: ${DEMO_PASSWORD}`)
  console.log(
    `[seed] Seeded ${CONTACTS.length} contacts, ${TAG_SEEDS.length} tags, 3 templates, 2 campaigns, 2 chatbots, 2 automations`
  )
}

async function main() {
  console.log('[seed] Starting database seed...')
  await seedPlans()
  await seedSuperAdmin()
  await seedDemoWorkspace()
  console.log('[seed] Done.')
}

main()
  .catch((error) => {
    console.error('[seed] Failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })