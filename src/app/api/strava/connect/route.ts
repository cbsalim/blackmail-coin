import { NextRequest, NextResponse } from 'next/server'

import { getOptionalEnv, getRequiredEnv } from '@/server/env'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const wallet = request.nextUrl.searchParams.get('wallet')

  if (!wallet || !/^0x[0-9a-fA-F]{40}$/.test(wallet)) {
    return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 })
  }

  const redirectUri =
    getOptionalEnv('STRAVA_REDIRECT_URI') ??
    new URL('/api/strava/callback', request.nextUrl.origin).toString()

  const params = new URLSearchParams({
    client_id: getRequiredEnv('STRAVA_CLIENT_ID'),
    redirect_uri: redirectUri,
    response_type: 'code',
    approval_prompt: 'auto',
    scope: 'activity:read_all',
    state: wallet,
  })

  return NextResponse.redirect(`https://www.strava.com/oauth/authorize?${params.toString()}`)
}
