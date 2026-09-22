import prisma from '@/lib/prisma'
import { type MySmartCardIntent } from './constants'

interface IntentResult {
  intent: MySmartCardIntent
  confidence: number
  entities: Record<string, string>
}

const GREETING_PATTERNS = /^(hi|hello|hey|good morning|good afternoon|good evening|howdy|greetings|sup|what's up)/i
const PRODUCT_PATTERNS = /\b(nfc|card|smart card|product|device|tag|sticker|wristband|keychain|ring)\b/i
const PRICING_PATTERNS = /\b(price|pricing|cost|how much|rate|charge|fee|expensive|cheap|afford|discount|offer)\b/i
const PURCHASE_PATTERNS = /\b(buy|purchase|order|get|want|need|interested|acquire|grab|take|pay)\b/i
const SUPPORT_PATTERNS = /\b(help|support|issue|problem|not working|broken|error|fail|trouble|assist)\b/i
const HUMAN_PATTERNS = /\b(human|agent|representative|person|someone|talk to|speak to|call|real person|live)\b/i
const SHIPPING_PATTERNS = /\b(ship|delivery|deliver|track|tracking|dispatch|courier|arrive|when will|eta)\b/i
const PAYMENT_PATTERNS = /\b(pay|payment|upi|card|netbanking|wallet|cod|cash on|invoice|bill)\b/i
const REFUND_PATTERNS = /\b(refund|money back|return|exchange|replace|replacement)\b/i
const OFFER_PATTERNS = /\b(offer|deal|discount|coupon|promo|sale|limited|special)\b/i
const COMPARISON_PATTERNS = /\b(compare|difference|vs|versus|better|which|alternative|option)\b/i
const MEDIA_PATTERNS = /\b(image|photo|picture|video|demo|show|see|look|display|gallery|catalog)\b/i

export async function detectIntent(messageText: string): Promise<IntentResult> {
  const text = messageText.toLowerCase().trim()
  const entities: Record<string, string> = {}

  if (HUMAN_PATTERNS.test(text)) {
    return { intent: 'HUMAN_AGENT', confidence: 0.95, entities }
  }

  if (GREETING_PATTERNS.test(text) && text.split(' ').length <= 5) {
    return { intent: 'GREETING', confidence: 0.9, entities }
  }

  if (MEDIA_PATTERNS.test(text)) {
    const productMatch = text.match(PRODUCT_PATTERNS)
    if (productMatch) entities.product = productMatch[1]
    return { intent: 'PRODUCT_MEDIA_REQUEST', confidence: 0.85, entities }
  }

  if (COMPARISON_PATTERNS.test(text)) {
    return { intent: 'PRODUCT_COMPARISON', confidence: 0.8, entities }
  }

  if (REFUND_PATTERNS.test(text)) {
    if (/refund/.test(text)) return { intent: 'REFUND', confidence: 0.85, entities }
    if (/return|exchange/.test(text)) return { intent: 'RETURN', confidence: 0.85, entities }
    return { intent: 'SUPPORT', confidence: 0.7, entities }
  }

  if (PURCHASE_PATTERNS.test(text)) {
    const productMatch = text.match(PRODUCT_PATTERNS)
    if (productMatch) entities.product = productMatch[1]
    return { intent: 'PURCHASE_INTENT', confidence: 0.85, entities }
  }

  if (PRICING_PATTERNS.test(text)) {
    const productMatch = text.match(PRODUCT_PATTERNS)
    if (productMatch) entities.product = productMatch[1]
    return { intent: 'PRODUCT_PRICING', confidence: 0.85, entities }
  }

  if (SHIPPING_PATTERNS.test(text)) {
    return { intent: 'SHIPPING', confidence: 0.8, entities }
  }

  if (PAYMENT_PATTERNS.test(text)) {
    return { intent: 'PAYMENT', confidence: 0.8, entities }
  }

  if (OFFER_PATTERNS.test(text)) {
    return { intent: 'OFFER', confidence: 0.8, entities }
  }

  if (SUPPORT_PATTERNS.test(text)) {
    return { intent: 'SUPPORT', confidence: 0.75, entities }
  }

  if (PRODUCT_PATTERNS.test(text)) {
    const productMatch = text.match(PRODUCT_PATTERNS)
    if (productMatch) entities.product = productMatch[1]
    return { intent: 'PRODUCT_INFO', confidence: 0.7, entities }
  }

  return { intent: 'OTHER', confidence: 0.5, entities }
}

interface KnowledgeContext {
  products: Array<{ name: string; description: string; price: number; discountedPrice: number | null; features: unknown; isAvailable: boolean }>
  faqs: Array<{ question: string; answer: string }>
  policies: Array<{ type: string; title: string; content: string }>
  offers: Array<{ name: string; description: string; discount: number | null }>
  documents: Array<{ title: string; content: string }>
}

export async function retrieveKnowledge(
  workspaceId: string,
  intent: MySmartCardIntent,
  entities: Record<string, string>,
  _messageText: string
): Promise<KnowledgeContext> {
  const productFilter: Record<string, unknown> = { workspaceId, isAvailable: true }
  if (entities.product) {
    productFilter.OR = [
      { name: { contains: entities.product, mode: 'insensitive' } },
      { description: { contains: entities.product, mode: 'insensitive' } },
    ]
  }

  const [products, faqs, policies, offers, documents] = await Promise.all([
    prisma.mySmartCardProduct.findMany({
      where: productFilter,
      take: 5,
      orderBy: { sortOrder: 'asc' },
    }),
    prisma.mySmartCardFAQ.findMany({
      where: { workspaceId, isActive: true },
      take: 5,
    }),
    prisma.mySmartCardPolicy.findMany({
      where: { workspaceId, isActive: true },
    }),
    prisma.mySmartCardOffer.findMany({
      where: { workspaceId, isActive: true },
      take: 3,
    }),
    prisma.mySmartCardKnowledgeDocument.findMany({
      where: { workspaceId, isActive: true },
      take: 3,
    }),
  ])

  return {
    products: products.map((p) => ({
      name: p.name,
      description: p.description,
      price: Number(p.price),
      discountedPrice: p.discountedPrice ? Number(p.discountedPrice) : null,
      features: p.features,
      isAvailable: p.isAvailable,
    })),
    faqs: faqs.map((f) => ({ question: f.question, answer: f.answer })),
    policies: policies.map((p) => ({ type: p.type, title: p.title, content: p.content })),
    offers: offers.map((o) => ({ name: o.name, description: o.description, discount: o.discount })),
    documents: documents.map((d) => ({ title: d.title, content: d.content.slice(0, 500) })),
  }
}

function buildSystemPrompt(
  agentName: string,
  personality: string,
  systemInstructions: string,
  knowledge: KnowledgeContext,
  intent: MySmartCardIntent
): string {
  let prompt = `You are ${agentName}, an AI assistant for MySmartCard.\n\n`
  prompt += `Personality: ${personality}\n\n`
  prompt += `Instructions: ${systemInstructions}\n\n`

  if (knowledge.products.length > 0) {
    prompt += `## Products\n`
    for (const p of knowledge.products) {
      prompt += `- ${p.name}: ${p.description}`
      if (p.discountedPrice) {
        prompt += ` | Price: $${p.discountedPrice} (was $${p.price})`
      } else {
        prompt += ` | Price: $${p.price}`
      }
      if (p.features && typeof p.features === 'object') {
        const features = p.features as string[]
        if (Array.isArray(features) && features.length > 0) {
          prompt += ` | Features: ${features.join(', ')}`
        }
      }
      prompt += '\n'
    }
    prompt += '\n'
  }

  if (knowledge.faqs.length > 0) {
    prompt += `## FAQs\n`
    for (const f of knowledge.faqs) {
      prompt += `Q: ${f.question}\nA: ${f.answer}\n\n`
    }
  }

  if (knowledge.policies.length > 0) {
    prompt += `## Policies\n`
    for (const p of knowledge.policies) {
      prompt += `${p.title}: ${p.content.slice(0, 200)}\n`
    }
    prompt += '\n'
  }

  if (knowledge.offers.length > 0) {
    prompt += `## Current Offers\n`
    for (const o of knowledge.offers) {
      prompt += `- ${o.name}: ${o.description}`
      if (o.discount) prompt += ` (${o.discount}% off)`
      prompt += '\n'
    }
    prompt += '\n'
  }

  if (intent === 'HUMAN_AGENT') {
    prompt += `The customer wants to speak to a human. Respond politely and indicate you are connecting them with the team.\n`
  }

  prompt += `\nRespond naturally and helpfully. Keep responses concise for WhatsApp. Do not invent information.`

  return prompt
}

export async function generateAIResponse(
  workspaceId: string,
  messageText: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
): Promise<{
  response: string
  intent: MySmartCardIntent
  confidence: number
  mediaToSend?: Array<{ type: string; url: string; caption?: string }>
  shouldHandoff: boolean
}> {
  const { intent, confidence, entities } = await detectIntent(messageText)

  if (intent === 'HUMAN_AGENT') {
    return {
      response: "I understand you'd like to speak with our team. Let me connect you with a human agent who can assist you further. Please hold on for a moment.",
      intent,
      confidence,
      shouldHandoff: true,
    }
  }

  const knowledge = await retrieveKnowledge(workspaceId, intent, entities, messageText)

  const aiConfig = await prisma.mySmartCardAIConfig.findUnique({
    where: { workspaceId },
  })

  if (!aiConfig || !aiConfig.isActive) {
    return {
      response: "I'm currently unavailable. Let me connect you with our team for assistance.",
      intent,
      confidence,
      shouldHandoff: true,
    }
  }

  const systemPrompt = buildSystemPrompt(
    aiConfig.agentName,
    aiConfig.personality,
    aiConfig.systemInstructions,
    knowledge,
    intent
  )

  const messages = [
    { role: 'system' as const, content: systemPrompt },
    ...conversationHistory.slice(-10),
    { role: 'user' as const, content: messageText },
  ]

  const mediaToSend: Array<{ type: string; url: string; caption?: string }> = []

  if (intent === 'PRODUCT_MEDIA_REQUEST' && knowledge.products.length > 0) {
    const media = await prisma.mySmartCardMedia.findMany({
      where: { workspaceId, productId: knowledge.products[0] ? undefined : undefined },
      take: 1,
    })
    if (media.length > 0) {
      mediaToSend.push({
        type: media[0].type,
        url: media[0].url,
        caption: media[0].name,
      })
    }
  }

  try {
    const openaiKey = process.env.OPENAI_API_KEY
    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
    const provider = aiConfig.modelProvider || 'gemini'

    if (!openaiKey && !geminiKey) {
      const fallbackResponse = generateFallbackResponse(intent, knowledge)
      return {
        response: fallbackResponse,
        intent,
        confidence,
        mediaToSend: mediaToSend.length > 0 ? mediaToSend : undefined,
        shouldHandoff: false,
      }
    }

    let aiText = ''

    if (provider === 'gemini' && geminiKey) {
      const modelId = aiConfig.modelId || 'gemini-2.0-flash'
      const geminiMessages = [
        { role: 'user', parts: [{ text: systemPrompt + '\n\n---\n\nCustomer message: ' + messageText }] },
      ]

      const apiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: geminiMessages,
            generationConfig: {
              maxOutputTokens: aiConfig.maxResponseLength || 1024,
              temperature: aiConfig.temperature || 0.7,
            },
          }),
        }
      )

      if (apiResponse.ok) {
        const result = await apiResponse.json()
        aiText = result.candidates?.[0]?.content?.parts?.[0]?.text || ''
      }
    } else if (openaiKey) {
      const modelId = aiConfig.modelId || 'gpt-4o-mini'
      const apiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: modelId,
          messages,
          max_tokens: aiConfig.maxResponseLength || 1024,
          temperature: aiConfig.temperature || 0.7,
        }),
      })

      if (apiResponse.ok) {
        const result = await apiResponse.json()
        aiText = result.choices?.[0]?.message?.content || ''
      }
    }

    if (!aiText) {
      const fallbackResponse = generateFallbackResponse(intent, knowledge)
      return {
        response: fallbackResponse,
        intent,
        confidence,
        mediaToSend: mediaToSend.length > 0 ? mediaToSend : undefined,
        shouldHandoff: false,
      }
    }

    return {
      response: aiText,
      intent,
      confidence,
      mediaToSend: mediaToSend.length > 0 ? mediaToSend : undefined,
      shouldHandoff: false,
    }
  } catch {
    const fallbackResponse = generateFallbackResponse(intent, knowledge)
    return {
      response: fallbackResponse,
      intent,
      confidence,
      mediaToSend: mediaToSend.length > 0 ? mediaToSend : undefined,
      shouldHandoff: false,
    }
  }
}

