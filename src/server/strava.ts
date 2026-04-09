import { GoalType } from '@/lib/contract'
import { getRequiredEnv } from '@/server/env'
import { getConnection, type StravaConnection, updateTokens } from '@/server/store'

const STRAVA_BASE = 'https://www.strava.com/api/v3'

interface StravaTokenResponse {
  access_token: string
  refresh_token: string
  expires_at: number
  athlete?: {
    id?: number
  }
}

interface StravaActivity {
  type: string
  distance: number
}

async function postJson<T>(url: string, body: Record<string, string>): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(await response.text())
  }

  return (await response.json()) as T
}

async function refreshAccessToken(wallet: string, connection: StravaConnection): Promise<string> {
  const response = await postJson<StravaTokenResponse>('https://www.strava.com/oauth/token', {
    client_id: getRequiredEnv('STRAVA_CLIENT_ID'),
    client_secret: getRequiredEnv('STRAVA_CLIENT_SECRET'),
    grant_type: 'refresh_token',
    refresh_token: connection.refreshToken,
  })

  updateTokens(wallet, {
    accessToken: response.access_token,
    refreshToken: response.refresh_token,
    expiresAt: response.expires_at,
  })

  return response.access_token
}

export async function getValidAccessToken(
  wallet: string,
  connection: StravaConnection
): Promise<string> {
  const nowSeconds = Math.floor(Date.now() / 1000)
  if (connection.expiresAt - nowSeconds < 300) {
    return refreshAccessToken(wallet, connection)
  }
  return connection.accessToken
}

export async function fetchAllActivities(
  accessToken: string,
  afterTimestamp: number
): Promise<StravaActivity[]> {
  const activities: StravaActivity[] = []
  let page = 1

  while (true) {
    const url = new URL(`${STRAVA_BASE}/athlete/activities`)
    url.searchParams.set('after', String(afterTimestamp))
    url.searchParams.set('per_page', '200')
    url.searchParams.set('page', String(page))

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      throw new Error(await response.text())
    }

    const batch = (await response.json()) as StravaActivity[]
    activities.push(...batch)

    if (batch.length < 200) {
      break
    }

    page += 1
  }

  return activities
}

export function calculateActualValue(activities: StravaActivity[], goalType: GoalType): number {
  switch (goalType) {
    case GoalType.RunCount:
      return activities.filter((activity) => activity.type === 'Run').length
    case GoalType.RunDistance:
      return activities
        .filter((activity) => activity.type === 'Run')
        .reduce((sum, activity) => sum + Math.floor(activity.distance), 0)
    case GoalType.RideCount:
      return activities.filter((activity) => activity.type === 'Ride').length
    case GoalType.RideDistance:
      return activities
        .filter((activity) => activity.type === 'Ride')
        .reduce((sum, activity) => sum + Math.floor(activity.distance), 0)
    case GoalType.AnyActivityCount:
      return activities.length
    default:
      throw new Error(`Unknown goal type: ${goalType}`)
  }
}

export async function getActivityProgress(
  wallet: string,
  goalType: GoalType,
  createdAt: number
): Promise<{ actual: number; activities: StravaActivity[] }> {
  const connection = getConnection(wallet)
  if (!connection) {
    throw new Error('No Strava connection for wallet')
  }

  const accessToken = await getValidAccessToken(wallet, connection)
  const activities = await fetchAllActivities(accessToken, createdAt)
  const actual = calculateActualValue(activities, goalType)
  return { actual, activities }
}
