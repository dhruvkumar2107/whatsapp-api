import { LEAD_SCORE_SIGNALS, type MySmartCardIntent } from './constants'

interface LeadScoreResult {
  score: number
  reasons: Array<{ signal: string; points: number }>
}

export function calculateLeadScore(
  intent: MySmartCardIntent,
  messageHistory: string[],
  hasContactInfo: boolean
): LeadScoreResult {
  const reasons: Array<{ signal: string; points: number }> = []
  let score = 0

  const allText = messageHistory.join(' ').toLowerCase()

  if (intent === 'PRODUCT_PRICING' || /price|cost|how much/.test(allText)) {
    const points = LEAD_SCORE_SIGNALS.ASKED_PRICING
    score += points
    reasons.push({ signal: 'Asked about pricing', points })
  }

  if (intent === 'PRODUCT_MEDIA_REQUEST' || /image|photo|show|see/.test(allText)) {
    const points = LEAD_SCORE_SIGNALS.ASKED_PRODUCT_IMAGE
    score += points
    reasons.push({ signal: 'Requested product image', points })
  }

  if (/how to buy|how to purchase|where to buy|want to buy/.test(allText)) {
    const points = LEAD_SCORE_SIGNALS.ASKED_HOW_TO_PURCHASE
    score += points
    reasons.push({ signal: 'Asked how to purchase', points })
  }

  if (/pay|payment|upi|card/.test(allText)) {
    const points = LEAD_SCORE_SIGNALS.ASKED_PAYMENT_DETAILS
    score += points
    reasons.push({ signal: 'Asked about payment', points })
  }

  if (/quantity|how many|pieces|units|bulk/.test(allText)) {
    const points = LEAD_SCORE_SIGNALS.ASKED_QUANTITY
    score += points
    reasons.push({ signal: 'Asked about quantity', points })
  }

  if (/delivery|shipping|when will|track|eta/.test(allText)) {
    const points = LEAD_SCORE_SIGNALS.ASKED_DELIVERY_TIME
    score += points
    reasons.push({ signal: 'Asked about delivery', points })
  }

  if (messageHistory.length >= 3) {
    const points = LEAD_SCORE_SIGNALS.REPLIED_MULTIPLE_TIMES
    score += points
    reasons.push({ signal: 'Multiple replies', points })
  }

  if (intent === 'PURCHASE_INTENT' || /buy|purchase|order|want|need/.test(allText)) {
    const points = LEAD_SCORE_SIGNALS.PURCHASE_INTENT
    score += points
    reasons.push({ signal: 'Purchase intent detected', points })
  }

  if (hasContactInfo) {
    const points = LEAD_SCORE_SIGNALS.PROVIDED_CONTACT_INFO
    score += points
    reasons.push({ signal: 'Provided contact information', points })
  }

  score = Math.min(score, 100)

  return { score, reasons }
}

export function getLeadStatusFromScore(score: number): string {
  if (score >= 70) return 'QUALIFIED'
  if (score >= 40) return 'INTERESTED'
  if (score >= 20) return 'CONTACTED'
  return 'NEW'
}
