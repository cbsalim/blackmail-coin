import { createConfig, http } from 'wagmi'
import { base, baseSepolia } from 'viem/chains'
import { coinbaseWallet, injected } from 'wagmi/connectors'

export const config = createConfig({
  chains: [base, baseSepolia],
  connectors: [
    coinbaseWallet({
      appName: 'Blackmail',
      preference: 'eoaOnly', // browser extension, not smart wallet
    }),
    injected(),
  ],
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
  },
  ssr: true,
})
