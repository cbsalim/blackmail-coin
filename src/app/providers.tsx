'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { OnchainKitProvider } from '@coinbase/onchainkit'
import { WagmiProvider } from 'wagmi'
import { baseSepolia } from 'viem/chains'
import { config } from '@/lib/wagmi'
import { useState } from 'react'
import Navbar from '@/components/Navbar'

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <OnchainKitProvider
          apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
          chain={baseSepolia}
        >
          <Navbar />
          <main>{children}</main>
        </OnchainKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
