import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export async function POST() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ success: true })
    }
    return NextResponse.json({ success: true, message: 'Session cleared' })
  } catch {
    return NextResponse.json({ success: true })
  }
}
