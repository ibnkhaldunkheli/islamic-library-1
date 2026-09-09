'use client';

import { useEffect, useRef, useState, type TouchEvent as ReactTouchEvent } from 'react';

// Renders a book's PDF directly inside the page using pdfjs-dist, instead of
// relying on the device's native PDF viewer (unreliable on Android Chrome,
// which often just offers a download/"Open" prompt for iframed PDFs).
//
// This is entirely read-only and entirely client-side: it fetches the same
// public Supabase Storage URL the app already uses, in the visitor's own
// browser. No Supabase key of any kind — anon or service-role — is used
// here, and nothing about the existing storage/RLS setup changes.

const MIN_ZOOM = 0.6;
const MAX_ZOOM = 2.5;
const ZOOM_STEP = 0.2;

type Status = 'loading' | 'ready' | 'error';

export default function PdfReader({ url, title }: { url: string; title: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfDocRef = useRef<any>(null);
  const renderTaskRef = useRef<any>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const pinchRef = useRef<{ startDistance: number; startZoom: number } | null>(null);

  const [status, setStatus] = useState<Status>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [rendering, setRendering] = useState(false);
  const [resizeTick, setResizeTick] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);

  // Load the PDF document whenever the url changes, or the user hits "Try again".
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setStatus('loading');
      setErrorMessage('');
      try {
        const pdfjsLib = await import('pdfjs-dist');
        // Matches the worker version to whatever pdfjs-dist version is
        // actually installed, so it can never drift out of sync.
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

        const doc = await pdfjsLib.getDocument({ url }).promise;
        if (cancelled) {
          doc.destroy();
          return;
        }
        pdfDocRef.current = doc;
        setNumPages(doc.numPages);
        setPageNum(1);
        setZoom(1);
        setStatus('ready');
      } catch (err) {
        if (cancelled) return;
        console.error('Failed to load PDF', err);
        setStatus('error');
        setErrorMessage('This book could not be loaded. Please check your connection and try again.');
      }
    }

    load();

    return () => {
      cancelled = true;
      pdfDocRef.current?.destroy?.();
      pdfDocRef.current = null;
    };
  }, [url, reloadKey]);

  // Re-render if the visible width changes (orientation change, window resize).
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    let timeout: ReturnType<typeof setTimeout>;
    const observer = new ResizeObserver(() => {
      clearTimeout(timeout);
      timeout = setTimeout(() => setResizeTick((t) => t + 1), 150);
    });
    observer.observe(el);
    return () => {
      clearTimeout(timeout);
      observer.disconnect();
    };
  }, []);

  // Render the current page to the canvas whenever the page, zoom, or size changes.
  useEffect(() => {
    if (status !== 'ready') return;
    const doc = pdfDocRef.current;
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!doc || !container || !canvas) return;

    let cancelled = false;

    async function renderPage() {
      setRendering(true);
      try {
        renderTaskRef.current?.cancel();
        const page = await doc.getPage(pageNum);
        if (cancelled) return;

        const unscaledWidth = page.getViewport({ scale: 1 }).width;
        const fitScale = (container.clientWidth / unscaledWidth) * zoom;
        const viewport = page.getViewport({ scale: fitScale });

        const context = canvas.getContext('2d');
        if (!context) return;

        // Render at the device's real pixel density so text stays crisp on
        // high-DPI Android/iOS screens instead of looking blurry.
        const pixelRatio = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * pixelRatio);
        canvas.height = Math.floor(viewport.height * pixelRatio);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        const renderTask = page.render({
          canvasContext: context,
          viewport,
          transform: pixelRatio !== 1 ? [pixelRatio, 0, 0, pixelRatio, 0, 0] : undefined,
        });
        renderTaskRef.current = renderTask;
        await renderTask.promise;
      } catch (err: any) {
        if (cancelled || err?.name === 'RenderingCancelledException') return;
        console.error('Failed to render page', err);
        setStatus('error');
        setErrorMessage('There was a problem displaying this page.');
      } finally {
        if (!cancelled) setRendering(false);
      }
    }

    renderPage();

    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
    };
  }, [status, pageNum, zoom, resizeTick]);

  // Left/right arrow keys move pages on desktop.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (status !== 'ready') return;
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, pageNum, numPages]);

  function goPrev() {
    setPageNum((p) => Math.max(1, p - 1));
  }

  function goNext() {
    setPageNum((p) => Math.min(numPages, p + 1));
  }

  function zoomIn() {
    setZoom((z) => Math.min(MAX_ZOOM, Math.round((z + ZOOM_STEP) * 100) / 100));
  }

  function zoomOut() {
    setZoom((z) => Math.max(MIN_ZOOM, Math.round((z - ZOOM_STEP) * 100) / 100));
  }

  function getTouchDistance(e: ReactTouchEvent) {
    if (e.touches.length < 2) return 0;
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    return Math.hypot(dx, dy);
  }

  function onTouchStart(e: ReactTouchEvent) {
    if (e.touches.length >= 2) {
      touchStartRef.current = null;
      const distance = getTouchDistance(e);
      if (distance > 0) {
        pinchRef.current = { startDistance: distance, startZoom: zoom };
      }
      return;
    }

    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
  }

  function onTouchMove(e: ReactTouchEvent) {
    if (e.touches.length < 2 || !pinchRef.current) return;

    // The browser must not turn a two-finger gesture into page scrolling.
    e.preventDefault();

    const distance = getTouchDistance(e);
    if (!distance) return;

    const { startDistance, startZoom } = pinchRef.current;
    const nextZoom = startZoom * (distance / startDistance);
    setZoom(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextZoom)));
  }

  function onTouchEnd(e: ReactTouchEvent) {
    if (e.touches.length < 2) {
      pinchRef.current = null;
    }

    // Never turn a pinch gesture into a page swipe.
    if (e.touches.length > 0 || pinchRef.current) {
      touchStartRef.current = null;
      return;
    }

    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start) return;

    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;

    // Only treat clearly horizontal single-finger swipes as a page turn.
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0) goNext();
      else goPrev();
    }
  }

  const toolbarBtn =
    'flex h-8 w-8 items-center justify-center rounded-card border border-line bg-white text-sm font-medium text-ink transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40';

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-line bg-white px-3 py-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={zoomOut}
            disabled={status !== 'ready' || zoom <= MIN_ZOOM}
            aria-label="Zoom out"
            className={toolbarBtn}
          >
            −
          </button>
          <span className="w-10 text-center text-xs font-medium text-ink/60">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={zoomIn}
            disabled={status !== 'ready' || zoom >= MAX_ZOOM}
            aria-label="Zoom in"
            className={toolbarBtn}
          >
            +
          </button>
        </div>
        <div className="flex items-center gap-2">
          {numPages > 0 && (
            <span className="text-xs font-medium text-ink/60">
              Page {pageNum} of {numPages}
            </span>
          )}
          <a
            href={url}
            download
            aria-label="Download PDF"
            className={toolbarBtn}
            title="Download PDF"
          >
            ↓
          </a>
        </div>
      </div>

      <div
        ref={containerRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className="relative flex min-h-[65vh] items-start justify-center overflow-auto bg-emerald-50/40 p-2 sm:p-4"
        style={{ touchAction: 'pan-x pan-y' }}
      >
        {status === 'loading' && (
          <div className="flex h-[60vh] w-full flex-col items-center justify-center gap-3 text-ink/50">
            <span className="h-7 w-7 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
            <p className="text-sm">Loading book…</p>
          </div>
        )}

        {status === 'error' && (
          <div className="flex h-[60vh] w-full flex-col items-center justify-center gap-3 px-6 text-center">
            <p className="max-w-sm text-sm text-ink/70">{errorMessage}</p>
            <div className="flex flex-wrap justify-center gap-2">
              <button type="button" onClick={() => setReloadKey((k) => k + 1)} className="btn-secondary">
                Try again
              </button>
              <a href={url} target="_blank" rel="noopener noreferrer" className="btn-secondary">
                Open PDF directly
              </a>
            </div>
          </div>
        )}

        {status === 'ready' && (
          <>
            {rendering && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-paper/50">
                <span className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
              </div>
            )}
            <div className="min-w-full flex justify-center"><canvas ref={canvasRef} className="shrink-0 shadow-sm" aria-label={`${title} — page ${pageNum}`} /></div>
          </>
        )}
      </div>

      {status === 'ready' && numPages > 1 && (
        <div className="flex items-center justify-between gap-2 border-t border-line bg-white px-3 py-2.5">
          <button
            type="button"
            onClick={goPrev}
            disabled={pageNum <= 1}
            className="btn-secondary px-3 py-1.5 text-sm"
          >
            ‹ Prev
          </button>
          <span className="hidden text-xs text-ink/40 sm:inline">Use ← → or swipe to turn pages</span>
          <button
            type="button"
            onClick={goNext}
            disabled={pageNum >= numPages}
            className="btn-secondary px-3 py-1.5 text-sm"
          >
            Next ›
          </button>
        </div>
      )}
    </div>
  );
}
