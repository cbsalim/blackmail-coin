import { NextRequest, NextResponse } from 'next/server'

import { getConnection, hasStoredConnection } from '@/server/store'

const STRAVA_CONNECTED_WALLETS_COOKIE = 'strava_connected_wallets'

function parseConnectedWalletsCookie(rawValue: string | undefined): string[] {
  if (!rawValue) {
    return []
  }

  return rawValue
    .split(',')
    .map((wallet) => wallet.trim().toLowerCase())
    .filter((wallet) => /^0x[0-9a-fA-F]{40}$/.test(wallet))
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ wallet: string }> }
) {
  const { wallet } = await params

  if (!/^0x[0-9a-fA-F]{40}$/.test(wallet)) {
    return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 })
  }

  const normalizedWallet = wallet.toLowerCase()
  const connectedWallets = new Set(
    parseConnectedWalletsCookie(request.cookies.get(STRAVA_CONNECTED_WALLETS_COOKIE)?.value)
  )
  const hasOAuthCookie = connectedWallets.has(normalizedWallet)
  const hasRealConnection = await hasStoredConnection(normalizedWallet)
  const connected = hasOAuthCookie || hasRealConnection
  const connection = connected ? await getConnection(normalizedWallet) : null

  return NextResponse.json({
    connected,
    stravaId: connection?.stravaId ?? null,
  })
}
