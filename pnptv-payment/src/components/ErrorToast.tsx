'use client';

import { useEffect } from 'react';

interface ErrorToastProps {
  message: string;
  onClose: () => void;
}

export function ErrorToast({ message, onClose }: ErrorToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed bottom-4 right-4 bg-red-500 text-white px-6 py-4 rounded-lg shadow-lg flex items-center space-x-2">
      <span>{message}</span>
      <button
        onClick={onClose}
        className="ml-4 text-white hover:text-red-100"
      >
        ✕
      </button>
    </div>
  );
}