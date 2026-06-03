import { useCallback, useDeferredValue, useEffect, useState } from 'react';
import { ArrowUp, LogOut, RefreshCw, Store } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import type { AdminSection, InventorySort } from './types';
import { adminSections, fallbackStore } from './types';
import { buildAdminPath, resolveAdminSection, resolveReportRange } from './utils';
import { useAdminSession } from './hooks/useAdminSession';
import { useDashboard } from './hooks/useDashboard';
import { useAppearance } from './hooks/useAppearance';
import { usePullToRefresh } from './hooks/usePullToRefresh';
import { AdminNavGlyph } from './components/AdminIcons';
import { AdminSkeletonGrid } from './components/MobileAdminPrimitives';
import { LoginPage } from './pages/LoginPage';
import { PasswordChangePage } from './pages/PasswordChangePage';
import { DashboardPage } from './pages/DashboardPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { InventoryPage } from './pages/InventoryPage';
import { ReceivablesPage } from './pages/ReceivablesPage';
import { SettingsPage } from './pages/SettingsPage';
import { resolveRuntimeAdminUrl, shouldRegisterRuntimeStaticAssets } from '../services/apiBaseUrl';

export function MobileAdminApp() {
  const {
    session,
    storeIdentity,
    setStoreIdentity,
    loginUsername,
    setLoginUsername,
    loginPassword,
    setLoginPassword,
    loginError,
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
  } = useAdminSession();

  const [activeSection, setActiveSection] = useState<AdminSection>(() => resolveAdminSection(window.location.pathname));
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [transactionRange, setTransactionRange] = useState(() => resolveReportRange('today'));
  const [inventoryQuery, setInventoryQuery] = useState('');
  const [inventorySort, setInventorySort] = useState<InventorySort>('priority');
  const [inventoryBusy, setInventoryBusy] = useState(false);
  const deferredInventoryQuery = useDeferredValue(inventoryQuery);

  const {
    dashboard,
    loadState,
    loadError,
    lastSync,
    reportRange,
    setReportRange,
    refreshDashboard,
  } = useDashboard(session, activeSection, {
    transactionsRange: transactionRange,
    inventoryQuery: deferredInventoryQuery,
    inventorySort,
    refreshPaused: inventoryBusy,
  });

  const {
    appearancePreference,
    setAppearancePreference,
    appearanceSaving,
    appearanceError,
    saveAppearancePreference,
  } = useAppearance(session);
  const pullToRefresh = usePullToRefresh(refreshDashboard);

  // Update store identity from dashboard
  useEffect(() => {
    if (dashboard) {
      setStoreIdentity(dashboard.store);
    }
  }, [dashboard, setStoreIdentity]);

  // Set document title
  useEffect(() => {
    document.title = 'Toko Bersama Admin';
  }, []);

  // Register service worker and manifest
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !shouldRegisterRuntimeStaticAssets()) return;

    const buildId = import.meta.env.VITE_TOKOBERSAMA_BUILD_ID || 'dev';
    const manifestHref = `/admin/manifest.webmanifest?v=${encodeURIComponent(buildId)}`;
    const existingManifest = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (!existingManifest) {
      const link = document.createElement('link');
      link.rel = 'manifest';
      link.href = manifestHref;
      document.head.appendChild(link);
    } else {
      existingManifest.href = manifestHref;
    }

    navigator.serviceWorker
      .register(`/admin/sw.js?v=${encodeURIComponent(buildId)}`, { scope: '/admin/', updateViaCache: 'none' })
      .then((registration) => registration.update())
      .catch(() => undefined);
  }, []);

  // Sync active section with URL
  useEffect(() => {
    setActiveSection(resolveAdminSection(window.location.pathname));
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      setActiveSection(resolveAdminSection(window.location.pathname));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const selector = `[data-mobile-admin-scroll-root="${activeSection}"]`;
    const root = document.querySelector<HTMLElement>(selector);
    const updateVisibility = () => {
      const windowScrollTop = window.scrollY || document.documentElement.scrollTop || 0;
      const rootScrollTop = root?.scrollTop || 0;
      setShowBackToTop(Math.max(windowScrollTop, rootScrollTop) > 160);
    };

    updateVisibility();
    window.addEventListener('scroll', updateVisibility, { passive: true });
    root?.addEventListener('scroll', updateVisibility, { passive: true });
    return () => {
      window.removeEventListener('scroll', updateVisibility);
      root?.removeEventListener('scroll', updateVisibility);
    };
  }, [activeSection]);

  const adminUrl = typeof window !== 'undefined' ? resolveRuntimeAdminUrl() : '/admin';
  const lanAdminUrl = adminUrl.replace('://127.0.0.1:', '://<IP-KASIR>:').replace('://localhost:', '://<IP-KASIR>:');

  const navigateToSection = useCallback((section: AdminSection) => {
    if (section === activeSection) return;
    window.history.pushState({}, '', buildAdminPath(section));
    setActiveSection(section);
  }, [activeSection]);

  const doLogout = () => {
    void handleLogout();
    setActiveSection('overview');
  };

  const scrollToTop = () => {
    const selector = `[data-mobile-admin-scroll-root="${activeSection}"]`;
    const root = document.querySelector<HTMLElement>(selector);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    root?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── Login screen ──
  if (!session) {
    return (
      <LoginPage
        storeIdentity={storeIdentity}
        loginUsername={loginUsername}
        setLoginUsername={setLoginUsername}
        loginPassword={loginPassword}
        setLoginPassword={setLoginPassword}
        loginError={loginError}
        loginLoading={loginLoading}
        onLogin={handleLogin}
      />
    );
  }

  // ── Force password change ──
  if (session.forcePasswordChange) {
    return (
      <PasswordChangePage
        session={session}
        passwordCurrent={passwordCurrent}
        setPasswordCurrent={setPasswordCurrent}
        passwordNext={passwordNext}
        setPasswordNext={setPasswordNext}
        passwordConfirm={passwordConfirm}
        setPasswordConfirm={setPasswordConfirm}
        passwordError={passwordError}
        passwordLoading={passwordLoading}
        onPasswordChange={handlePasswordChange}
      />
    );
  }

  // ── Main admin shell ──
  return (
    <div className="mobile-admin-shell min-h-screen overflow-x-hidden text-slate-100" {...pullToRefresh.bind}>
      <div
        className={`mobile-admin-pull-indicator fixed left-1/2 top-3 z-[60] -translate-x-1/2 rounded-full border px-3 py-1 text-[11px] font-semibold shadow-lg transition ${pullToRefresh.refreshing || pullToRefresh.pullDistance ? 'opacity-100' : 'opacity-0'}`}
        style={{ transform: `translate(-50%, ${pullToRefresh.pullDistance}px)` }}
      >
        {pullToRefresh.refreshing ? 'Menyegarkan...' : 'Tarik untuk refresh'}
      </div>
      <div className="mx-auto flex min-h-screen w-full min-w-0 max-w-[1480px] flex-col gap-3 px-3 pb-28 pt-3 sm:px-4 sm:pb-28 sm:pt-4">
        <header className="mobile-admin-header rounded-2xl border px-3 py-2.5 shadow-[0_12px_32px_rgba(0,0,0,0.24)]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2.5">
                <span className="mobile-admin-brand-mark grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-lg border">
                  <Store className="h-[18px] w-[18px]" />
                </span>
                <div className="min-w-0">
                  <div className="text-[9px] font-semibold uppercase tracking-[0.22em] text-slate-500">Mobile Admin</div>
                  <h1 className="truncate text-base font-semibold text-slate-50 sm:text-lg">{storeIdentity.name || fallbackStore.name}</h1>
                </div>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                <span>{session.user.role}</span>
                <span>&bull;</span>
                <span>{lastSync || 'Belum sinkron'}</span>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <Badge variant={loadState === 'ready' ? 'success' : loadState === 'error' ? 'danger' : 'warning'} className="rounded-full px-2 py-0.5 text-[9px] uppercase tracking-[0.14em]">
                {loadState === 'ready' ? 'Sinkron' : loadState === 'error' ? 'Gangguan' : 'Muat'}
              </Badge>
              <Button
                type="button"
                variant="outline"
                title="Segarkan"
                aria-label="Segarkan"
                className="h-8 w-8 rounded-lg border-white/10 bg-white/5 px-0 text-slate-100 hover:bg-white/10"
                onClick={() => void refreshDashboard()}
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="outline"
                title="Keluar"
                aria-label="Keluar"
                className="h-8 w-8 rounded-lg border-white/10 bg-white/5 px-0 text-slate-100 hover:bg-white/10"
                onClick={doLogout}
              >
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </header>

        <Button
          type="button"
          variant="outline"
          title="Kembali ke atas"
          aria-label="Kembali ke atas"
          onClick={scrollToTop}
          className={`fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom))] right-3 z-[55] h-10 w-10 rounded-full border-white/10 bg-[#08121c]/95 px-0 text-slate-100 shadow-[0_12px_30px_rgba(0,0,0,0.35)] backdrop-blur-xl transition ${showBackToTop ? 'pointer-events-auto translate-y-0 opacity-100' : 'pointer-events-none translate-y-2 opacity-0'}`}
        >
          <ArrowUp className="h-4 w-4" />
        </Button>

        <Tabs value={activeSection} onValueChange={(value) => navigateToSection(value as AdminSection)} className="grid min-h-0 gap-3">
          {loadError && loadState === 'error' ? (
            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
              {loadError}
            </div>
          ) : null}

          <TabsContent value="overview" className="m-0">
            {dashboard ? (
              <DashboardPage
                dashboard={dashboard}
                reportRange={reportRange}
                setReportRange={setReportRange}
                lastSync={lastSync}
                onNavigate={navigateToSection}
              />
            ) : (
              <AdminSkeletonGrid rows={4} />
            )}
          </TabsContent>

          <TabsContent value="transactions" className="m-0">
            {dashboard ? (
              <TransactionsPage
                dashboard={dashboard}
                rangeBounds={transactionRange}
                setRangeBounds={setTransactionRange}
              />
            ) : (
              <AdminSkeletonGrid rows={4} />
            )}
          </TabsContent>

          <TabsContent value="inventory" className="m-0">
            {dashboard ? (
              <InventoryPage
                dashboard={dashboard}
                query={inventoryQuery}
                setQuery={setInventoryQuery}
                itemSort={inventorySort}
                setItemSort={setInventorySort}
                onRefresh={refreshDashboard}
                onBusyChange={setInventoryBusy}
              />
            ) : (
              <AdminSkeletonGrid rows={4} />
            )}
          </TabsContent>

          <TabsContent value="receivables" className="m-0">
            {dashboard ? <ReceivablesPage dashboard={dashboard} /> : (
              <AdminSkeletonGrid rows={4} />
            )}
          </TabsContent>

          <TabsContent value="settings" className="m-0">
            <SettingsPage
              session={session}
              storeIdentity={storeIdentity}
              adminUrl={adminUrl}
              lanAdminUrl={lanAdminUrl}
              appearancePreference={appearancePreference}
              appearanceSaving={appearanceSaving}
              appearanceError={appearanceError}
              saveAppearancePreference={saveAppearancePreference}
              onRefresh={() => void refreshDashboard()}
              onLogout={doLogout}
            />
          </TabsContent>

          <nav className="pointer-events-none fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-50 mx-auto w-auto max-w-[560px]">
            <TabsList className="mobile-admin-bottom-nav pointer-events-auto grid h-auto w-full min-w-0 grid-cols-5 gap-1 overflow-hidden rounded-[24px] border p-1.5 shadow-[0_18px_48px_rgba(0,0,0,0.42)] backdrop-blur-xl">
              {adminSections.map((item) => (
                <TabsTrigger key={item.value} value={item.value} className="h-14 min-w-0 overflow-hidden rounded-[18px] px-1 text-[10.5px] font-semibold text-slate-400 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:bg-transparent">
                  <span className="flex min-w-0 flex-col items-center justify-center gap-1 overflow-hidden">
                    <AdminNavGlyph id={item.glyph} className="h-4 w-4 shrink-0" />
                    <span className="max-w-full truncate">{item.label}</span>
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
          </nav>
        </Tabs>
      </div>
    </div>
  );
}
