/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DAIMO_APP_ID: string
  readonly VITE_DAIMO_TREASURY_ADDRESS: string
  readonly VITE_DAIMO_REFUND_ADDRESS: string
  readonly VITE_WEB_APP_URL: string
  readonly VITE_API_BASE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
