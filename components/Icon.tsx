import type { ReactNode } from 'react';

type IconName = 'home' | 'books' | 'audio' | 'scholar' | 'categories' | 'search' | 'play' | 'pause' | 'prev' | 'next' | 'close' | 'arrowRight' | 'arrowLeft';
export default function Icon({ name, size = 16, className = '' }: { name: IconName; size?: number; className?: string }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
  const paths: Record<IconName, ReactNode> = {
    home: <><path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10" /><path d="M9 20v-6h6v6" /></>, books: <><path d="M5 4.5A2.5 2.5 0 0 1 7.5 2H19v18H7.5A2.5 2.5 0 0 0 5 22V4.5Z" /><path d="M5 4.5V22" /><path d="M9 6h6" /></>, audio: <><circle cx="12" cy="12" r="8" /><path d="m10 8 5 4-5 4V8Z" /></>, scholar: <><circle cx="12" cy="8" r="3" /><path d="M5 20a7 7 0 0 1 14 0" /></>, categories: <><rect x="4" y="4" width="6" height="6" /><rect x="14" y="4" width="6" height="6" /><rect x="4" y="14" width="6" height="6" /><rect x="14" y="14" width="6" height="6" /></>, search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 5 5" /></>, play: <path fill="currentColor" stroke="none" d="m8 5 11 7-11 7V5Z" />, pause: <path fill="currentColor" stroke="none" d="M6 5h4v14H6zM14 5h4v14h-4z" />, prev: <path d="m15 18-6-6 6-6" />, next: <path d="m9 18 6-6-6-6" />, close: <><path d="m6 6 12 12" /><path d="m18 6-12 12" /></>, arrowRight: <><path d="M4 12h15" /><path d="m13 6 6 6-6 6" /></>, arrowLeft: <><path d="M20 12H5" /><path d="m11 6-6 6 6 6" /></>,
  };
  return <svg {...common} className={className}>{paths[name]}</svg>;
}