function generateFallbackResponse(
  intent: MySmartCardIntent,
  knowledge: KnowledgeContext
): string {
  switch (intent) {
    case 'GREETING':
      return "Hi! Welcome to MySmartCard. How can I help you today? 😊"
    case 'PRODUCT_INFO':
      if (knowledge.products.length > 0) {
        const p = knowledge.products[0]
        return `We have ${p.name} - ${p.description}. Would you like to know more about pricing or features?`
      }
      return "I'd be happy to help you learn about our products. Could you tell me which product you're interested in?"
    case 'PRODUCT_PRICING':
      if (knowledge.products.length > 0) {
        const p = knowledge.products[0]
        const price = p.discountedPrice || p.price
        return `The ${p.name} is priced at $${price}. Would you like to know more about its features or how to purchase?`
      }
      return "I can help you with pricing information. Which product are you interested in?"
    case 'PURCHASE_INTENT':
      return "Great choice! To help you with your purchase, I'll need a few details. Could you share your name, email, and the quantity you're interested in?"
    case 'SUPPORT':
      return "I'm sorry to hear you're having an issue. Could you describe the problem so I can help? If needed, I can connect you with our support team."
    case 'SHIPPING':
      return "Our delivery typically takes 3-7 business days depending on your location. Would you like to know more about shipping to a specific area?"
    case 'PAYMENT':
      return "We accept UPI, credit/debit cards, net banking, and wallets. Which payment method would you prefer?"
    case 'REFUND':
    case 'RETURN':
      return "I understand you'd like to discuss a return/refund. Let me connect you with our team who can assist you with this."
    case 'OFFER':
      if (knowledge.offers.length > 0) {
        const o = knowledge.offers[0]
        return `We currently have: ${o.name} - ${o.description}. Would you like to know more?`
      }
      return "Let me check our current offers for you. Could you tell me which product you're interested in?"
    case 'HUMAN_AGENT':
      return "I'll connect you with our team right away. Please hold on."
    default:
      return "I'm here to help with any questions about MySmartCard products, pricing, orders, or support. What can I assist you with?"
  }
}
