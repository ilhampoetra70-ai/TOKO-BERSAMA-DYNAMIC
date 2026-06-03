import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { clearStoredSession, readLastLoginUsername, readStoredSession, writeLastLoginUsername, writeStoredSession } from '../../lib/authSession';
import { posApi } from '../../services/posApi';
import type { AppSettings, AuthSession } from '../../services/posApi.types';
import { fallbackStore } from '../types';

export function useAdminSession() {
  const [session, setSession] = useState<AuthSession | null>(() => readStoredSession());
  const [storeIdentity, setStoreIdentity] = useState<AppSettings['store']>(fallbackStore);
  const [loginUsername, setLoginUsername] = useState(() => readLastLoginUsername());
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [passwordCurrent, setPasswordCurrent] = useState('');
  const [passwordNext, setPasswordNext] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Sync store identity when logged out
  useEffect(() => {
    if (session) return;

    let active = true;
    const syncStoreIdentity = async () => {
      try {
        const nextStore = await posApi.getPublicStoreIdentity();
        if (active) setStoreIdentity(nextStore);
      } catch {
        if (active) setStoreIdentity(fallbackStore);
      }
    };

    void syncStoreIdentity();
    return () => { active = false; };
  }, [session]);

  // Persist session changes
  useEffect(() => {
    if (!session || session.forcePasswordChange) return;
    writeStoredSession(session);
  }, [session]);

  useEffect(() => {
    if (session) {
      return;
    }

    const initialLastUsername = readLastLoginUsername();
    if (initialLastUsername !== loginUsername) {
      setLoginUsername(initialLastUsername);
    }

    const intervalId = window.setInterval(() => {
      const nextLastUsername = readLastLoginUsername();
      setLoginUsername((current) => (current === initialLastUsername ? nextLastUsername : current));
    }, 60000);

    return () => window.clearInterval(intervalId);
  }, [session]);

  // Handle auth expired events
  useEffect(() => {
    const handleAuthExpired = (event: Event) => {
      const detail = event instanceof CustomEvent ? (event.detail as { message?: string } | undefined) : undefined;
      window.history.replaceState({}, '', '/admin');
      clearStoredSession();
      setSession(null);
      setLoginError(detail?.message || 'Sesi admin berakhir. Silakan login ulang.');
    };

    window.addEventListener(posApi.authExpiredEventName, handleAuthExpired);
    return () => window.removeEventListener(posApi.authExpiredEventName, handleAuthExpired);
  }, []);

  const handleLogin = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginLoading(true);
    setLoginError('');

    try {
      const nextSession = await posApi.login({
        username: loginUsername.trim(),
        password: loginPassword,
      });
      const persistedSession = { ...nextSession, rotatedMasterKey: undefined };
      writeLastLoginUsername(nextSession.user.username || loginUsername);
      writeStoredSession(persistedSession);
      setSession(persistedSession);
      setLoginPassword('');
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Login admin gagal.');
    } finally {
      setLoginLoading(false);
    }
  }, [loginUsername, loginPassword]);

  const handlePasswordChange = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session) return;

    if (passwordNext !== passwordConfirm) {
      setPasswordError('Konfirmasi password tidak sama.');
      return;
    }

    setPasswordLoading(true);
    setPasswordError('');
    try {
      const payload = await posApi.changePassword({
        currentPassword: session.forcePasswordChange ? undefined : passwordCurrent,
        nextPassword: passwordNext,
      });
      const nextSession = {
        ...session,
        user: payload.user,
        forcePasswordChange: payload.forcePasswordChange,
      };
      setSession(nextSession);
      writeStoredSession(nextSession);
      setPasswordCurrent('');
      setPasswordNext('');
      setPasswordConfirm('');
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : 'Gagal mengganti password.');
    } finally {
      setPasswordLoading(false);
    }
  }, [session, passwordCurrent, passwordNext, passwordConfirm]);

  const handleLogout = useCallback(async () => {
    if (session?.token) {
      try { await posApi.logout(session.token); } catch { /* noop */ }
    }

    clearStoredSession();
    setSession(null);
    setPasswordCurrent('');
    setPasswordNext('');
    setPasswordConfirm('');
    setLoginError('');
    window.history.replaceState({}, '', '/admin');
  }, [session]);

  return {
    session,
    storeIdentity,
    setStoreIdentity,
    loginUsername,
    setLoginUsername,
    loginPassword,
    setLoginPassword,
    loginError,
    setLoginError,
    loginLoading,
    passwordCurrent,
    setPasswordCurrent,
    passwordNext,
    setPasswordNext,
    passwordConfirm,
    setPasswordConfirm,
    passwordError,
    passwordLoading,
    handleLogin,
    handlePasswordChange,
    handleLogout,
  };
}
