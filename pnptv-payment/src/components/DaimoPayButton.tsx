'use client';

import { DaimoPayButton as Button } from '@daimo/pay';
import { useState, useEffect } from 'react';
import { PaymentSuccess } from './PaymentSuccess';

interface Props {
  amount: string;
  recipientAddress: string;
  onSuccess?: () => void;
}

export function DaimoPayButton({ amount, recipientAddress, onSuccess }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Handle success with animation before redirect
  const handleSuccess = () => {
    setShowSuccess(true);
    setIsLoading(false);
    setTimeout(() => {
      onSuccess?.();
    }, 2000);
  };

  return (
    <div className="relative">
      {/* Main payment button wrapper */}
      <div 
        className={`inline-flex items-center justify-center px-6 py-3 text-white rounded-lg transition-colors ${
          isLoading ? 'bg-gray-500 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600 cursor-pointer'
        }`}
      >
        {isLoading && (
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
        <span>
          {isLoading ? 'Processing...' : 'Pay with Daimo'}
        </span>
      </div>

      {/* Error message toast */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white px-6 py-4 rounded-lg shadow-lg animate-fade-in z-40">
          <div className="flex items-center gap-2">
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-2 text-white hover:text-red-100"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Success overlay */}
      {showSuccess && <PaymentSuccess />}
    </div>
  );
}