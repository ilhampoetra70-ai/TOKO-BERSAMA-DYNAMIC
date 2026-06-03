import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Topbar } from './components/Topbar';
import { clearStoredSession, readLastLoginUsername, writeLastLoginUsername, writeStoredSession } from './lib/authSession';
import { applyDocumentAppearance, defaultPosTheme, readStoredAppearance, readStoredPosThemeForUsername, writeStoredPosThemeForUsername } from './lib/appearance';
import { posApi } from './services/posApi';
import type { PosWorkspaceSnapshot } from './contracts/pos';
import type { AppSettings, AuthSession } from './services/posApi.types';
import { Button } from './components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { ArrowRight, Clock3, Database, KeyRound, ShieldCheck, Store, UserRound } from 'lucide-react';

type AppPhase = 'loading' | 'ready' | 'error';
const IDLE_TIMEOUT_MS = 15 * 60 * 1000;
const PosView = lazy(() => import('./components/views/PosView').then((module) => ({ default: module.PosView })));
const MobileAdminApp = lazy(() => import('./mobile-admin/MobileAdminApp').then((module) => ({ default: module.MobileAdminApp })));
const PriceCheckerApp = lazy(() => import('./price-checker/PriceCheckerApp').then((module) => ({ default: module.PriceCheckerApp })));
const CloudflareConnectorApp = lazy(() => import('./cloudflare/CloudflareConnectorApp').then((module) => ({ default: module.CloudflareConnectorApp })));
const fallbackStore: AppSettings['store'] = {
  name: 'TOKO BERSAMA MATERIAL',
  address: '',
  phone: '',
  logoDataUrl: null,
  logoFileName: '',
  logoFileSizeKb: null,
};

