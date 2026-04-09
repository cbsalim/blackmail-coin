import { NextResponse } from 'next/server'

import { getPact } from '@/server/oracle'
import { getActivityProgress } from '@/server/strava'
import { getConnection } from '@/server/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(
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

    if (!(await getConnection(pact.creator))) {
      return NextResponse.json(
        { error: 'Strava not connected for this pact creator' },
        { status: 404 }
      )
    }

    const { actual } = await getActivityProgress(pact.creator, pact.goalType, pact.createdAt)

    return NextResponse.json({
      pactId,
      goalType: pact.goalType,
      actual,
      target: pact.targetValue.toString(),
      goalMet: actual >= Number(pact.targetValue),
      status: pact.status,
      deadline: pact.deadline,
    })
  } catch (error) {
    console.error(`Progress fetch error for pact ${pactId}:`, error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch progress',
      },
      { status: 500 }
    )
  }
}
