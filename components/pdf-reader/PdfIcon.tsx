import type { ReactNode } from 'react';

type Name = 'back' | 'next' | 'plus' | 'minus' | 'search' | 'fullscreen' | 'download' | 'close';
export default function PdfIcon({ name, size = 16 }: { name: Name; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
  const paths: Record<Name, ReactNode> = {
    back: <path d="m15 18-6-6 6-6" />, next: <path d="m9 18 6-6-6-6" />, plus: <><path d="M12 5v14" /><path d="M5 12h14" /></>, minus: <path d="M5 12h14" />, search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 5 5" /></>, fullscreen: <><path d="M8 3H3v5" /><path d="M16 3h5v5" /><path d="M21 16v5h-5" /><path d="M3 16v5h5" /></>, download: <><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 20h14" /></>, close: <><path d="m6 6 12 12" /><path d="m18 6-12 12" /></>,
  };
  return <svg {...common}>{paths[name]}</svg>;
}
