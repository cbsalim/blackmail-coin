import { ethers } from 'ethers'

import { PACT_ABI } from '@/lib/contract'
import { getRequiredEnv } from '@/server/env'

export interface Pact {
  id?: number
  creator: string
  goalType: number
  targetValue: bigint
  deadline: number
  stakeAmount: bigint
  penaltyRecipient: string
  status: number
  createdAt: number
}

let provider: ethers.JsonRpcProvider | undefined
let wallet: ethers.Wallet | undefined
let contract: ethers.Contract | undefined

function getContract(): ethers.Contract {
  if (!contract) {
    provider = new ethers.JsonRpcProvider(getRequiredEnv('RPC_URL'))
    wallet = new ethers.Wallet(getRequiredEnv('ORACLE_PRIVATE_KEY'), provider)
    contract = new ethers.Contract(getRequiredEnv('CONTRACT_ADDRESS'), PACT_ABI, wallet)
  }

  return contract
}

export async function getPactCount(): Promise<number> {
  const pactCount = await getContract().pactCount()
  return Number(pactCount)
}

export async function getPact(pactId: number): Promise<Pact> {
  const pact = await getContract().getPact(pactId)

  return {
    creator: pact.creator,
    goalType: Number(pact.goalType),
    targetValue: BigInt(pact.targetValue),
    deadline: Number(pact.deadline),
    stakeAmount: BigInt(pact.stakeAmount),
    penaltyRecipient: pact.penaltyRecipient,
    status: Number(pact.status),
    createdAt: Number(pact.createdAt),
  }
}

export async function submitResolve(pactId: number, actualValue: number): Promise<ethers.TransactionReceipt> {
  const tx = await getContract().resolve(pactId, actualValue)
  const receipt = await tx.wait()

  if (!receipt) {
    throw new Error(`Missing transaction receipt for pact ${pactId}`)
  }

  return receipt
}

export async function getAllActivePactsPassedDeadline(): Promise<Pact[]> {
  const count = await getPactCount()
  if (count === 0) {
    return []
  }

  const now = Math.floor(Date.now() / 1000)
  const results: Pact[] = []
  const batchSize = 20

  for (let start = 0; start < count; start += batchSize) {
    const ids = Array.from(
      { length: Math.min(batchSize, count - start) },
      (_, offset) => start + offset
    )

    const pacts = await Promise.all(
      ids.map(async (id) => ({
        id,
        ...(await getPact(id)),
      }))
    )

    for (const pact of pacts) {
      if (pact.status === 0 && pact.deadline <= now) {
        results.push(pact)
      }
    }
  }

  return results
}
