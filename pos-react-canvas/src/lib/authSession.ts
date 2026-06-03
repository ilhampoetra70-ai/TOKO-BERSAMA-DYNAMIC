import type { AuthSession } from '../services/posApi.types';

export const AUTH_STORAGE_KEY = 'tokobersama.pos.auth-session';
export const LAST_LOGIN_USERNAME_KEY = 'tokobersama.auth.last-username';
export const LAST_LOGIN_USERNAME_TTL_MS = 8 * 60 * 60 * 1000;

let runtimeAuthToken = '';

type LastLoginUsernamePayload = {
  username: string;
  savedAt: number;
};

function parseLastLoginUsername(raw: string | null): LastLoginUsernamePayload | null {
  if (!raw) {
    return null;
  }

  try {
    const payload = JSON.parse(raw) as Partial<LastLoginUsernamePayload>;
    if (!payload.username || typeof payload.username !== 'string' || typeof payload.savedAt !== 'number') {
      return null;
    }

    return {
      username: payload.username,
      savedAt: payload.savedAt,
    };
  } catch {
    return null;
  }
}

export function clearExpiredLastLoginUsername(now = Date.now()) {
  if (typeof window === 'undefined') {
    return;
  }

  const payload = parseLastLoginUsername(window.localStorage.getItem(LAST_LOGIN_USERNAME_KEY));
  if (!payload || now - payload.savedAt > LAST_LOGIN_USERNAME_TTL_MS) {
    window.localStorage.removeItem(LAST_LOGIN_USERNAME_KEY);
  }
}

export function readLastLoginUsername(now = Date.now()): string {
  if (typeof window === 'undefined') {
    return '';
  }

  const payload = parseLastLoginUsername(window.localStorage.getItem(LAST_LOGIN_USERNAME_KEY));
  if (!payload || now - payload.savedAt > LAST_LOGIN_USERNAME_TTL_MS) {
    window.localStorage.removeItem(LAST_LOGIN_USERNAME_KEY);
    return '';
  }

  return payload.username;
}

export function writeLastLoginUsername(username: string, now = Date.now()) {
  if (typeof window === 'undefined') {
    return;
  }

  const nextUsername = username.trim();
  if (!nextUsername) {
    window.localStorage.removeItem(LAST_LOGIN_USERNAME_KEY);
    return;
  }

  window.localStorage.setItem(LAST_LOGIN_USERNAME_KEY, JSON.stringify({
    username: nextUsername,
    savedAt: now,
  }));
}

export function readStoredSession(): AuthSession | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.sessionStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const session = JSON.parse(raw) as AuthSession;
    runtimeAuthToken = session.token || '';
    return session;
  } catch {
    runtimeAuthToken = '';
    window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

export function writeStoredSession(session: AuthSession) {
  runtimeAuthToken = session.token || '';

  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}

export function readRuntimeAuthToken() {
  return runtimeAuthToken;
}

export function clearStoredSession() {
  runtimeAuthToken = '';

  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}
