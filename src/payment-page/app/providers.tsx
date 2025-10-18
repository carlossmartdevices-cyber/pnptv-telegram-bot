'use client'

import { DaimoPayProvider, getDefaultConfig } from '@daimo/pay'
import { WagmiProvider, createConfig, http } from 'wagmi'
import { base, optimism, arbitrum, polygon } from 'wagmi/chains'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

// Create wagmi config with support for major chains
const wagmiConfig = createConfig(
  getDefaultConfig({
    appName: 'PNPtv Subscription Payments',
    chains: [base, optimism, arbitrum, polygon],
    transports: {
      [base.id]: http(),
      [optimism.id]: http(),
      [arbitrum.id]: http(),
      [polygon.id]: http(),
    },
  })
)

export function Providers({ children }: { children: React.ReactNode }) {
  // Create QueryClient inside component to avoid SSR issues
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        refetchOnWindowFocus: false,
      },
    },
  }))

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <DaimoPayProvider>
          {children}
        </DaimoPayProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
