'use client';

import { DaimoPayButton } from '@/components/DaimoPayButton';

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black">
        <div className="flex flex-col items-center gap-6 text-center">
          <h1 className="text-4xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
            PNPtv Payment
          </h1>
          <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Complete your subscription payment to access premium features
          </p>
          <div className="mt-8">
            <DaimoPayButton
              amount="10"
              recipientAddress={process.env.NEXT_PUBLIC_RECIPIENT_ADDRESS || ''}
              onSuccess={() => {
                window.location.href = '/success';
              }}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
