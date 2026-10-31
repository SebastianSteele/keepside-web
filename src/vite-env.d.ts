/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_KEEPSIDE_API_URL?: string
  readonly VITE_KEEPSIDE_DEMO?: 'true' | 'false'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
