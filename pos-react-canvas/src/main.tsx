import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { applyDocumentAppearance, defaultPosTheme, hydrateDocumentAppearance, readStoredAppearance, readStoredPosThemeForUsername, writeStoredAppearance } from './lib/appearance';
import { readLastLoginUsername } from './lib/authSession';

const pathname = window.location.pathname;
if (pathname.startsWith('/admin')) {
  hydrateDocumentAppearance('mobile-admin', {
    mode: 'auto',
    scale: 'md',
    accent: 'amber',
  });
} else {
  const storedAppearance = readStoredAppearance('pos');
  const lastUsername = readLastLoginUsername();
  const storedTheme = lastUsername ? readStoredPosThemeForUsername(lastUsername) : null;
  const nextAppearance = {
    mode: storedAppearance?.mode ?? 'auto',
    scale: storedAppearance?.scale ?? 'md',
    theme: storedTheme ?? defaultPosTheme,
  };

  applyDocumentAppearance('pos', nextAppearance);
  writeStoredAppearance('pos', {
    mode: nextAppearance.mode,
    scale: nextAppearance.scale,
  });
}

createRoot(document.getElementById('root') as HTMLElement).render(<App />);
