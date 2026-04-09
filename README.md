# Blackmail

Stake USDC on a Strava goal. Do it, or pay up.

You set a goal (miles run, rides completed, total activities), a deadline, and a USDC stake. If you hit your target, you get your money back. If you miss, it goes to whoever you named — a burn address, a charity, or someone who will enjoy watching you lose.

After the deadline, a backend oracle fetches your Strava data and submits the result on-chain. If the oracle goes quiet, anyone can claim a refund after a 7-day grace period — enforced by the contract, not by trust.

## How It Works

1. Connect your wallet and Strava account
2. Set your goal, deadline, stake, and penalty recipient
3. Approve USDC and create the pact — funds go into escrow on Base
4. Oracle checks Strava after deadline and calls `resolve()` on-chain
5. Goal met → USDC returned. Goal missed → USDC sent to penalty recipient.

## Quick Start

**Install dependencies**

```bash
# Contracts
cd contracts && forge install

# Backend
cd backend && npm install

# Frontend
cd frontend && npm install
```

**Configure environment**

```bash
# backend/.env
STRAVA_CLIENT_ID=your_strava_client_id
STRAVA_CLIENT_SECRET=your_strava_client_secret
STRAVA_REDIRECT_URI=http://localhost:3001/api/strava/callback
FRONTEND_URL=http://localhost:3000
RPC_URL=https://mainnet.base.org
ORACLE_PRIVATE_KEY=0x...
CONTRACT_ADDRESS=0x...
DB_PATH=./pact.db
PORT=3001

# frontend/.env.local
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
NEXT_PUBLIC_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_API_URL=http://localhost:3001
```

**Deploy the contract**

```bash
cd contracts
ORACLE_ADDRESS=0x... forge script script/Deploy.s.sol \
  --rpc-url https://mainnet.base.org \
  --private-key 0x... \
  --broadcast --verify
```

**Run**

```bash
# Terminal 1
cd backend && npm start

# Terminal 2
cd frontend && npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## What You Need

**Strava API app** — create one at [strava.com/settings/api](https://www.strava.com/settings/api). Set the callback domain to your deployed backend URL. The `Authorization Callback Domain` field must match your `STRAVA_REDIRECT_URI`.

**WalletConnect Project ID** — free at [cloud.walletconnect.com](https://cloud.walletconnect.com). Required for wallet connection.

**Oracle wallet** — a funded wallet that the backend uses to submit `resolve()` transactions on-chain. Needs ETH for gas. Generate one with `cast wallet new`.

## Goal Types

| Type | Unit | Example |
|---|---|---|
| Run Count | runs | Run 10 times |
| Run Distance | miles | Run 100 miles |
| Ride Count | rides | Ride 5 times |
| Ride Distance | miles | Ride 200 miles |
| Any Activity | activities | 20 any activities |

## Deploying

**Backend → Railway**
Push to GitHub, connect to Railway, add env vars. Set `STRAVA_REDIRECT_URI` to your Railway URL.

**Frontend → Vercel**
Push to GitHub, connect to Vercel, add env vars. Set `NEXT_PUBLIC_API_URL` to your Railway backend URL.

## Tech Stack

- **Contract** — Solidity, Foundry, deployed on Base
- **Backend** — Node.js, Express, SQLite, ethers.js, node-cron
- **Frontend** — Next.js 14 (App Router), wagmi v2, RainbowKit, Tailwind CSS
- **USDC on Base** — `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`

## Testnet Deployment

Contract deployed on Base Sepolia: [`0x5C19a7CAF15fE1Ed512C1fC8BbF43C63ad9b0d24`](https://base-sepolia.blockscout.com/address/0x5c19a7caf15fe1ed512c1fc8bbf43c63ad9b0d24)
