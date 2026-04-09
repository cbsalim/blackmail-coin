import { NextResponse } from 'next/server'

import { getPact, submitResolve } from '@/server/oracle'
import { getActivityProgress } from '@/server/strava'
import { getConnection } from '@/server/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ pactId: string }> }
) {
  const { pactId: pactIdParam } = await params
  const pactId = Number.parseInt(pactIdParam, 10)
  if (Number.isNaN(pactId) || pactId < 0) {
    return NextResponse.json({ error: 'Invalid pact ID' }, { status: 400 })
  }

  try {
    const pact = await getPact(pactId)

    if (!pact.creator || pact.creator === '0x0000000000000000000000000000000000000000') {
      return NextResponse.json({ error: 'Pact not found' }, { status: 404 })
    }

    if (pact.status !== 0) {
      return NextResponse.json({ error: 'Pact is not active' }, { status: 400 })
    }

    if (!getConnection(pact.creator)) {
      return NextResponse.json(
        { error: 'No Strava connection for pact creator' },
        { status: 400 }
      )
    }

    const { actual } = await getActivityProgress(pact.creator, pact.goalType, pact.createdAt)
    const goalMet = actual >= Number(pact.targetValue)
    const now = Math.floor(Date.now() / 1000)

    // Early resolution only allowed if goal is met; penalty requires deadline
    if (!goalMet && pact.deadline > now) {
      return NextResponse.json(
        { error: 'Deadline has not passed and goal not yet met' },
        { status: 400 }
      )
    }

    const receipt = await submitResolve(pactId, actual)

    return NextResponse.json({
      success: true,
      pactId,
      actualValue: actual,
      goalMet,
      txHash: receipt.hash,
    })
  } catch (error) {
    console.error(`Manual verify error for pact ${pactId}:`, error)

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Verification failed',
      },
      { status: 500 }
    )
  }
}
