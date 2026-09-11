import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export const registerSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100),
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters').max(128),
    confirmPassword: z.string(),
    workspaceName: z.string().min(2, 'Workspace name is required').max(100),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export const contactSchema = z.object({
  name: z.string().min(1).max(200),
  phone: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Invalid phone number (include country code)'),
  email: z.string().email().optional().or(z.literal('')),
  tags: z.array(z.string()).optional(),
  customFields: z.record(z.string(), z.unknown()).optional(),
  notes: z.string().max(1000).optional(),
})

export const contactImportSchema = z.object({
  contacts: z
    .array(
      z.object({
        name: z.string().min(1).max(200),
        phone: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Invalid phone number'),
        email: z.string().email().optional().or(z.literal('')),
        tags: z.array(z.string()).optional(),
      })
    )
    .min(1, 'At least one contact is required')
    .max(10000, 'Maximum 10,000 contacts per import'),
  tags: z.array(z.string()).optional(),
})

export const templateSchema = z.object({
  name: z.string().min(1).max(100),
  language: z.string().min(2).max(10),
  category: z.enum(['UTILITY', 'MARKETING', 'AUTHENTICATION']),
  components: z.array(
    z.object({
      type: z.enum(['HEADER', 'BODY', 'BUTTONS', 'FOOTER']),
      text: z.string().optional(),
      parameters: z
        .array(
          z.object({
            type: z.enum(['text', 'image', 'video', 'document']),
            text: z.string().optional(),
            image: z.object({ link: z.string().url() }).optional(),
            video: z.object({ link: z.string().url() }).optional(),
            document: z.object({ link: z.string().url() }).optional(),
          })
        )
        .optional(),
    })
  ),
})

export const campaignSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  templateId: z.string().uuid(),
  contactFilter: z
    .object({
      tags: z.array(z.string()).optional(),
      customField: z.record(z.string(), z.unknown()).optional(),
      lastActivity: z
        .object({
          days: z.number().min(1),
          operator: z.enum(['more_than', 'less_than']),
        })
        .optional(),
    })
    .optional(),
  scheduledAt: z.string().datetime().optional(),
  mediaUrl: z.string().url().optional(),
})

export const chatbotSchema = z.object({
  name: z.string().min(1).max(100),
  welcomeMessage: z.string().min(1).max(1000),
  fallbackMessage: z.string().min(1).max(1000),
  isActive: z.boolean().optional().default(true),
  triggers: z.array(
    z.object({
      type: z.enum(['keyword', 'regex', 'exact']),
      value: z.string(),
    })
  ),
  responses: z.array(
    z.object({
      triggerId: z.string(),
      message: z.string().min(1).max(1000),
      delay: z.number().min(0).max(30000).optional(),
    })
  ),
})

export const automationSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  isActive: z.boolean().optional().default(true),
  trigger: z.object({
    type: z.enum([
      'message_received',
      'contact_created',
      'tag_added',
      'form_submitted',
      'schedule',
    ]),
    config: z.record(z.string(), z.unknown()),
  }),
  actions: z.array(
    z.object({
      type: z.enum(['send_message', 'add_tag', 'remove_tag', 'update_field', 'webhook_call']),
      config: z.record(z.string(), z.unknown()),
      delay: z.number().min(0).max(86400000).optional(),
    })
  ),
})

export const webhookSchema = z.object({
  name: z.string().min(1).max(100),
  url: z.string().url('Invalid webhook URL'),
  events: z.array(
    z.enum([
      'message.received',
      'message.sent',
      'message.delivered',
      'message.read',
      'message.failed',
      'contact.created',
      'contact.updated',
      'campaign.started',
      'campaign.completed',
      'campaign.failed',
    ])
  ),
  secret: z.string().max(256).optional(),
  isActive: z.boolean().optional().default(true),
})

export const apiKeySchema = z.object({
  name: z.string().min(1).max(100),
  permissions: z.array(z.string()).min(1, 'At least one permission is required'),
  expiresAt: z.string().datetime().optional(),
})

export const settingsSchema = z.object({
  workspaceName: z.string().min(2).max(100).optional(),
  timezone: z.string().optional(),
  locale: z.string().optional(),
  webhookUrl: z.string().url().optional().or(z.literal('')),
  webhookSecret: z.string().max(256).optional(),
  businessProfile: z
    .object({
      name: z.string().max(100).optional(),
      description: z.string().max(500).optional(),
      email: z.string().email().optional(),
      website: z.string().url().optional(),
    })
    .optional(),
  autoReply: z
    .object({
      enabled: z.boolean(),
      message: z.string().max(1000).optional(),
    })
    .optional(),
})

export const messageSendSchema = z.object({
  to: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Invalid phone number'),
  type: z.enum(['TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT', 'TEMPLATE', 'INTERACTIVE']),
  text: z.string().max(4096).optional(),
  template: z
    .object({
      name: z.string(),
      language: z.string(),
      components: z
        .array(
          z.object({
            type: z.string(),
            parameters: z
              .array(
                z.object({
                  type: z.string(),
                  text: z.string().optional(),
                })
              )
              .optional(),
          })
        )
        .optional(),
    })
    .optional(),
  media: z
    .object({
      type: z.enum(['image', 'video', 'audio', 'document']),
      url: z.string().url(),
      caption: z.string().max(1024).optional(),
      filename: z.string().optional(),
    })
    .optional(),
  interactive: z
    .object({
      type: z.enum(['button', 'list']),
      body: z.string().max(1024),
      buttons: z
        .array(
          z.object({
            id: z.string(),
            title: z.string().max(20),
          })
        )
        .optional(),
      sections: z
        .array(
          z.object({
            title: z.string().max(24),
            rows: z.array(
              z.object({
                id: z.string(),
                title: z.string().max(24),
                description: z.string().max(72).optional(),
              })
            ),
          })
        )
        .optional(),
    })
    .optional(),
})
  .refine(
    (data) => {
      if (data.type === 'TEXT') return !!data.text
      if (data.type === 'TEMPLATE') return !!data.template
      if (['IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT'].includes(data.type)) return !!data.media
      if (data.type === 'INTERACTIVE') return !!data.interactive
      return true
    },
    { message: 'Message content is required for the selected type', path: ['text'] }
  )

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type ContactInput = z.infer<typeof contactSchema>
export type ContactImportInput = z.infer<typeof contactImportSchema>
export type TemplateInput = z.infer<typeof templateSchema>
export type CampaignInput = z.infer<typeof campaignSchema>
export type ChatbotInput = z.infer<typeof chatbotSchema>
export type AutomationInput = z.infer<typeof automationSchema>
export type WebhookInput = z.infer<typeof webhookSchema>
export type ApiKeyInput = z.infer<typeof apiKeySchema>
export type SettingsInput = z.infer<typeof settingsSchema>
export type MessageSendInput = z.infer<typeof messageSendSchema>
