'use client';

import { useEffect, useRef } from 'react';
import type { PdfPageProxy } from './PdfDocument';
import PdfPage from './PdfPage';
import type { PdfRenderQueue } from './PdfRenderQueue';

export default function PdfViewport({ total, pages, queue, current, width, scale, title, zoomTransform, onCurrent, onPinchStart, onPinchMove, onPinchEnd }: { total: number; pages: Map<number, PdfPageProxy>; queue: PdfRenderQueue; current: number; width: number; scale: number; title: string; zoomTransform?: string; onCurrent: (page: number) => void; onPinchStart: (event: React.TouchEvent<HTMLDivElement>) => void; onPinchMove: (event: React.TouchEvent<HTMLDivElement>) => void; onPinchEnd: (event: React.TouchEvent<HTMLDivElement>) => void }) {
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = rootRef.current; if (!root || !total || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver((entries) => { const best = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]; if (best) onCurrent(Number((best.target as HTMLElement).dataset.page)); }, { root, rootMargin: '20% 0px', threshold: [0.2, 0.6, 0.9] });
    root.querySelectorAll<HTMLElement>('[data-page]').forEach((node) => observer.observe(node)); return () => observer.disconnect();
  }, [onCurrent, total, width, scale]);
  return <div ref={rootRef} className="relative h-[72vh] min-h-[520px] overflow-auto bg-slate-100 px-2 py-4 overscroll-contain sm:h-[78vh] sm:px-5" onTouchStart={onPinchStart} onTouchMove={onPinchMove} onTouchEnd={onPinchEnd} onTouchCancel={onPinchEnd} style={{ touchAction: 'pan-y pinch-zoom' }}><div style={{ transform: zoomTransform, transformOrigin: 'center center', transition: zoomTransform ? 'none' : 'transform 180ms ease-out' }}>{Array.from({ length: total }, (_, index) => { const page = index + 1; const active = Math.abs(page - current) <= 2; return <div key={page} data-page={page} style={{ minHeight: `${Math.max(260, width * 1.414 * scale + 24)}px` }}><PdfPage page={pages.get(page)} pageNumber={page} queue={queue} active={active} width={width} scale={scale} title={title} /></div>; })}</div></div>;
}
