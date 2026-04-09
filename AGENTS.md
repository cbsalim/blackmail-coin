# Blackmail Coin Runbook

## Repo shape

- The repo root is the deployable Next.js app.
- `src/app/api` contains the server-side API routes used by the PoC.
- `contracts/` contains the Solidity contracts and Foundry setup.

## Local run

1. Create `.env.local`.
2. Fill in the required env vars.
3. Install dependencies.
4. Run the Next app.

Commands:

```bash
npm install
npm run dev
```

App URL:

```text
http://localhost:3000
```

## Vercel deploy

- Deploy the repo root.
- The app is intended to deploy 100% on Vercel for this PoC.
- `vercel.json` schedules `/api/cron/verify` once per day to stay within Vercel Hobby limits.

## Required env vars

Public client env vars:

```bash
NEXT_PUBLIC_ONCHAINKIT_API_KEY=
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=
NEXT_PUBLIC_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e
```

Server env vars:

```bash
RPC_URL=https://...
CONTRACT_ADDRESS=0x...
ORACLE_PRIVATE_KEY=0x...

STRAVA_CLIENT_ID=
STRAVA_CLIENT_SECRET=
STRAVA_REDIRECT_URI=http://localhost:3000/api/strava/callback

CRON_SECRET=
STRAVA_CONNECTIONS_JSON=[]
```

Notes:

- `STRAVA_REDIRECT_URI` should be the deployed app URL plus `/api/strava/callback`.
- `CRON_SECRET` is optional. If set, requests to `/api/cron/verify` must include `Authorization: Bearer <CRON_SECRET>`.
- `STRAVA_CONNECTIONS_JSON` is the PoC storage layer. It seeds the in-memory Strava connection store on startup.
- For demos, prefer preloading the demo wallet in `STRAVA_CONNECTIONS_JSON` and skipping live Strava OAuth.

## Example `STRAVA_CONNECTIONS_JSON`

Array form:

```json
[
  {
    "wallet": "0x1234567890123456789012345678901234567890",
    "stravaId": 12345,
    "accessToken": "access-token",
    "refreshToken": "refresh-token",
    "expiresAt": 1893456000
  },
  {
    "wallet": "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
    "stravaId": 67890,
    "accessToken": "another-access-token",
    "refreshToken": "another-refresh-token",
    "expiresAt": 1893459600
  }
]
```

Object form is also accepted:

```json
{
  "0x1234567890123456789012345678901234567890": {
    "stravaId": 12345,
    "accessToken": "access-token",
    "refreshToken": "refresh-token",
    "expiresAt": 1893456000
  }
}
```

## PoC limitation

- `STRAVA_CONNECTIONS_JSON` is only a seed. OAuth callback writes are kept in memory for the lifetime of a warm instance and are not durable storage.
- For a real deployment, replace this with persistent storage.
