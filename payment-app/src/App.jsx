import { WagmiProvider, createConfig, http } from 'wagmi'
import { base, mainnet, optimism, arbitrum, polygon } from 'wagmi/chains'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DaimoPayProvider } from '@daimo/pay'
import CheckoutPage from './components/CheckoutPage'

// Create Wagmi config with all supported chains
const config = createConfig({
  chains: [base, mainnet, optimism, arbitrum, polygon],
  transports: {
    [base.id]: http(),
    [mainnet.id]: http(),
    [optimism.id]: http(),
    [arbitrum.id]: http(),
    [polygon.id]: http(),
  },
})

const queryClient = new QueryClient()

function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <DaimoPayProvider>
          <CheckoutPage />
        </DaimoPayProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

export default App
