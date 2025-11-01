import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring
  // We recommend adjusting this value in production
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Set `debug` to true if you want to see debug logs
  debug: false,

  // Capture Replay for 10% of all sessions,
  // plus, capture replays for 100% of sessions with an error
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  environment: process.env.NODE_ENV,
  
  // Configure which URLs should be ignored
  denyUrls: [
    // Browser extensions
    /extensions\//i,
    /^chrome:\/\//i,
    // Random plugins/extensions
    /127\.0\.0\.1:4001\/isrunning/i,
    // See http://blog.errorception.com/2012/03/tale-of-unfindable-js-error.html for example
    /webappstart\.blob\.core\.windows\.net/i,
  ],

  // Configure which URLs should be included
  allowUrls: [
    // Your app domain
    /\.example\.com/i,
    // Localhost for development
    /localhost/i,
  ],
});

export default Sentry;