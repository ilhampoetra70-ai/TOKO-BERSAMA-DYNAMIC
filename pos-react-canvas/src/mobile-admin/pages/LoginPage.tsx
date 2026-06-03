import type { FormEvent } from 'react';
import { ArrowRight, KeyRound, LayoutDashboard, UserRound } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import type { AppSettings } from '../../services/posApi.types';
import { fallbackStore } from '../types';

interface LoginPageProps {
  storeIdentity: AppSettings['store'];
  loginUsername: string;
  setLoginUsername: (value: string) => void;
  loginPassword: string;
  setLoginPassword: (value: string) => void;
  loginError: string;
  loginLoading: boolean;
  onLogin: (event: FormEvent<HTMLFormElement>) => void;
}

export function LoginPage({
  storeIdentity,
  loginUsername,
  setLoginUsername,
  loginPassword,
  setLoginPassword,
  loginError,
  loginLoading,
  onLogin,
}: LoginPageProps) {
  return (
    <div className="mobile-admin-auth-screen auth-shell min-h-screen overflow-hidden px-4 py-6 text-[var(--auth-foreground)]">
      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-48px)] w-full max-w-[27rem] items-center">
        <Card className="auth-card w-full border text-[var(--auth-foreground)]">
          <CardHeader className="auth-card-header p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="auth-logo-wrap grid h-12 w-12 place-items-center overflow-hidden rounded-2xl">
                  {storeIdentity.logoDataUrl ? (
                    <img src={storeIdentity.logoDataUrl} alt={storeIdentity.name || fallbackStore.name} className="h-full w-full object-cover" />
                  ) : (
                    <LayoutDashboard className="h-5 w-5 text-amber-300" />
                  )}
                </span>
                <div>
                  <div className="auth-kicker text-[10px] font-semibold uppercase tracking-[0.24em]">Mobile Admin</div>
                  <CardTitle className="auth-title max-w-[14ch] text-2xl leading-tight tracking-[-0.03em]">{storeIdentity.name || fallbackStore.name}</CardTitle>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 p-5">
            <form className="grid gap-3" onSubmit={onLogin}>
              <label className="auth-label">
                <span className="sr-only">Username</span>
                <div className="auth-field-shell group">
                  <UserRound className="auth-field-icon h-4 w-4 transition" />
                  <input
                    value={loginUsername}
                    onChange={(event) => setLoginUsername(event.target.value)}
                    autoComplete="username"
                    inputMode="email"
                    className="auth-input text-sm"
                    placeholder="Username"
                  />
                </div>
              </label>
              <label className="auth-label">
                <span className="sr-only">Password</span>
                <div className="auth-field-shell group">
                  <KeyRound className="auth-field-icon h-4 w-4 transition" />
                  <input
                    value={loginPassword}
                    onChange={(event) => setLoginPassword(event.target.value)}
                    type="password"
                    autoComplete="current-password"
                    className="auth-input text-sm"
                    placeholder="Password"
                  />
                </div>
              </label>
              {loginError ? <div className="auth-message auth-message-error rounded-2xl px-4 py-3 text-xs font-medium leading-6">{loginError}</div> : null}
              <Button
                type="submit"
                className="h-12 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-300 to-emerald-300 font-semibold text-slate-950 shadow-[0_16px_36px_rgba(251,191,36,0.22)] transition hover:from-amber-300 hover:via-amber-200 hover:to-emerald-200"
                disabled={loginLoading}
              >
                <span>{loginLoading ? 'Memeriksa...' : 'Masuk'}</span>
                {!loginLoading ? <ArrowRight className="ml-2 h-4 w-4" /> : null}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
