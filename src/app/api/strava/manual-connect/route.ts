import { NextRequest, NextResponse } from 'next/server'

import { upsertConnection } from '@/server/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { wallet, accessToken, refreshToken, stravaId, expiresAt } = body

  if (!wallet || !/^0x[0-9a-fA-F]{40}$/.test(wallet)) {
    return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 })
  }

  if (!accessToken) {
    return NextResponse.json({ error: 'Missing accessToken' }, { status: 400 })
  }

  await upsertConnection({
    wallet,
    stravaId: stravaId ?? null,
    accessToken,
    refreshToken: refreshToken ?? accessToken,
    expiresAt: Number(expiresAt ?? Math.floor(Date.now() / 1000) + 86400),
  })

  return NextResponse.json({ ok: true })
}
