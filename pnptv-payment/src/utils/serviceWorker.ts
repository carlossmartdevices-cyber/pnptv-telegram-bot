export function registerServiceWorker() {
  if (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    (window as any).workbox !== undefined
  ) {
    const wb = (window as any).workbox;
    
    // Add event listeners to handle any notifications and updates
    wb.addEventListener('installed', (event: any) => {
      console.log(`Service Worker installed: ${event.type}`);
    });

    wb.addEventListener('controlling', (event: any) => {
      console.log(`Service Worker controlling: ${event.type}`);
    });

    wb.addEventListener('activated', (event: any) => {
      console.log(`Service Worker activated: ${event.type}`);
    });

    // Send custom messages to the service worker
    wb.messageSW({ type: 'CACHE_URLS', payload: { urls: ['/'] } });

    // Register the service worker after all event listeners are added.
    wb.register();
  }
}