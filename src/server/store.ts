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

function normalizeConnection(input: StravaConnectionInput): StravaConnection {
  const wallet = `${input.wallet || ''}`.toLowerCase()
  if (!/^0x[0-9a-fA-F]{40}$/.test(wallet)) {
    throw new Error(`Invalid wallet in STRAVA_CONNECTIONS_JSON: ${input.wallet}`)
  }

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
  if (!raw) {
    return new Map()
  }

  const parsed = JSON.parse(raw) as unknown
  const entries = Array.isArray(parsed)
    ? parsed
    : Object.entries((parsed ?? {}) as Record<string, StravaConnectionInput>).map(
        ([wallet, value]) => ({
          wallet,
          ...value,
        })
      )

  return new Map(
    entries.map((entry) => {
      const connection = normalizeConnection(entry as StravaConnectionInput)
      return [connection.wallet, connection] as const
    })
  )
}

function getStore(): Map<string, StravaConnection> {
  if (!globalThis.__blackmailStravaStore) {
    globalThis.__blackmailStravaStore = parseSeedConnections()
  }
  return globalThis.__blackmailStravaStore
}

export function getConnection(wallet: string): StravaConnection | null {
  return getStore().get(wallet.toLowerCase()) ?? null
}

export function upsertConnection(
  connection: Omit<StravaConnection, 'createdAt'> & { createdAt?: number }
): StravaConnection {
  const normalized = normalizeConnection(connection)
  const existing = getConnection(normalized.wallet)

  const nextValue: StravaConnection = {
    ...normalized,
    createdAt: existing?.createdAt ?? connection.createdAt ?? Math.floor(Date.now() / 1000),
  }

  getStore().set(nextValue.wallet, nextValue)
  return nextValue
}

export function updateTokens(
  wallet: string,
  tokens: Pick<StravaConnection, 'accessToken' | 'refreshToken' | 'expiresAt'>
): StravaConnection | null {
  const existing = getConnection(wallet)
  if (!existing) {
    return null
  }

  const updated: StravaConnection = {
    ...existing,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt: tokens.expiresAt,
  }

  getStore().set(updated.wallet, updated)
  return updated
}

export function getAllConnections(): StravaConnection[] {
  return Array.from(getStore().values())
}
