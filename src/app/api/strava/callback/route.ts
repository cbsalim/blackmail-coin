import { NextRequest, NextResponse } from 'next/server'

import { getRequiredEnv } from '@/server/env'
import { upsertConnection } from '@/server/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface StravaOAuthResponse {
  access_token: string
  refresh_token: string
  expires_at: number
  athlete?: {
    id?: number
  }
}

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

    const data = (await response.json()) as StravaOAuthResponse

    upsertConnection({
      wallet,
      stravaId: data.athlete?.id ?? null,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_at,
    })

    createUrl.searchParams.set('strava', 'connected')
    createUrl.searchParams.set('strava_wallet', wallet)
    createUrl.searchParams.set('strava_access_token', data.access_token)
    createUrl.searchParams.set('strava_refresh_token', data.refresh_token)
    createUrl.searchParams.set('strava_expires_at', String(data.expires_at))
    if (data.athlete?.id) {
      createUrl.searchParams.set('strava_id', String(data.athlete.id))
    }
    return NextResponse.redirect(createUrl)
  } catch (error) {
    console.error('Strava OAuth error:', error)
    createUrl.searchParams.set('strava', 'error')
    return NextResponse.redirect(createUrl)
  }
}
