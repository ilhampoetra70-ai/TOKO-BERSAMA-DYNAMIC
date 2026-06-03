import { createLocalPosApi } from './adapters/localPosApi';
import { mockPosApi } from './adapters/mockPosApi';
import { resolveRuntimeApiBaseUrl } from './apiBaseUrl';
import type { PosApi } from './posApi.types';

export type { PosApi } from './posApi.types';

function createUnavailablePosApi(): PosApi {
  const fail = async () => {
    throw new Error('Local API tidak ditemukan. Jalankan TOKOBERSAMA lewat launcher atau set VITE_POS_API_BASE_URL. Mock hanya aktif jika VITE_ENABLE_MOCK_POS=1.');
  };

  return new Proxy({
    eventName: 'tokobersama:workspace-updated',
    authExpiredEventName: 'tokobersama:auth-expired',
  }, {
    get(target, property) {
      if (property in target) {
        return target[property as keyof typeof target];
      }
      return fail;
    },
  }) as PosApi;
}

function createPosApi(): PosApi {
  const localApiBaseUrl = resolveRuntimeApiBaseUrl();

  if (localApiBaseUrl) {
    return createLocalPosApi({ baseUrl: localApiBaseUrl });
  }

  const mockEnabled = import.meta.env.VITE_ENABLE_MOCK_POS === '1' || import.meta.env.VITE_ENABLE_MOCK_POS === 'true';
  if (import.meta.env.PROD && !mockEnabled) {
    return createUnavailablePosApi();
  }

  return mockPosApi;
}

export const posApi = createPosApi();
