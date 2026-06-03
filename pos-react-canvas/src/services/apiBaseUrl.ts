const DEFAULT_LOCAL_API_PORT = 8731;

function normalizeBaseUrl(value: string) {
  return value.replace(/\/+$/, '');
}

function isBrowserHttpContext() {
  return typeof window !== 'undefined' && (window.location.protocol === 'http:' || window.location.protocol === 'https:');
}

export function shouldRegisterRuntimeStaticAssets() {
  if (!isBrowserHttpContext()) {
    return false;
  }

  const apiBaseUrl = resolveRuntimeApiBaseUrl();
  if (!apiBaseUrl) {
    return false;
  }

  try {
    return new URL(apiBaseUrl).origin === window.location.origin;
  } catch {
    return false;
  }
}

export function resolveRuntimeApiBaseUrl() {
  if (typeof window === 'undefined') {
    return '';
  }

  const fromBridge = window.tokobersama?.apiBaseUrl?.trim();
  const fromEnv = import.meta.env.VITE_POS_API_BASE_URL?.trim();
  const configured = fromBridge || fromEnv;
  if (configured) {
    return normalizeBaseUrl(configured);
  }

  if (!isBrowserHttpContext()) {
    return '';
  }

  const currentPort = window.location.port;
  if (!currentPort || currentPort === String(DEFAULT_LOCAL_API_PORT)) {
    return normalizeBaseUrl(window.location.origin);
  }

  return normalizeBaseUrl(`${window.location.protocol}//${window.location.hostname}:${DEFAULT_LOCAL_API_PORT}`);
}

export function resolveRuntimeAdminUrl() {
  const apiBaseUrl = resolveRuntimeApiBaseUrl();
  return apiBaseUrl ? `${apiBaseUrl}/admin` : '/admin';
}

export function resolveRuntimePriceCheckerUrl() {
  const apiBaseUrl = resolveRuntimeApiBaseUrl();
  return apiBaseUrl ? `${apiBaseUrl}/price-checker` : '/price-checker';
}
