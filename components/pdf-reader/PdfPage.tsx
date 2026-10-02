'use client';

import { useEffect, useRef, useState } from 'react';
import type { PdfPageProxy } from './PdfDocument';
import type { PdfRenderQueue } from './PdfRenderQueue';

export default function PdfPage({ page, pageNumber, queue, active, width, scale, title, onRendered }: { page: PdfPageProxy | undefined; pageNumber: number; queue: PdfRenderQueue; active: boolean; width: number; scale: number; title: string; onRendered?: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const taskRef = useRef<{ cancel?: () => void } | null>(null);
  const [rendered, setRendered] = useState(false);
  const height = Math.max(260, width * 1.414 * scale);
  useEffect(() => {
    if (!active || !page || !canvasRef.current) return;
    let cancelled = false;
    setRendered(false);
    const canvas = canvasRef.current; const viewport = page.getViewport({ scale: (width / page.getViewport({ scale: 1 }).width) * scale }); const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(viewport.width * ratio); canvas.height = Math.floor(viewport.height * ratio); canvas.style.width = `${Math.floor(viewport.width)}px`; canvas.style.height = `${Math.floor(viewport.height)}px`;
    const context = canvas.getContext('2d'); if (!context) return;
    void queue.enqueue(pageNumber, async () => { if (cancelled) return; const task = page.render({ canvasContext: context, viewport, transform: ratio === 1 ? undefined : [ratio, 0, 0, ratio, 0, 0] }); taskRef.current = task; await task.promise; if (!cancelled) { setRendered(true); onRendered?.(); } }).catch((error) => { if (error?.name !== 'RenderingCancelledException') console.error('PDF page render failed', error); });
    return () => { cancelled = true; taskRef.current?.cancel?.(); taskRef.current = null; canvas.width = 0; canvas.height = 0; };
  }, [active, page, pageNumber, queue, scale, width, onRendered]);
  return <div className="relative mx-auto mb-3 flex justify-center" style={{ minHeight: `${height + 24}px` }}><div className="relative flex min-h-[220px] items-start justify-center bg-white shadow-[0_4px_18px_rgba(11,31,58,.12)]"><canvas ref={canvasRef} aria-label={`${title} — page`} className={active ? 'block' : 'invisible'} />{active && !rendered && <span className="pointer-events-none absolute left-1/2 top-3 h-4 w-4 -translate-x-1/2 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />}</div></div>;
}
