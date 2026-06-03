const TOKOBERSAMA_CACHE_PREFIX = 'tokobersama-';

async function unregisterServiceWorkers() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((registration) => registration.unregister()));
}

async function clearRuntimeCaches() {
  if (typeof window === 'undefined' || !('caches' in window)) {
    return;
  }

  const keys = await caches.keys();
  await Promise.all(
    keys
      .filter((key) => key.startsWith(TOKOBERSAMA_CACHE_PREFIX))
      .map((key) => caches.delete(key))
  );
}

export async function clearRuntimeWebAppState() {
  await Promise.all([
    unregisterServiceWorkers(),
    clearRuntimeCaches(),
  ]);
}
