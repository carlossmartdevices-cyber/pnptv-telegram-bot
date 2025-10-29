import { DaimoPayProvider, getDefaultConfig } from '@daimo/pay'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createConfig, WagmiProvider } from 'wagmi'
import PaymentPage from './PaymentPage'

// Use getDefaultConfig for automatic chain support
const wagmiConfig = createConfig(
  getDefaultConfig({
    appName: 'PNPtv Payment',
  })
)

const queryClient = new QueryClient()

function App() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <DaimoPayProvider debugMode>
          <PaymentPage />
        </DaimoPayProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

export default App
