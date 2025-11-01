interface Window {
  Telegram?: {
    WebApp: {
      close: () => void;
    };
  };
}

declare module '@daimo/pay' {
  export interface PaymentStartedEvent {
    id: string;
    reference: string;
    amount: string;
    timestamp: number;
  }

  export interface PaymentCompletedEvent {
    id: string;
    reference: string;
    amount: string;
    timestamp: number;
    transactionHash: string;
  }

  export interface DaimoPayButtonProps {
    appId: string;
    intent: 'Pay' | 'Subscribe' | 'Deposit';
    toAddress: string;
    toChain: number;
    toToken: string;
    toUnits: string;
    refundAddress: string;
    paymentOptions?: string[];
    defaultOpen?: boolean;
    closeOnSuccess?: boolean;
    onPaymentStarted?: (event: PaymentStartedEvent) => void;
    onPaymentCompleted?: (event: PaymentCompletedEvent) => void;
  }

  export function DaimoPayButton(props: DaimoPayButtonProps): JSX.Element;
  export function useDaimoPayUI(): any;
}