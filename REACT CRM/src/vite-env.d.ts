/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_PUSHER_APP_KEY: string;
  readonly VITE_PUSHER_HOST: string;
  readonly VITE_PUSHER_PORT: string;
  readonly VITE_PUSHER_TLS: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
