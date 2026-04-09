import { getActivityProgress } from '@/server/strava'
import { getAllActivePactsPassedDeadline, submitResolve, type Pact } from '@/server/oracle'
import { getConnection } from '@/server/store'

async function verifyPact(pactId: number, pact: Pact): Promise<
  | { pactId: number; status: 'skipped'; reason: string }
  | { pactId: number; status: 'resolved'; actualValue: number; txHash: string }
> {
  if (!getConnection(pact.creator)) {
    return {
      pactId,
      status: 'skipped',
      reason: `No Strava connection for creator ${pact.creator}`,
    }
  }

  const { actual } = await getActivityProgress(pact.creator, pact.goalType, pact.createdAt)
  const receipt = await submitResolve(pactId, actual)

  return {
    pactId,
    status: 'resolved',
    actualValue: actual,
    txHash: receipt.hash,
  }
}

export async function runVerification(): Promise<{
  checked: number
  resolved: number
  skipped: number
  results: Array<
    | { pactId: number; status: 'skipped'; reason: string }
    | { pactId: number; status: 'resolved'; actualValue: number; txHash: string }
  >
}> {
  const pacts = await getAllActivePactsPassedDeadline()
  const results: Array<
    | { pactId: number; status: 'skipped'; reason: string }
    | { pactId: number; status: 'resolved'; actualValue: number; txHash: string }
  > = []

  for (const pact of pacts) {
    results.push(await verifyPact(pact.id!, pact))
  }

  return {
    checked: pacts.length,
    resolved: results.filter((result) => result.status === 'resolved').length,
    skipped: results.filter((result) => result.status === 'skipped').length,
    results,
  }
}
