import { useEffect, useState, useCallback } from 'react';
import { posApi } from '../../services/posApi';
import type { AuthSession, UserAppearancePreference } from '../../services/posApi.types';
import { adminThemeColor, defaultAppearancePreference } from '../types';
import { applyDocumentAppearance, readStoredAppearance, writeStoredAppearance } from '../../lib/appearance';

export function useAppearance(session: AuthSession | null) {
  const [appearancePreference, setAppearancePreference] = useState<UserAppearancePreference>(() => {
    const stored = readStoredAppearance('mobile-admin');
    return {
      mode: stored?.mode ?? defaultAppearancePreference.mode,
      accent: stored?.accent ?? defaultAppearancePreference.accent,
      theme: defaultAppearancePreference.theme,
    };
  });
  const [appearanceSaving, setAppearanceSaving] = useState(false);
  const [appearanceError, setAppearanceError] = useState('');

  // Apply appearance to DOM
  useEffect(() => {
    applyDocumentAppearance('mobile-admin', {
      mode: appearancePreference.mode,
      accent: appearancePreference.accent,
    });
    writeStoredAppearance('mobile-admin', {
      mode: appearancePreference.mode,
      accent: appearancePreference.accent,
      theme: appearancePreference.theme,
    });

    const theme = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (theme) {
      theme.setAttribute('content', adminThemeColor[appearancePreference.accent]);
    }
  }, [appearancePreference]);

  // Load appearance preference from API
  useEffect(() => {
    if (!session || session.forcePasswordChange) return;

    let active = true;
    const loadPreference = async () => {
      try {
        const next = await posApi.getMyAppearancePreference();
        if (active) {
          setAppearancePreference(next);
          writeStoredAppearance('mobile-admin', next);
          setAppearanceError('');
        }
      } catch (error) {
        if (active) {
          setAppearanceError(error instanceof Error ? error.message : 'Preferensi tampilan belum bisa dimuat.');
        }
      }
    };

    void loadPreference();
    return () => { active = false; };
  }, [session]);

  const saveAppearancePreference = useCallback(async (next: UserAppearancePreference) => {
    setAppearanceSaving(true);
    setAppearanceError('');
    try {
      const saved = await posApi.updateMyAppearancePreference(next);
      setAppearancePreference(saved);
    } catch (error) {
      setAppearanceError(error instanceof Error ? error.message : 'Preferensi tampilan gagal disimpan.');
    } finally {
      setAppearanceSaving(false);
    }
  }, []);

  return {
    appearancePreference,
    setAppearancePreference,
    appearanceSaving,
    appearanceError,
    saveAppearancePreference,
  };
}
