import type { FormEvent } from 'react';
import { ArrowRight, KeyRound, LayoutDashboard } from 'lucide-react';
import { Button } from '../../components/ui/button';
import type { AuthSession } from '../../services/posApi.types';

interface PasswordChangePageProps {
  session: AuthSession;
  passwordCurrent: string;
  setPasswordCurrent: (value: string) => void;
  passwordNext: string;
  setPasswordNext: (value: string) => void;
  passwordConfirm: string;
  setPasswordConfirm: (value: string) => void;
  passwordError: string;
  passwordLoading: boolean;
  onPasswordChange: (event: FormEvent<HTMLFormElement>) => void;
}

export function PasswordChangePage({
  session,
  passwordCurrent,
  setPasswordCurrent,
  passwordNext,
  setPasswordNext,
  passwordConfirm,
  setPasswordConfirm,
  passwordError,
  passwordLoading,
  onPasswordChange,
}: PasswordChangePageProps) {
  return (
    <div className="grid min-h-screen bg-[#07111b] px-3 py-4 text-slate-100">
      <div className="mx-auto grid w-full max-w-md content-center gap-3">
        <section className="grid gap-4 rounded-3xl border border-slate-700/70 bg-slate-900/95 p-4 shadow-xl shadow-black/20">
          <div className="grid grid-cols-[auto_1fr] items-center gap-3 rounded-2xl border border-slate-700/70 bg-slate-950/55 p-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-amber-400/15 text-amber-200">
              <LayoutDashboard className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Password wajib diganti</div>
              <div className="truncate text-xl font-semibold tracking-tight">{session.user.name}</div>
            </div>
          </div>

          <form className="grid gap-3" onSubmit={onPasswordChange}>
            {!session.forcePasswordChange ? (
              <label className="grid gap-2 text-sm font-medium text-slate-200">
                <span>Password lama</span>
                <div className="grid grid-cols-[auto_1fr] items-center gap-2 rounded-2xl border border-slate-700 bg-slate-950 px-3">
                  <KeyRound className="h-4 w-4 text-slate-500" />
                  <input
                    value={passwordCurrent}
                    onChange={(event) => setPasswordCurrent(event.target.value)}
                    type="password"
                    className="h-11 bg-transparent text-sm outline-none placeholder:text-slate-500"
                    placeholder="Password lama"
                    autoComplete="current-password"
                  />
                </div>
              </label>
            ) : null}
            <label className="grid gap-2 text-sm font-medium text-slate-200">
              <span>Password baru</span>
              <div className="grid grid-cols-[auto_1fr] items-center gap-2 rounded-2xl border border-slate-700 bg-slate-950 px-3">
                <KeyRound className="h-4 w-4 text-slate-500" />
                <input
                  value={passwordNext}
                  onChange={(event) => setPasswordNext(event.target.value)}
                  type="password"
                  className="h-11 bg-transparent text-sm outline-none placeholder:text-slate-500"
                  placeholder="Minimal 8 karakter"
                  autoComplete="new-password"
                />
              </div>
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-200">
              <span>Konfirmasi password</span>
              <div className="grid grid-cols-[auto_1fr] items-center gap-2 rounded-2xl border border-slate-700 bg-slate-950 px-3">
                <KeyRound className="h-4 w-4 text-slate-500" />
                <input
                  value={passwordConfirm}
                  onChange={(event) => setPasswordConfirm(event.target.value)}
                  type="password"
                  className="h-11 bg-transparent text-sm outline-none placeholder:text-slate-500"
                  placeholder="Ulangi password baru"
                  autoComplete="new-password"
                />
              </div>
            </label>
            {passwordError ? <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-xs font-medium leading-6 text-red-200">{passwordError}</div> : null}
            <Button
              type="submit"
              className="h-12 rounded-2xl bg-amber-300 font-semibold text-slate-950 hover:bg-amber-200"
              disabled={passwordLoading || !passwordNext || !passwordConfirm}
            >
              <span>{passwordLoading ? 'Menyimpan...' : 'Simpan password'}</span>
              {!passwordLoading ? <ArrowRight className="ml-2 h-4 w-4" /> : null}
            </Button>
          </form>
        </section>
      </div>
    </div>
  );
}
