import { enqueueMessage } from '@/lib/workers/message-worker'

export function enqueueMessageSend(messageId: string, conversationId: string): void {
  void enqueueMessage(messageId, conversationId).catch((err) => {
    console.error('[MessageQueue] Failed to enqueue send:', messageId, err)
  })
}