export default function App() {
  const pathname = window.location.pathname;
  if (pathname.startsWith('/price-checker')) {
    return (
      <Suspense fallback={<div className="grid min-h-screen place-items-center bg-[#101418] text-slate-100">Memuat price checker...</div>}>
        <PriceCheckerApp />
      </Suspense>
    );
  }
  if (pathname.startsWith('/admin')) {
    return (
      <Suspense fallback={<div className="grid min-h-screen place-items-center bg-[#101418] text-slate-100">Memuat admin...</div>}>
        <MobileAdminApp />
      </Suspense>
    );
  }
  if (pathname.startsWith('/connector')) {
    return (
      <Suspense fallback={<div className="grid min-h-screen place-items-center bg-[#101418] text-slate-100">Memuat connector...</div>}>
        <CloudflareConnectorApp />
      </Suspense>
    );
  }

  const [phase, setPhase] = useState<AppPhase>('loading');
  const [snapshot, setSnapshot] = useState<PosWorkspaceSnapshot | null>(null);
  const [errorMessage, setErrorMessage] = useState('Unable to load workspace snapshot.');
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loginUsername, setLoginUsername] = useState(() => readLastLoginUsername());
  const [loginPassword, setLoginPassword] = useState('');
  const [loginTotpCode, setLoginTotpCode] = useState('');
  const [loginMode, setLoginMode] = useState<'password' | 'recovery'>('password');
  const [recoveryMethod, setRecoveryMethod] = useState<'totp' | 'masterkey'>('totp');
  const [offlineMasterKey, setOfflineMasterKey] = useState('');
  const [oneTimeMasterKey, setOneTimeMasterKey] = useState('');
  const [loginError, setLoginError] = useState('');
  const [sessionMessage, setSessionMessage] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [passwordCurrent, setPasswordCurrent] = useState('');
  const [passwordNext, setPasswordNext] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [storeIdentity, setStoreIdentity] = useState<AppSettings['store']>(fallbackStore);
  const [posBusy, setPosBusy] = useState(false);
  const posBusyRef = useRef(false);

  useEffect(() => {
    posBusyRef.current = posBusy;
  }, [posBusy]);

  useEffect(() => {
    clearStoredSession();
  }, []);

  useEffect(() => {
    const handleBeforeUnload = () => {
      clearStoredSession();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  useEffect(() => {
    if (session) {
      return;
    }

    let active = true;

    const syncLoginStoreIdentity = async () => {
      try {
        const nextStore = await posApi.getPublicStoreIdentity();
        if (active) {
          setStoreIdentity(nextStore);
        }
      } catch {
        if (active) {
          setStoreIdentity(fallbackStore);
        }
      }
    };

    void syncLoginStoreIdentity();
    window.addEventListener(posApi.eventName, syncLoginStoreIdentity);

    return () => {
      active = false;
      window.removeEventListener(posApi.eventName, syncLoginStoreIdentity);
    };
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

  useEffect(() => {
    if (session) {
      return;
    }

    const username = loginUsername.trim();
    if (!username) {
      return;
    }

    const storedAppearance = readStoredAppearance('pos');
    const storedTheme = readStoredPosThemeForUsername(username);
    if (!storedTheme) {
      return;
    }

    applyDocumentAppearance('pos', {
      mode: storedAppearance?.mode ?? 'auto',
      scale: storedAppearance?.scale ?? 'md',
      theme: storedTheme ?? defaultPosTheme,
    });
  }, [loginUsername, session]);

  useEffect(() => {
    if (!session || session.forcePasswordChange) {
      setSnapshot(null);
      setPhase('loading');
      return;
    }

    let active = true;

    const syncShellData = async () => {
      try {
        const [nextSnapshot, nextSettings, nextUsers] = await Promise.all([
          posApi.getWorkspaceSnapshot(),
          posApi.getAppSettings(),
          posApi.listUsers(),
        ]);
        if (!active) {
          return;
        }

        setSnapshot(nextSnapshot);
        setStoreIdentity(nextSettings.store);
        const refreshedSessionUser = nextUsers.items.find((row) => row.id === session.user.id);
        if (refreshedSessionUser && JSON.stringify(refreshedSessionUser) !== JSON.stringify(session.user)) {
          const nextSession = {
            ...session,
            user: refreshedSessionUser,
            rolePermissions: nextUsers.rolePermissions,
          };
          setSession(nextSession);
          writeStoredSession(nextSession);
        }
        setPhase('ready');
      } catch (error: unknown) {
        if (!active) {
          return;
        }

        const message = error instanceof Error ? error.message : 'Unable to load workspace snapshot.';
        setErrorMessage(message);
        setPhase('error');
      }
    };

    const handleWorkspaceUpdate = () => {
      if (posBusyRef.current) {
        return;
      }
      void syncShellData();
    };

    void syncShellData();
    const intervalId = window.setInterval(() => {
      if (!posBusyRef.current) void syncShellData();
    }, 30000);
    window.addEventListener(posApi.eventName, handleWorkspaceUpdate);
    window.addEventListener('focus', handleWorkspaceUpdate);

    return () => {
      active = false;
      window.clearInterval(intervalId);
      window.removeEventListener(posApi.eventName, handleWorkspaceUpdate);
      window.removeEventListener('focus', handleWorkspaceUpdate);
    };
  }, [session]);
  useEffect(() => {
    const handleAuthExpired = (event: Event) => {
      const detail = event instanceof CustomEvent ? event.detail as { message?: string } : null;
      window.history.replaceState({}, '', '/admin');
      setSession(null);
      setSnapshot(null);
      setPhase('loading');
      setOneTimeMasterKey('');
      setSessionMessage(detail?.message || 'Sesi sudah berakhir. Silakan login ulang.');
      clearStoredSession();
    };

    window.addEventListener(posApi.authExpiredEventName, handleAuthExpired);
    return () => window.removeEventListener(posApi.authExpiredEventName, handleAuthExpired);
  }, []);

  useEffect(() => {
    if (!session || session.forcePasswordChange) {
      return;
    }

    let timeoutId: ReturnType<typeof window.setTimeout> | null = null;

    const expireSession = () => {
      void posApi.logout(session.token).catch(() => undefined);
      clearStoredSession();
      setSession(null);
      setSnapshot(null);
      setPhase('loading');
      setOneTimeMasterKey('');
      setSessionMessage('Sesi berakhir karena tidak ada aktivitas selama 15 menit. Silakan login ulang.');
    };

    const resetIdleTimer = () => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
      timeoutId = window.setTimeout(expireSession, IDLE_TIMEOUT_MS);
    };

    const events: Array<keyof WindowEventMap> = ['pointerdown', 'keydown', 'wheel', 'touchstart', 'focus'];
    for (const eventName of events) {
      window.addEventListener(eventName, resetIdleTimer, { passive: true });
    }

    resetIdleTimer();

    return () => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
      for (const eventName of events) {
        window.removeEventListener(eventName, resetIdleTimer);
      }
    };
  }, [session]);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginLoading(true);
    setLoginError('');

    try {
      const nextSession = loginMode === 'recovery'
        ? await posApi.recoveryLogin({
            username: loginUsername,
            method: recoveryMethod,
            adminTotpCode: recoveryMethod === 'totp' ? loginTotpCode : undefined,
            masterKey: recoveryMethod === 'masterkey' ? offlineMasterKey : undefined,
          })
        : await posApi.login({
            username: loginUsername,
            password: loginPassword,
          });
      const sessionToPersist = { ...nextSession, rotatedMasterKey: undefined };
      setSession(sessionToPersist);
      writeStoredSession(sessionToPersist);
      try {
        const appearance = await posApi.getMyAppearancePreference();
        const storedAppearance = readStoredAppearance('pos');
        applyDocumentAppearance('pos', {
          mode: storedAppearance?.mode ?? 'auto',
          scale: storedAppearance?.scale ?? 'md',
          theme: appearance.theme,
        });
        writeStoredPosThemeForUsername(nextSession.user.username || loginUsername, appearance.theme);
      } catch {
        // Theme fallback tetap dipakai kalau fetch preference gagal.
      }
      setOneTimeMasterKey(nextSession.rotatedMasterKey ?? '');
      setSessionMessage('');
      writeLastLoginUsername(nextSession.user.username || loginUsername);
      setLoginPassword('');
      setLoginTotpCode('');
      setOfflineMasterKey('');
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Login gagal.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSignOut = () => {
    if (session?.token) {
      void posApi.logout(session.token);
    }
    setSession(null);
    setOneTimeMasterKey('');
    setSessionMessage('');
    clearStoredSession();
  };

  const handleChangePassword = async (event: FormEvent<HTMLFormElement>) => {
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
  };

  const appShellClassName = session
    ? 'min-h-screen bg-[radial-gradient(circle_at_12%_10%,color-mix(in_oklch,var(--primary)_18%,transparent),transparent_24%),radial-gradient(circle_at_88%_18%,color-mix(in_oklch,var(--accent)_18%,transparent),transparent_22%),linear-gradient(135deg,color-mix(in_oklch,var(--background)_96%,black),var(--background)_48%,color-mix(in_oklch,var(--background)_86%,black))] text-foreground'
    : 'min-h-screen text-foreground';

  const renderLogin = () => (
    <div className="auth-shell relative min-h-screen overflow-hidden px-4 py-6">
      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-48px)] w-full max-w-[31rem] items-center">
        <Card className="auth-card w-full border text-[var(--auth-foreground)]">
          <CardHeader className="auth-card-header p-5 sm:p-6">
            <div className="grid gap-4">
              <div className="flex items-start gap-3">
                <span className="auth-logo-wrap grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl">
                  {storeIdentity.logoDataUrl ? (
                    <img src={storeIdentity.logoDataUrl} alt={storeIdentity.name || fallbackStore.name} className="h-full w-full object-cover" />
                  ) : (
                    <Store className="h-5 w-5 text-amber-300" />
                  )}
                </span>
                <div className="grid min-w-0 gap-2">
                  <div className="auth-kicker text-[10px] font-semibold uppercase tracking-[0.24em]">Login POS Desktop</div>
                  <CardTitle className="auth-title max-w-[14ch] text-2xl leading-tight tracking-[-0.03em]">{storeIdentity.name || fallbackStore.name}</CardTitle>
                  <p className="auth-subtitle max-w-[42ch] text-sm leading-6 text-[var(--auth-muted)]">
                    Masuk ke workstation lokal untuk transaksi, stok, dan laporan operasional.
                  </p>
                </div>
              </div>
              <div className="auth-instrument-grid">
                <div className="auth-instrument">
                  <span className="auth-instrument-icon">
                    <Database className="h-3.5 w-3.5" />
                  </span>
                  <span className="auth-instrument-copy">
                    <span className="auth-instrument-label">Basis data</span>
                    <span className="auth-instrument-value">Lokal dan aktif</span>
                  </span>
                </div>
                <div className="auth-instrument">
                  <span className="auth-instrument-icon">
                    <ShieldCheck className="h-3.5 w-3.5" />
                  </span>
                  <span className="auth-instrument-copy">
                    <span className="auth-instrument-label">Akses</span>
                    <span className="auth-instrument-value">Login admin dilindungi</span>
                  </span>
                </div>
                <div className="auth-instrument">
                  <span className="auth-instrument-icon">
                    <Clock3 className="h-3.5 w-3.5" />
                  </span>
                  <span className="auth-instrument-copy">
                    <span className="auth-instrument-label">Sesi</span>
                    <span className="auth-instrument-value">Auto logout 15 menit</span>
                  </span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="auth-card-content grid gap-4 p-5 sm:p-6">
            {sessionMessage ? <div className="auth-message rounded-2xl px-4 py-3 text-xs font-medium leading-6">{sessionMessage}</div> : null}
            <form className="grid gap-3" onSubmit={handleLogin}>
              <label className="auth-label">
                <span className="auth-label-text">Username</span>
                <div className="auth-field-shell group">
                  <UserRound className="auth-field-icon h-4 w-4 transition" />
                  <input
                    value={loginUsername}
                    onChange={(event) => setLoginUsername(event.target.value)}
                    className="auth-input text-[0.98rem] font-medium"
                    placeholder="Username"
                    autoComplete="username"
                  />
                </div>
              </label>
              {loginMode === 'password' ? (
                <label className="auth-label">
                  <span className="auth-label-text">Password</span>
                  <div className="auth-field-shell group">
                    <KeyRound className="auth-field-icon h-4 w-4 transition" />
                    <input
                      type="password"
                      value={loginPassword}
                      onChange={(event) => setLoginPassword(event.target.value)}
                      className="auth-input text-[0.98rem] font-medium"
                      placeholder="Password user"
                      autoComplete="current-password"
                    />
                  </div>
                  <button
                    type="button"
                    className="auth-link w-fit text-xs font-medium underline-offset-4 transition-colors hover:underline"
                    onClick={() => {
                      setLoginMode('recovery');
                      setLoginError('');
                    }}
                  >
                    Lupa password?
                  </button>
                </label>
              ) : (
                <div className="auth-helper grid gap-3 rounded-3xl p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="auth-helper-title text-xs font-semibold uppercase tracking-[0.16em]">Bantuan admin</span>
                    <button
                      type="button"
                      className="auth-link text-xs font-medium underline-offset-4 transition-colors hover:underline"
                      onClick={() => {
                        setLoginMode('password');
                        setLoginError('');
                      }}
                    >
                      Pakai password
                    </button>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button type="button" variant={recoveryMethod === 'totp' ? 'secondary' : 'outline'} className="h-9 rounded-xl text-xs" onClick={() => setRecoveryMethod('totp')}>
                      TOTP admin
                    </Button>
                    <Button type="button" variant={recoveryMethod === 'masterkey' ? 'secondary' : 'outline'} className="h-9 rounded-xl text-xs" onClick={() => setRecoveryMethod('masterkey')}>
                      Masterkey offline
                    </Button>
                  </div>
                  {recoveryMethod === 'totp' ? (
                    <div className="auth-field-shell group">
                      <ShieldCheck className="auth-field-icon h-4 w-4 transition" />
                      <input
                        value={loginTotpCode}
                        onChange={(event) => setLoginTotpCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                        className="auth-input font-mono text-[0.98rem] font-semibold tracking-[0.28em]"
                        placeholder="Kode TOTP admin"
                        inputMode="numeric"
                      />
                    </div>
                  ) : (
                    <div className="auth-field-shell group">
                      <KeyRound className="auth-field-icon h-4 w-4 transition" />
                      <input
                        type="password"
                        value={offlineMasterKey}
                        onChange={(event) => setOfflineMasterKey(event.target.value)}
                        className="auth-input text-[0.98rem] font-medium"
                        placeholder="Masterkey offline"
                      />
                    </div>
                  )}
                </div>
              )}
              {loginError ? <div className="auth-message auth-message-error rounded-2xl px-4 py-3 text-xs font-medium leading-6">{loginError}</div> : null}
              <Button type="submit" className="h-12 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-300 font-semibold text-slate-950 shadow-[0_16px_36px_rgba(251,191,36,0.2)] transition hover:from-amber-400 hover:via-amber-300 hover:to-emerald-200" disabled={loginLoading}>
                <span>{loginLoading ? 'Memeriksa...' : loginMode === 'recovery' ? 'Masuk dengan bantuan admin' : 'Masuk'}</span>
                {!loginLoading ? <ArrowRight className="ml-2 h-4 w-4" /> : null}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderForcePasswordChange = () => (
    <div className="grid min-h-[70vh] place-items-center px-2 py-6">
      <section className="grid w-full max-w-4xl gap-4 rounded-3xl border border-border bg-card/95 p-4 text-card-foreground shadow-xl shadow-black/10 sm:grid-cols-[0.9fr_1.1fr] sm:p-5">
        <div className="grid content-between gap-6 rounded-2xl border border-border/70 bg-muted/45 p-4">
          <div className="grid gap-4">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-500/15 text-amber-700 dark:text-amber-200">
              <KeyRound className="h-5 w-5" />
            </span>
            <div className="grid gap-2">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Password wajib diganti</div>
              <h1 className="text-2xl font-semibold tracking-tight">{session?.user.name ?? 'User'}</h1>
              <p className="text-sm leading-6 text-muted-foreground">
                Akun ini masih memakai password awal. Buat password baru sebelum POS dibuka.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <div className="rounded-xl border border-border bg-background/70 p-3">
              <div className="font-semibold text-foreground">Role</div>
              <div className="mt-1 truncate">{session?.user.role ?? '-'}</div>
            </div>
            <div className="rounded-xl border border-border bg-background/70 p-3">
              <div className="font-semibold text-foreground">Status</div>
              <div className="mt-1">Reset password</div>
            </div>
          </div>
        </div>

        <form className="grid content-center gap-4 p-1 sm:p-2" onSubmit={handleChangePassword}>
          {!session?.forcePasswordChange ? (
            <label className="grid gap-2 text-sm font-medium">
              <span>Password lama</span>
              <input
                type="password"
                value={passwordCurrent}
                onChange={(event) => setPasswordCurrent(event.target.value)}
                className="h-11 rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
                autoComplete="current-password"
              />
            </label>
          ) : null}
          <label className="grid gap-2 text-sm font-medium">
            <span>Password baru</span>
            <input
              type="password"
              value={passwordNext}
              onChange={(event) => setPasswordNext(event.target.value)}
              className="h-11 rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
              placeholder="Minimal 8 karakter, huruf dan angka"
              autoComplete="new-password"
            />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            <span>Konfirmasi password</span>
            <input
              type="password"
              value={passwordConfirm}
              onChange={(event) => setPasswordConfirm(event.target.value)}
              className="h-11 rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
              autoComplete="new-password"
            />
          </label>
          {passwordError ? <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">{passwordError}</div> : null}
          <Button type="submit" className="h-11 rounded-xl font-semibold" disabled={passwordLoading || !passwordNext || !passwordConfirm}>
            {passwordLoading ? 'Menyimpan...' : 'Simpan password baru'}
          </Button>
          <div className="rounded-xl border border-border bg-muted/40 p-3 text-xs leading-5 text-muted-foreground">
            Setelah password diganti, akses POS akan terbuka sesuai hak akses role user.
          </div>
        </form>
      </section>
    </div>
  );

  return (
    <div className={appShellClassName}>
      {session ? <Topbar user={session.user} store={storeIdentity} onSignOut={handleSignOut} /> : null}

      <main className={session ? 'overflow-x-auto px-4 pb-4 pt-4' : 'px-4 pb-4 pt-4'}>
        {!session ? renderLogin() : null}

        {session && session.forcePasswordChange ? renderForcePasswordChange() : null}

        {session && !session.forcePasswordChange && phase === 'loading' ? (
          <div className="grid min-h-[70vh] place-items-center rounded-3xl border border-border bg-card/80 px-6 py-12 text-center shadow-2xl shadow-black/10">
            <div className="max-w-sm space-y-3">
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Loading API client</div>
              <div className="text-2xl font-semibold tracking-tight">Menyiapkan snapshot POS</div>
              <div className="text-sm text-muted-foreground">Frontend sekarang membaca data lewat boundary `posApi`, bukan langsung dari fixture.</div>
            </div>
          </div>
        ) : null}

        {session && !session.forcePasswordChange && phase === 'error' ? (
          <div className="grid min-h-[70vh] place-items-center rounded-3xl border border-border bg-card/80 px-6 py-12 text-center shadow-2xl shadow-black/10">
            <div className="max-w-sm space-y-3">
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">API client error</div>
              <div className="text-2xl font-semibold tracking-tight">Snapshot gagal dimuat</div>
              <div className="text-sm text-muted-foreground">{errorMessage}</div>
            </div>
          </div>
        ) : null}

        {session && oneTimeMasterKey ? (
          <div className="mb-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 shadow-xl shadow-black/10">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-200">Masterkey offline baru</div>
                <div className="mt-1 break-all font-mono text-sm font-semibold">{oneTimeMasterKey}</div>
                <div className="mt-1 text-xs text-muted-foreground">Masterkey lama sudah hangus. Simpan key baru ini di tempat offline yang aman.</div>
              </div>
              <Button type="button" variant="outline" className="h-8 rounded-lg px-3 text-xs" onClick={() => setOneTimeMasterKey('')}>
                Saya sudah simpan
              </Button>
            </div>
          </div>
        ) : null}

        {session && !session.forcePasswordChange && phase === 'ready' && snapshot ? (
          <Suspense fallback={(
            <div className="grid min-h-[70vh] place-items-center rounded-3xl border border-border bg-card/80 px-6 py-12 text-center shadow-2xl shadow-black/10">
              <div className="max-w-sm space-y-3">
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Loading POS module</div>
                <div className="text-2xl font-semibold tracking-tight">Menyiapkan tampilan kasir</div>
              </div>
            </div>
          )}>
            <PosView
              alerts={snapshot.alerts}
              data={snapshot.data}
              sessionToken={session.token}
              sessionUser={session.user}
              sessionRolePermissions={session.rolePermissions}
              onBusyChange={setPosBusy}
            />
          </Suspense>
        ) : null}
      </main>
    </div>
  );
}
