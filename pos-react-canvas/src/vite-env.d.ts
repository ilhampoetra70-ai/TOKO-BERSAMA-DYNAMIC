/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_POS_API_BASE_URL?: string;
  readonly VITE_TOKOBERSAMA_BUILD_ID?: string;
  readonly VITE_ENABLE_MOCK_POS?: string;
}

interface Window {
  tokobersama?: {
    apiBaseUrl?: string;
    openExternal?: (url: string) => Promise<void>;
  };
  webkitAudioContext?: typeof AudioContext;
}
