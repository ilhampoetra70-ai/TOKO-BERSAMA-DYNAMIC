import { useCallback, useEffect, useRef, useState } from 'react';
import { posApi } from '../../services/posApi';
import type { AuthSession } from '../../services/posApi.types';
import type { AdminSection, InventorySort, LoadState, ReportRange } from '../types';
import type { MobileAdminDashboardData } from '../mobileAdminApi';
import { loadMobileAdminDashboard } from '../mobileAdminApi';
import { formatDateTime, resolveReportRange } from '../utils';

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError';
}

export function useDashboard(
  session: AuthSession | null,
  activeSection: AdminSection,
  options: {
    transactionsRange?: { from: string; to: string };
    inventoryQuery?: string;
    inventorySort?: InventorySort;
    refreshPaused?: boolean;
  } = {}
) {
  const [dashboard, setDashboard] = useState<MobileAdminDashboardData | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [loadError, setLoadError] = useState('Sesi admin tidak siap.');
  const [lastSync, setLastSync] = useState('');
  const [reportRange, setReportRange] = useState<ReportRange>('today');
  const abortRef = useRef<AbortController | null>(null);
  const activeInventoryQuery = activeSection === 'inventory' ? options.inventoryQuery : undefined;
  const activeInventorySort = activeSection === 'inventory' ? options.inventorySort : undefined;
  const activeTransactionsRange = activeSection === 'transactions' ? options.transactionsRange : undefined;

  const refreshDashboard = useCallback(() => {
    const range = activeTransactionsRange
      ? activeTransactionsRange
      : resolveReportRange(reportRange);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoadState((current) => (current === 'ready' ? 'ready' : 'loading'));
    return loadMobileAdminDashboard({
      ...range,
      section: activeSection,
      inventoryQuery: activeInventoryQuery,
      inventorySort: activeInventorySort,
      inventoryLimit: activeSection === 'inventory' ? 180 : undefined,
      signal: controller.signal,
    })
      .then((next) => {
        if (controller.signal.aborted) return null;
        setDashboard(next);
        setLastSync(formatDateTime(next.loadedAt));
        setLoadState('ready');
        setLoadError('');
        return next;
      })
      .catch((error) => {
        if (controller.signal.aborted || isAbortError(error)) return null;
        setLoadState('error');
        setLoadError(error instanceof Error ? error.message : 'Tidak bisa memuat ulang data.');
        return null;
      })
      .finally(() => {
        if (abortRef.current === controller) {
          abortRef.current = null;
        }
      });
  }, [activeInventoryQuery, activeInventorySort, activeSection, activeTransactionsRange, reportRange]);

  useEffect(() => {
    if (!session || session.forcePasswordChange) {
      abortRef.current?.abort();
      setDashboard(null);
      setLoadState('idle');
      return;
    }

    const handleWorkspaceUpdate = () => {
      if (!options.refreshPaused) void refreshDashboard();
    };

    if (!options.refreshPaused) void refreshDashboard();
    const intervalId = window.setInterval(() => {
      if (!options.refreshPaused) void refreshDashboard();
    }, 30000);

    window.addEventListener(posApi.eventName, handleWorkspaceUpdate);
    window.addEventListener('focus', handleWorkspaceUpdate);

    return () => {
      abortRef.current?.abort();
      window.clearInterval(intervalId);
      window.removeEventListener(posApi.eventName, handleWorkspaceUpdate);
      window.removeEventListener('focus', handleWorkspaceUpdate);
    };
  }, [options.refreshPaused, refreshDashboard, session]);

  return {
    dashboard,
    loadState,
    loadError,
    lastSync,
    reportRange,
    setReportRange,
    refreshDashboard,
  };
}
