"use client";

import { ReactNode } from "react";
import { Toaster } from "@/components/ui/toaster";

interface ProvidersProps {
  children: ReactNode;
  locale: string;
  messages: any;
}

export function Providers({ children, locale, messages }: ProvidersProps) {
  return (
    <>
      {children}
      <Toaster />
    </>
  );
}