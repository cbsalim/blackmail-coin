import { NextResponse } from 'next/server'

import { getConnection } from '@/server/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ wallet: string }> }
) {
  const { wallet } = await params

  if (!/^0x[0-9a-fA-F]{40}$/.test(wallet)) {
    return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 })
  }

  const connection = await getConnection(wallet)

  return NextResponse.json({
    connected: Boolean(connection),
    stravaId: connection?.stravaId ?? null,
  })
}
