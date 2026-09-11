export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initCampaignWorker } = await import('@/lib/workers/campaign-worker')
    const { initMessageWorker } = await import('@/lib/workers/message-worker')
    const { initWebhookWorker } = await import('@/lib/workers/webhook-worker')
    initCampaignWorker()
    initMessageWorker()
    initWebhookWorker()
  }
}
