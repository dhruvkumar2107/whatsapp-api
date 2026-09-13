import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mockPrisma } from './setup'

const originalEnv = process.env

describe('GET /api/cron/campaigns', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('returns 401 when CRON_SECRET is not set', async () => {
    delete process.env.CRON_SECRET
    const req = new Request('http://localhost:3000/api/cron/campaigns', {
      method: 'GET',
      headers: { Authorization: 'Bearer anything' },
    })

    const { GET } = await import('@/app/api/cron/campaigns/route')
    const res = await GET(req)

    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toBe('Unauthorized')
  })

  it('returns 401 on wrong CRON_SECRET', async () => {
    process.env.CRON_SECRET = 'correct_secret'
    const req = new Request('http://localhost:3000/api/cron/campaigns', {
      method: 'GET',
      headers: { Authorization: 'Bearer wrong_secret' },
    })

    const { GET } = await import('@/app/api/cron/campaigns/route')
    const res = await GET(req)

    expect(res.status).toBe(401)
  })

  it('processes due campaigns on valid auth', async () => {
    process.env.CRON_SECRET = 'test_secret'
    mockPrisma.campaign.findMany
      .mockResolvedValueOnce([{ id: 'c1' }])
      .mockResolvedValueOnce([])
    const { processCampaign } = await import('@/lib/workers/campaign-worker')
    vi.mocked(processCampaign).mockResolvedValue(undefined as never)

    const req = new Request('http://localhost:3000/api/cron/campaigns', {
      method: 'GET',
      headers: { Authorization: 'Bearer test_secret' },
    })

    const { GET } = await import('@/app/api/cron/campaigns/route')
    const res = await GET(req)

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.processed).toBe(1)
    expect(processCampaign).toHaveBeenCalledWith({ campaignId: 'c1' })
  })

  it('processes stalled campaigns', async () => {
    process.env.CRON_SECRET = 'test_secret'
    mockPrisma.campaign.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'c2' }])
    const { processCampaign } = await import('@/lib/workers/campaign-worker')
    vi.mocked(processCampaign).mockResolvedValue(undefined as never)

    const req = new Request('http://localhost:3000/api/cron/campaigns', {
      method: 'GET',
      headers: { Authorization: 'Bearer test_secret' },
    })

    const { GET } = await import('@/app/api/cron/campaigns/route')
    const res = await GET(req)

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.processed).toBe(1)
    expect(processCampaign).toHaveBeenCalledWith({ campaignId: 'c2' })
  })

  it('returns empty when no campaigns due', async () => {
    process.env.CRON_SECRET = 'test_secret'
    mockPrisma.campaign.findMany.mockResolvedValue([])

    const req = new Request('http://localhost:3000/api/cron/campaigns', {
      method: 'GET',
      headers: { Authorization: 'Bearer test_secret' },
    })

    const { GET } = await import('@/app/api/cron/campaigns/route')
    const res = await GET(req)

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.processed).toBe(0)
  })

  it('continues processing other campaigns when one fails', async () => {
    process.env.CRON_SECRET = 'test_secret'
    mockPrisma.campaign.findMany
      .mockResolvedValueOnce([{ id: 'c1' }, { id: 'c2' }])
      .mockResolvedValueOnce([])
    const { processCampaign } = await import('@/lib/workers/campaign-worker')
    vi.mocked(processCampaign)
      .mockRejectedValueOnce(new Error('DB error'))
      .mockResolvedValueOnce(undefined as never)

    const req = new Request('http://localhost:3000/api/cron/campaigns', {
      method: 'GET',
      headers: { Authorization: 'Bearer test_secret' },
    })

    const { GET } = await import('@/app/api/cron/campaigns/route')
    const res = await GET(req)

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.processed).toBe(1)
    expect(data.campaigns).toContain('c2')
  })
})
