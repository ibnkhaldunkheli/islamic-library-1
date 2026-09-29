'use client';

import { useEffect } from 'react';

// Registers public/sw.js once, after the page has finished loading, so it
// never competes with the initial page load for bandwidth/CPU. Silently
// no-ops in browsers without service worker support (e.g. some in-app
// browsers) — this is a progressive enhancement, not a requirement for
// the site to work.
export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Registration failing (e.g. unsupported browser, dev environment
        // quirk) should never break the app — it's a pure enhancement.
      });
    };
    window.addEventListener('load', register);
    return () => window.removeEventListener('load', register);
  }, []);

  return null;
}
