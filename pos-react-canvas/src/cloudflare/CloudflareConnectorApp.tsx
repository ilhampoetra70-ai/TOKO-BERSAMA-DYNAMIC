import { useEffect, useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Cloud,
  Download,
  ExternalLink,
  KeyRound,
  Loader2,
  Power,
  RefreshCw,
  ServerCog,
  ShieldCheck,
  Square,
  Terminal,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { clearStoredSession, readLastLoginUsername, readStoredSession, writeLastLoginUsername, writeStoredSession } from '../lib/authSession';
import { resolveRuntimeApiBaseUrl } from '../services/apiBaseUrl';
import type { AuthSession } from '../services/posApi.types';

type ServiceStatus = {
  installed: boolean;
  running: boolean;
  startType: string;
  canStop: boolean;
  serviceName: string;
  displayName: string;
  binaryPath: string;
  lastError: string;
};

type ConnectorStatus = {
  installed: boolean;
  running: boolean;
  connected: boolean;
  tokenConfigured: boolean;
  originUrl: string;
  publicHostname: string;
  publicUrl: string;
  binaryPath: string;
  logPath: string;
  lastMessage: string;
  pid: number | null;
  version: string;
  bundledAvailable: boolean;
  state: 'not-installed' | 'not-configured' | 'stopped' | 'starting' | 'connected' | 'error';
  note: string;
  service: ServiceStatus;
};

type PreflightCheck = {
  id: string;
  label: string;
  ok: boolean;
  message: string;
};

type PreflightPayload = {
  status: ConnectorStatus;
  checks: PreflightCheck[];
};

type ApiErrorPayload = {
  error?: {
    message?: string;
    requestId?: string;
    method?: string;
    path?: string;
  };
};

const dashboardUrl = 'https://one.dash.cloudflare.com/';

function resolveApiBaseUrl() {
  return resolveRuntimeApiBaseUrl();
}

function cleanHostname(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  try {
    const parsed = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    return parsed.hostname;
  } catch {
    return trimmed.replace(/^https?:\/\//i, '').split('/')[0] ?? trimmed;
  }
}

async function readApiError(response: Response, fallback: string) {
  const payload = await response.json().catch(() => null) as ApiErrorPayload | null;
  const detail = payload?.error;
  const diagnostic = detail?.requestId ? ` Kode ${detail.requestId}.` : '';
  return `${detail?.message || fallback}.${diagnostic}`;
}

function StatusPill({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs ${ok ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200' : 'border-amber-400/30 bg-amber-400/10 text-amber-100'}`}>
      {ok ? <CheckCircle2 className="size-3.5" /> : <AlertTriangle className="size-3.5" />}
      {children}
    </span>
  );
}

function StepCard({
  step,
  title,
  done,
  children,
}: {
  step: string;
  title: string;
  done: boolean;
  children: ReactNode;
}) {
  return (
    <Card className="border-slate-700 bg-[#151b21] text-slate-100">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="min-w-0">
          <div className="text-xs font-medium uppercase text-cyan-300">{step}</div>
          <CardTitle className="mt-1 text-base">{title}</CardTitle>
        </div>
        <StatusPill ok={done}>{done ? 'Selesai' : 'Perlu aksi'}</StatusPill>
      </CardHeader>
      <CardContent className="grid gap-3">{children}</CardContent>
    </Card>
  );
}

export function CloudflareConnectorApp() {
  const apiBaseUrl = useMemo(resolveApiBaseUrl, []);
  const [session, setSession] = useState<AuthSession | null>(() => readStoredSession());
  const [username, setUsername] = useState(() => readLastLoginUsername());
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [status, setStatus] = useState<ConnectorStatus | null>(null);
  const [token, setToken] = useState('');
  const [originUrl, setOriginUrl] = useState('');
  const [publicHostname, setPublicHostname] = useState('');
  const [binaryPath, setBinaryPath] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [preflight, setPreflight] = useState<PreflightPayload | null>(null);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');

  const authHeader = useMemo(() => (session ? { authorization: `Bearer ${session.token}` } : {}), [session]);

  const requestJson = async <T,>(path: string, init?: RequestInit): Promise<T> => {
    const headers = new Headers(init?.headers);
    Object.entries(authHeader).forEach(([key, value]) => headers.set(key, value));
    if (init?.body !== undefined && !headers.has('content-type')) {
      headers.set('content-type', 'application/json');
    }

    const response = await fetch(`${apiBaseUrl}${path}`, {
      ...init,
      headers,
    });

    if (response.status === 401) {
      clearStoredSession();
      setSession(null);
    }

    if (!response.ok) {
      throw new Error(await readApiError(response, `HTTP ${response.status}`));
    }

    return response.json() as Promise<T>;
  };

  const refresh = async () => {
    if (!session) return;
    const [statusPayload, logsPayload] = await Promise.all([
      requestJson<{ item: ConnectorStatus }>('/cloudflare/connector'),
      requestJson<{ items: string[] }>('/cloudflare/connector/logs'),
    ]);
    const next = statusPayload.item;
    setStatus(next);
    setOriginUrl(next.originUrl);
    setPublicHostname(next.publicHostname);
    setBinaryPath(next.binaryPath);
    setLogs(logsPayload.items);
  };

  useEffect(() => {
    void refresh().catch((error) => setMessage(error instanceof Error ? error.message : 'Gagal memuat connector.'));
  }, [session]);

  useEffect(() => {
    if (session) {
      return;
    }

    const initialLastUsername = readLastLoginUsername();
    if (initialLastUsername !== username) {
      setUsername(initialLastUsername);
    }

    const intervalId = window.setInterval(() => {
      const nextLastUsername = readLastLoginUsername();
      setUsername((current) => (current === initialLastUsername ? nextLastUsername : current));
    }, 60000);

    return () => window.clearInterval(intervalId);
  }, [session]);

  const login = async (event: FormEvent) => {
    event.preventDefault();
    setLoginError('');
    setBusy('login');
    try {
      const response = await fetch(`${apiBaseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!response.ok) {
        throw new Error(await readApiError(response, 'Login gagal'));
      }
      const nextSession = await response.json() as AuthSession;
      writeLastLoginUsername(nextSession.user.username || username);
      writeStoredSession(nextSession);
      setSession(nextSession);
      setPassword('');
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Login gagal.');
    } finally {
      setBusy('');
    }
  };

  const runAction = async (name: string, work: () => Promise<void>) => {
    setBusy(name);
    setMessage('Memproses aksi...');
    try {
      await work();
      await refresh();
      setMessage('Selesai.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Aksi gagal.');
    } finally {
      setBusy('');
    }
  };

  const saveConfig = () => runAction('save', async () => {
    const hostname = cleanHostname(publicHostname);
    await requestJson('/cloudflare/connector', {
      method: 'PUT',
      body: JSON.stringify({
        token: token.trim() || undefined,
        originUrl,
        publicHostname: hostname,
        publicUrl: hostname ? `https://${hostname}` : '',
        binaryPath,
        autoStart: false,
      }),
    });
    setToken('');
    setPublicHostname(hostname);
  });

  const runPreflight = () => runAction('preflight', async () => {
    const payload = await requestJson<{ item: PreflightPayload }>('/cloudflare/connector/preflight');
    setPreflight(payload.item);
    setStatus(payload.item.status);
  });

  if (!session) {
    return (
      <main className="min-h-screen bg-[#101418] px-4 py-6 text-slate-100">
        <section className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-md place-items-center">
          <Card className="w-full border-slate-700 bg-[#151b21] text-slate-100 shadow-2xl">
            <CardHeader className="space-y-2">
              <div className="grid h-12 w-12 place-items-center rounded-lg border border-cyan-400/30 bg-cyan-400/10 text-cyan-300">
                <Cloud className="size-6" />
              </div>
              <CardTitle>Cloudflare Connector</CardTitle>
              <p className="text-sm text-slate-400">Login admin untuk setup akses publik toko.</p>
            </CardHeader>
            <CardContent>
              <form className="grid gap-3" onSubmit={login}>
                <input value={username} onChange={(event) => setUsername(event.target.value)} className="h-11 rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm outline-none focus:border-cyan-400" placeholder="Username" />
                <input value={password} onChange={(event) => setPassword(event.target.value)} className="h-11 rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm outline-none focus:border-cyan-400" placeholder="Password" type="password" />
                {loginError ? <div className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{loginError}</div> : null}
                <Button className="h-11 bg-cyan-400 text-slate-950 hover:bg-cyan-300" disabled={busy === 'login'}>
                  {busy === 'login' ? <Loader2 className="animate-spin" /> : <KeyRound />}
                  Masuk
                </Button>
              </form>
            </CardContent>
          </Card>
        </section>
      </main>
    );
  }

  const service = status?.service;
  const publicUrl = status?.publicUrl || (publicHostname ? `https://${cleanHostname(publicHostname)}` : '');
  const allChecksOk = Boolean(preflight?.checks.length && preflight.checks.every((check) => check.ok));

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#101418] px-3 py-4 text-slate-100 sm:px-6">
      <section className="mx-auto grid max-w-6xl gap-4">
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-700 bg-[#151b21]/95 px-4 py-3 shadow-xl">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-lg border border-cyan-400/30 bg-cyan-400/10 text-cyan-300">
              <Cloud className="size-6" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold">Setup Cloudflare Connector</h1>
              <div className="truncate text-xs text-slate-400">{apiBaseUrl}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="border-slate-700 bg-slate-900 text-slate-200" onClick={() => void refresh()} disabled={Boolean(busy)}>
              <RefreshCw />
              Refresh
            </Button>
            <Button variant="ghost" className="text-slate-300" onClick={() => { clearStoredSession(); setSession(null); }}>
              <Power />
            </Button>
          </div>
        </header>

        <div className="grid gap-3 md:grid-cols-4">
          {[
            { label: 'Binary', value: status?.installed ? 'Siap' : 'Belum', ok: Boolean(status?.installed), icon: Download },
            { label: 'Token', value: status?.tokenConfigured ? 'Tersimpan' : 'Kosong', ok: Boolean(status?.tokenConfigured), icon: ShieldCheck },
            { label: 'Service', value: service?.running ? 'Running' : service?.installed ? 'Stopped' : 'Belum', ok: Boolean(service?.running), icon: ServerCog },
            { label: 'Public URL', value: allChecksOk ? 'Lolos' : status?.state ?? '-', ok: allChecksOk, icon: Activity },
          ].map((item) => (
            <Card key={item.label} className="border-slate-700 bg-[#151b21] text-slate-100">
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div>
                  <div className="text-xs text-slate-400">{item.label}</div>
                  <div className={`text-lg font-semibold ${item.ok ? 'text-emerald-300' : 'text-amber-300'}`}>{item.value}</div>
                </div>
                <item.icon className="size-5 text-slate-500" />
              </CardContent>
            </Card>
          ))}
        </div>

        {message ? (
          <div className="rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100">
            {message}
          </div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="grid gap-4">
            <StepCard step="Langkah 1" title="Buat tunnel di Cloudflare Dashboard" done={Boolean(status?.tokenConfigured)}>
              <p className="text-sm leading-relaxed text-slate-300">
                Buka Zero Trust, masuk ke Networks, Connectors, Cloudflare Tunnels. Buat tunnel baru, pilih Cloudflared, lalu copy token yang diawali eyJh.
              </p>
              <Button asChild variant="outline" className="w-fit border-cyan-500/40 bg-cyan-500/10 text-cyan-100">
                <a href={dashboardUrl} target="_blank" rel="noreferrer">
                  <ExternalLink />
                  Buka Cloudflare
                </a>
              </Button>
            </StepCard>

            <StepCard step="Langkah 2" title="Simpan token dan alamat publik" done={Boolean(status?.tokenConfigured && status.publicHostname)}>
              <label className="grid gap-1 text-sm">
                <span className="text-slate-400">Tunnel token</span>
                <input value={token} onChange={(event) => setToken(event.target.value)} className="h-10 rounded-lg border border-slate-700 bg-slate-950 px-3 font-mono text-sm outline-none focus:border-cyan-400" placeholder={status?.tokenConfigured ? 'Token sudah tersimpan' : 'Paste token eyJh...'} />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1 text-sm">
                  <span className="text-slate-400">Origin lokal</span>
                  <input value={originUrl} onChange={(event) => setOriginUrl(event.target.value)} className="h-10 rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm outline-none focus:border-cyan-400" />
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="text-slate-400">Hostname publik</span>
                  <input value={publicHostname} onChange={(event) => setPublicHostname(event.target.value)} className="h-10 rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm outline-none focus:border-cyan-400" placeholder="tbersamapalandan.my.id" />
                </label>
              </div>
              <label className="grid gap-1 text-sm">
                <span className="text-slate-400">Path cloudflared.exe</span>
                <input value={binaryPath} onChange={(event) => setBinaryPath(event.target.value)} className="h-10 rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm outline-none focus:border-cyan-400" />
              </label>
              <div className="flex flex-wrap gap-2">
                <Button className="bg-cyan-400 text-slate-950 hover:bg-cyan-300" onClick={saveConfig} disabled={Boolean(busy)}>
                  {busy === 'save' ? <Loader2 className="animate-spin" /> : <ShieldCheck />}
                  Simpan Setup
                </Button>
                <Button variant="outline" className="border-slate-700 bg-slate-900 text-slate-200" onClick={() => runAction('installBinary', async () => { await requestJson('/cloudflare/connector/install', { method: 'POST', body: JSON.stringify({}) }); })} disabled={Boolean(busy)}>
                  {busy === 'installBinary' ? <Loader2 className="animate-spin" /> : <Download />}
                  Install Binary
                </Button>
              </div>
            </StepCard>

            <StepCard step="Langkah 3" title="Install Windows Service" done={Boolean(service?.running)}>
              <div className="grid gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-slate-400">Service</span>
                  <StatusPill ok={Boolean(service?.running)}>{service?.running ? 'Running' : service?.installed ? 'Stopped' : 'Belum terpasang'}</StatusPill>
                </div>
                <div className="break-all text-xs text-slate-500">{service?.binaryPath || 'Belum ada service Cloudflared.'}</div>
                {service?.lastError ? <div className="text-xs text-amber-200">{service.lastError}</div> : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-200" onClick={() => runAction('serviceInstall', async () => { await requestJson('/cloudflare/connector/service/install', { method: 'POST', body: JSON.stringify({ force: true }) }); })} disabled={Boolean(busy)}>
                  {busy === 'serviceInstall' ? <Loader2 className="animate-spin" /> : <ServerCog />}
                  Install Ulang Service
                </Button>
                <Button variant="outline" className="border-slate-700 bg-slate-900 text-slate-200" onClick={() => runAction('serviceStart', async () => { await requestJson('/cloudflare/connector/service/start', { method: 'POST' }); })} disabled={Boolean(busy)}>
                  {busy === 'serviceStart' ? <Loader2 className="animate-spin" /> : <Activity />}
                  Start
                </Button>
                <Button variant="outline" className="border-rose-500/40 bg-rose-500/10 text-rose-200" onClick={() => runAction('serviceStop', async () => { await requestJson('/cloudflare/connector/service/stop', { method: 'POST' }); })} disabled={Boolean(busy)}>
                  <Square />
                  Stop
                </Button>
              </div>
              {busy === 'serviceInstall' ? (
                <div className="rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-sm text-cyan-100">
                  Menginstall ulang Windows Service. Jika proses ini gagal, jalankan POS sebagai Administrator lalu ulangi.
                </div>
              ) : null}
            </StepCard>

            <StepCard step="Langkah 4" title="Tes koneksi end-to-end" done={allChecksOk}>
              <p className="text-sm leading-relaxed text-slate-300">
                Tes ini membedakan service yang sekadar hidup dari public URL yang benar-benar bisa dipakai.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" className="border-cyan-500/40 bg-cyan-500/10 text-cyan-100" onClick={runPreflight} disabled={Boolean(busy)}>
                  {busy === 'preflight' ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
                  Jalankan Tes
                </Button>
                {publicUrl ? (
                  <Button asChild variant="outline" className="border-slate-700 bg-slate-900 text-slate-200">
                    <a href={publicUrl} target="_blank" rel="noreferrer">
                      <ExternalLink />
                      Buka Public URL
                    </a>
                  </Button>
                ) : null}
              </div>
            </StepCard>
          </div>

          <div className="grid gap-4 content-start">
            <Card className="border-slate-700 bg-[#151b21] text-slate-100">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><Terminal className="size-5 text-cyan-300" /> Hasil Tes</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                {preflight ? (
                  <div className="grid gap-2">
                    {preflight.checks.map((check) => (
                      <div key={check.id} className="grid grid-cols-[auto_minmax(0,1fr)] gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2">
                        {check.ok ? <CheckCircle2 className="mt-0.5 size-4 text-emerald-300" /> : <AlertTriangle className="mt-0.5 size-4 text-amber-300" />}
                        <div className="min-w-0">
                          <div className="text-sm font-medium">{check.label}</div>
                          <div className="break-words text-xs text-slate-400">{check.message}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-400">Belum dites.</div>
                )}
              </CardContent>
            </Card>

            <Card className="border-slate-700 bg-[#151b21] text-slate-100">
              <CardHeader>
                <CardTitle className="text-base">Log Connector</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[24rem] overflow-auto rounded-lg border border-slate-700 bg-slate-950 p-3 font-mono text-xs text-slate-300">
                  {logs.length ? logs.map((line) => <div key={line}>{line}</div>) : <div className="text-slate-500">Belum ada log.</div>}
                </div>
                <div className="mt-2 break-all text-xs text-slate-500">{status?.logPath}</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </main>
  );
}
