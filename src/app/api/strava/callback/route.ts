import { NextRequest, NextResponse } from 'next/server'

import { getRequiredEnv } from '@/server/env'

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

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const wallet = request.nextUrl.searchParams.get('state')
  const error = request.nextUrl.searchParams.get('error')
  const createUrl = new URL('/create', request.nextUrl.origin)

  if (error) {
    createUrl.searchParams.set('strava', 'denied')
    return NextResponse.redirect(createUrl)
  }

  if (!wallet || !/^0x[0-9a-fA-F]{40}$/.test(wallet) || !code) {
    return NextResponse.json({ error: 'Missing wallet or code' }, { status: 400 })
  }

  try {
    const response = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: getRequiredEnv('STRAVA_CLIENT_ID'),
        client_secret: getRequiredEnv('STRAVA_CLIENT_SECRET'),
        code,
        grant_type: 'authorization_code',
      }),
      cache: 'no-store',
    })

    if (!response.ok) {
      throw new Error(await response.text())
    }

    await response.json()

    createUrl.searchParams.set('strava', 'connected')
    const redirect = NextResponse.redirect(createUrl)
    const connectedWallets = new Set(
      parseConnectedWalletsCookie(request.cookies.get(STRAVA_CONNECTED_WALLETS_COOKIE)?.value)
    )
    connectedWallets.add(wallet.toLowerCase())
    redirect.cookies.set(STRAVA_CONNECTED_WALLETS_COOKIE, Array.from(connectedWallets).join(','), {
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    })
    return redirect
  } catch (error) {
    console.error('Strava OAuth error:', error)
    createUrl.searchParams.set('strava', 'error')
    return NextResponse.redirect(createUrl)
  }
}
