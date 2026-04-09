import { NextRequest, NextResponse } from 'next/server'

import { runVerification } from '@/server/verification'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

function isAuthorized(request: NextRequest): boolean {
  const expectedSecret = process.env.CRON_SECRET
  if (!expectedSecret) {
    return true
  }

  return request.headers.get('authorization') === `Bearer ${expectedSecret}`
}

async function handleRequest(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await runVerification()
    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error('Cron verification failed:', error)
    return NextResponse.json({ error: 'Verification run failed' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return handleRequest(request)
}

export async function POST(request: NextRequest) {
  return handleRequest(request)
}
