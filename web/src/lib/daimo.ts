import { getDefaultConfig } from '@daimo/pay';

export const WEB_APP_URL = import.meta.env.VITE_WEB_APP_URL || 'https://pay.pnptv.app';

export const daimoConfig = getDefaultConfig({
  appName: 'PNPtv',
  appIcon: `${WEB_APP_URL}/icon.png`,
  appUrl: WEB_APP_URL,
});
