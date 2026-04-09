import { kv } from '@vercel/kv'

export interface StravaConnection {
  wallet: string
  stravaId: number | null
  accessToken: string
  refreshToken: string
  expiresAt: number
  createdAt: number
}

type StravaConnectionInput = Partial<StravaConnection> & {
  wallet?: string
  strava_id?: number | null
  access_token?: string
  refresh_token?: string
  expires_at?: number
  created_at?: number
}

declare global {
  // eslint-disable-next-line no-var
  var __blackmailStravaStore: Map<string, StravaConnection> | undefined
}

const WALLET_INDEX_KEY = 'strava:wallets'

// Demo-only fallback so the Vercel deploy can resolve progress even if KV writes are flaky.
const HARDCODED_DEMO_CONNECTIONS: StravaConnectionInput[] = [
  {
    wallet: '0x0e355a24d50bf972b46b031f5406773201b7ad73',
    stravaId: 1041864364,
    accessToken: '280b24e6b34b282f42227efedc95e75252258a67',
    refreshToken: 'e7172939b20a4f6414778111fe2eec69f000a821',
    expiresAt: 1775776579,
  },
]

const SHARED_DEMO_CONNECTION = HARDCODED_DEMO_CONNECTIONS[0]

function normalizeWallet(wallet: string): string {
  const normalized = `${wallet || ''}`.toLowerCase()
  if (!/^0x[0-9a-fA-F]{40}$/.test(normalized)) {
    throw new Error(`Invalid wallet in STRAVA_CONNECTIONS_JSON: ${wallet}`)
  }

  return normalized
}

function normalizeConnection(input: StravaConnectionInput): StravaConnection {
  const wallet = normalizeWallet(`${input.wallet || ''}`)
  const accessToken = input.accessToken ?? input.access_token
  const refreshToken = input.refreshToken ?? input.refresh_token
  const expiresAt = Number(input.expiresAt ?? input.expires_at)
  const createdAt = Number(input.createdAt ?? input.created_at ?? Math.floor(Date.now() / 1000))
  const stravaIdValue = input.stravaId ?? input.strava_id ?? null

  if (!accessToken || !refreshToken || !Number.isFinite(expiresAt)) {
    throw new Error(`Incomplete Strava connection for wallet ${wallet}`)
  }

  return {
    wallet,
    stravaId: stravaIdValue === null ? null : Number(stravaIdValue),
    accessToken,
    refreshToken,
    expiresAt,
    createdAt,
  }
}

function parseSeedConnections(): Map<string, StravaConnection> {
  const raw = process.env.STRAVA_CONNECTIONS_JSON
  const envEntries = (() => {
    if (!raw) {
      return [] as StravaConnectionInput[]
    }

    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed)
      ? (parsed as StravaConnectionInput[])
      : Object.entries((parsed ?? {}) as Record<string, StravaConnectionInput>).map(
          ([wallet, value]) => ({
            wallet,
            ...value,
          })
        )
  })()

  const entries = [...HARDCODED_DEMO_CONNECTIONS, ...envEntries]

  return new Map(
    entries.map((entry) => {
      const connection = normalizeConnection(entry as StravaConnectionInput)
      return [connection.wallet, connection] as const
    })
  )
}

function getMemoryStore(): Map<string, StravaConnection> {
  if (!globalThis.__blackmailStravaStore) {
    globalThis.__blackmailStravaStore = parseSeedConnections()
  }

  return globalThis.__blackmailStravaStore
}

function isKvConfigured(): boolean {
  return Boolean(
    (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) ||
      (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
  )
}

function getConnectionKey(wallet: string): string {
  return `strava:${normalizeWallet(wallet)}`
}

function getSharedDemoConnection(wallet: string): StravaConnection | null {
  if (!SHARED_DEMO_CONNECTION) {
    return null
  }

  return normalizeConnection({
    ...SHARED_DEMO_CONNECTION,
    wallet,
  })
}

async function getWalletIndex(): Promise<string[]> {
  if (!isKvConfigured()) {
    return []
  }

  return (await kv.get<string[]>(WALLET_INDEX_KEY)) ?? []
}

async function addWalletToIndex(wallet: string): Promise<void> {
  if (!isKvConfigured()) {
    return
  }

  const normalizedWallet = normalizeWallet(wallet)
  const wallets = await getWalletIndex()
  if (wallets.includes(normalizedWallet)) {
    return
  }

  await kv.set(WALLET_INDEX_KEY, [...wallets, normalizedWallet])
}

export async function getConnection(wallet: string): Promise<StravaConnection | null> {
  const normalizedWallet = normalizeWallet(wallet)

  if (isKvConfigured()) {
    const stored = await kv.get<StravaConnectionInput>(getConnectionKey(normalizedWallet))
    if (stored) {
      return normalizeConnection({
        ...stored,
        wallet: normalizedWallet,
      })
    }
  }

  return getMemoryStore().get(normalizedWallet) ?? getSharedDemoConnection(normalizedWallet)
}

export async function upsertConnection(
  connection: Omit<StravaConnection, 'createdAt'> & { createdAt?: number }
): Promise<StravaConnection> {
  const normalized = normalizeConnection(connection)
  const existing = await getConnection(normalized.wallet)

  const nextValue: StravaConnection = {
    ...normalized,
    createdAt: existing?.createdAt ?? connection.createdAt ?? Math.floor(Date.now() / 1000),
  }

  if (isKvConfigured()) {
    await kv.set(getConnectionKey(nextValue.wallet), nextValue)
    await addWalletToIndex(nextValue.wallet)
  } else {
    getMemoryStore().set(nextValue.wallet, nextValue)
  }

  return nextValue
}

export async function updateTokens(
  wallet: string,
  tokens: Pick<StravaConnection, 'accessToken' | 'refreshToken' | 'expiresAt'>
): Promise<StravaConnection | null> {
  const existing = await getConnection(wallet)
  if (!existing) {
    return null
  }

  const updated: StravaConnection = {
    ...existing,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt: tokens.expiresAt,
  }

  if (isKvConfigured()) {
    await kv.set(getConnectionKey(updated.wallet), updated)
    await addWalletToIndex(updated.wallet)
  } else {
    getMemoryStore().set(updated.wallet, updated)
  }

  return updated
}

export async function getAllConnections(): Promise<StravaConnection[]> {
  if (!isKvConfigured()) {
    return Array.from(getMemoryStore().values())
  }

  const wallets = new Set<string>([
    ...parseSeedConnections().keys(),
    ...(await getWalletIndex()),
  ])

  const connections = await Promise.all(
    Array.from(wallets).map(async (wallet) => getConnection(wallet))
  )

  return connections.filter((connection): connection is StravaConnection => connection !== null)
}
