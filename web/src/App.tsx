import { useEffect, useState } from 'react';
import { DaimoPayProvider, DaimoPayButton } from '@daimo/pay';
import { optimismUSDC } from '@daimo/pay-common';
import { WEB_APP_URL } from './lib/daimo';
import { getAddress } from 'viem';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { mainnet, base, optimism } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AnimatedLogo from './components/AnimatedLogo';

type Plan = { id: string; name: string; price: string; description: string; periodLabel: string };

const APP_ID = import.meta.env.VITE_DAIMO_APP_ID || 'pay-demo';
const REFUND_ADDRESS = getAddress(import.meta.env.VITE_DAIMO_REFUND_ADDRESS!);
const TREASURY_ADDRESS = getAddress(import.meta.env.VITE_DAIMO_TREASURY_ADDRESS!);

// Wagmi configuration
const config = createConfig({
  chains: [mainnet, base, optimism],
  transports: {
    [mainnet.id]: http(),
    [base.id]: http(),
    [optimism.id]: http(),
  },
});

const queryClient = new QueryClient();

function useQueryParams() {
  return new URLSearchParams(window.location.search);
}

function Page() {
  const q = useQueryParams();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const API_BASE = import.meta.env.VITE_API_BASE || '';

  useEffect(() => {
    const planId = q.get('plan');
    const uid = q.get('userId');
    setUserId(uid);

    if (!planId || !uid) { setLoading(false); return; }

    fetch(`${API_BASE}/api/plans/${planId}`)
      .then(r => r.json())
      .then(p => { setPlan(p); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="min-h-screen grid place-items-center">Loading…</div>;
  if (!plan || !userId) return <div className="min-h-screen grid place-items-center">Invalid link.</div>;

  return (
    <div className="min-h-screen">
      <header className="py-6 px-4">
        <div className="flex justify-center mb-4">
          <AnimatedLogo size="large" variant="light" />
        </div>
        <h1 className="text-2xl text-center font-space-grotesk font-bold text-[color:#DF00FF]">Premium Subscription</h1>
        <p className="text-center text-gray-300 mt-2">Unlock exclusive content with crypto payments.</p>
      </header>

      <main className="max-w-3xl mx-auto px-4 pb-10">
        <div className="bg-[color:#3A3A3E] rounded-2xl shadow-lg p-6">
          <h2 className="text-2xl font-space-grotesk">{plan.name}</h2>
          <p className="text-gray-300 mb-4">{plan.description}</p>
          <div className="flex items-baseline mb-6">
            <span className="text-4xl font-bold text-[color:#DF00FF]">{plan.price}</span>
            <span className="text-gray-400 ml-2">/ {plan.periodLabel}</span>
          </div>

          <div className="flex justify-center">
            <DaimoPayButton
              appId={APP_ID}
              intent="Subscribe"
              refundAddress={REFUND_ADDRESS}
              toAddress={TREASURY_ADDRESS}
              toChain={optimismUSDC.chainId}
              toToken={getAddress(optimismUSDC.token)}
              toUnits={plan.price}
              metadata={{ userId, planId: plan.id }}
              redirectReturnUrl={`${WEB_APP_URL}/thank-you`}
              defaultOpen
              closeOnSuccess
            />
          </div>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              ['Exclusive Content', 'Access premium streams and events.'],
              ['No Ads', 'Enjoy an ad-free experience.'],
              ['Priority Support', 'Get VIP customer support.'],
              ['Early Access', 'Be the first to see new features.'],
            ].map(([t, d]) => (
              <div key={t} className="bg-[color:#4A4A4E] p-4 rounded-xl">
                <h3 className="font-space-grotesk font-semibold">{t}</h3>
                <p className="text-gray-300 text-sm">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="py-6 text-center text-gray-400">
        <p>Powered by <span className="text-[color:#DF00FF]">Daimo Pay</span> | <a className="hover:text-white" href="https://pnptv.app">pnptv.app</a></p>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <DaimoPayProvider>
          <Page />
        </DaimoPayProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
