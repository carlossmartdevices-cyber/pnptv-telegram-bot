import { useState } from 'react';

interface UseRetryConfig {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
}

export function useRetry({
  maxAttempts = 3,
  initialDelay = 1000,
  maxDelay = 10000,
  backoffFactor = 2,
}: UseRetryConfig = {}) {
  const [attempt, setAttempt] = useState(0);
  const [delay, setDelay] = useState(initialDelay);

  const reset = () => {
    setAttempt(0);
    setDelay(initialDelay);
  };

  const retry = async <T>(operation: () => Promise<T>): Promise<T> => {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= maxAttempts - 1) {
        throw error;
      }

      await new Promise(resolve => setTimeout(resolve, delay));

      setAttempt(prev => prev + 1);
      setDelay(prev => Math.min(prev * backoffFactor, maxDelay));

      return retry(operation);
    }
  };

  return {
    retry,
    attempt,
    reset,
    hasAttemptsLeft: attempt < maxAttempts,
  };
}