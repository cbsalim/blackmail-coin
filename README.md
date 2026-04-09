# Blackmail

Stake USDC on a Strava goal. Do it, or pay up.

You set a goal, deadline, stake, and penalty recipient. If you hit your target, you get your money back. If you miss, it goes where you said it should. The app now runs as a single Next.js deployment with server-side API routes, designed for a simple Vercel-first PoC.

## How It Works

1. Connect your wallet. For the demo, preload Strava tokens for that wallet in `STRAVA_CONNECTIONS_JSON`.
2. Create a pact and lock USDC in the contract.
3. The app checks Strava progress through server-side API routes.
4. After the deadline, the oracle flow calls `resolve()` on-chain.
5. Goal met returns funds. Goal missed sends them to the penalty recipient.

## Local Run

Install app dependencies at the repo root:

```bash
npm install
```

Install contract dependencies if needed:

```bash
cd contracts
forge install
```

Create `.env.local` in the repo root:

```bash
NEXT_PUBLIC_ONCHAINKIT_API_KEY=
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=
NEXT_PUBLIC_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e

RPC_URL=https://mainnet.base.org
CONTRACT_ADDRESS=0x...
ORACLE_PRIVATE_KEY=0x...

STRAVA_CLIENT_ID=
STRAVA_CLIENT_SECRET=
STRAVA_REDIRECT_URI=http://localhost:3000/api/strava/callback

CRON_SECRET=
STRAVA_CONNECTIONS_JSON=[]
```

Demo example:

```bash
STRAVA_CONNECTIONS_JSON=[{"wallet":"0xe17a83DE922716b2dD739260324e7a07669C01Ad","stravaId":12345,"accessToken":"access-token","refreshToken":"refresh-token","expiresAt":1893456000}]
```

Run the app:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Deploying

Deploy the repo root to Vercel.

- The PoC is intended to run 100% on Vercel.
- `vercel.json` schedules `/api/cron/verify` once per day to stay within Vercel Hobby limits.
- If you need more frequent verification, call `/api/cron/verify` manually or from an external scheduler.

## What You Need

- Strava API app: create one at `strava.com/settings/api`. The callback domain must match the domain used in `STRAVA_REDIRECT_URI`.
- WalletConnect Project ID: required for wallet connection.
- Oracle wallet: funded wallet used to submit `resolve()` transactions on-chain.

## PoC Storage Model

This PoC does not use a database. Strava connections are seeded from `STRAVA_CONNECTIONS_JSON` and then kept in memory inside the server runtime.

For the demo, the intended path is to preload the demo wallet in `STRAVA_CONNECTIONS_JSON` and skip live Strava OAuth entirely.

OAuth callback writes are not durable storage. They survive only for the lifetime of a warm instance.

## Tech Stack

- Contract: Solidity, Foundry, Base
- App: Next.js App Router, server route handlers, wagmi, OnchainKit, Tailwind CSS
- USDC on Base: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
