type EventName = 'payment_initiated' | 'payment_success' | 'payment_error' | 'subscription_activated';

interface AnalyticsProps {
  eventName: EventName;
  properties?: Record<string, any>;
}

export const trackEvent = ({ eventName, properties = {} }: AnalyticsProps) => {
  try {
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Event] ${eventName}`, properties);
    }
    
    // Send to your analytics service if configured
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', eventName, properties);
    }
  } catch (error) {
    console.error('Analytics error:', error);
  }
};

export const trackError = (error: Error, context: string) => {
  try {
    trackEvent({
      eventName: 'payment_error',
      properties: {
        error_message: error.message,
        error_context: context,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('Error logging error:', err);
  }
};