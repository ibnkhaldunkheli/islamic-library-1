'use client';

import {
  useEffect,
  useRef,
  useState,
  type TouchEvent as ReactTouchEvent,
  type Touch as ReactTouch,
} from 'react';
import { getProgress, setProgress } from '@/lib/progress';

const MIN_ZOOM = 0.6;
const MAX_ZOOM = 2.5;
const ZOOM_STEP = 0.2;

type Status = 'loading' | 'ready' | 'error';

export default function PdfReader({
  url,
  title,
  bookId,
}: {
  url: string;
  title: string;
  bookId?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const zoomWrapRef = useRef<HTMLDivElement>(null);
  const pdfDocRef = useRef<any>(null);
  const renderTaskRef = useRef<any>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const pinchRef = useRef<{ startDist: number; startZoom: number } | null>(null);
  const restoredPageRef = useRef(false);

  const [status, setStatus] = useState<Status>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [rendering, setRendering] = useState(false);
  const [resizeTick, setResizeTick] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  const [pageInput, setPageInput] = useState('1');
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setStatus('loading');
      setErrorMessage('');
      restoredPageRef.current = false;

      try {
        const pdfjsLib = await import('pdfjs-dist');

        pdfjsLib.GlobalWorkerOptions.workerSrc =
          `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

        const doc = await pdfjsLib.getDocument({ url }).promise;

        if (cancelled) {
          doc.destroy();
          return;
        }

        pdfDocRef.current = doc;
        setNumPages(doc.numPages);

        const saved = bookId ? getProgress('book', bookId) : undefined;

        const startPage =
          saved &&
          Number.isInteger(saved) &&
          saved >= 1 &&
          saved <= doc.numPages
            ? saved
            : 1;

        restoredPageRef.current = true;
        setPageNum(startPage);
        setPageInput(String(startPage));
        setZoom(1);
        setStatus('ready');
      } catch (err) {
        if (cancelled) return;

        console.error('Failed to load PDF', err);
        setStatus('error');
        setErrorMessage(
          'This book could not be loaded. Please check your connection and try again.'
        );
      }
    }

    load();

    return () => {
      cancelled = true;
      pdfDocRef.current?.destroy?.();
      pdfDocRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, reloadKey]);

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

        if (!container) return;

        const fitScale = (container.clientWidth / unscaledWidth) * zoom;
        const viewport = page.getViewport({ scale: fitScale });

        if (!canvas) return;
        
        const context = canvas.getContext('2d');
        if (!context) return;

        const pixelRatio = window.devicePixelRatio || 1;

        canvas.width = Math.floor(viewport.width * pixelRatio);
        canvas.height = Math.floor(viewport.height * pixelRatio);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        if (zoomWrapRef.current) {
          zoomWrapRef.current.style.transform = '';
        }

        const renderTask = page.render({
          canvasContext: context,
          viewport,
          transform:
            pixelRatio !== 1
              ? [pixelRatio, 0, 0, pixelRatio, 0, 0]
              : undefined,
        });

        renderTaskRef.current = renderTask;

        await renderTask.promise;
      } catch (err: any) {
        if (
          cancelled ||
          err?.name === 'RenderingCancelledException'
        ) {
          return;
        }

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

  useEffect(() => {
    if (!bookId || status !== 'ready' || !restoredPageRef.current) return;

    setProgress('book', bookId, pageNum);
  }, [bookId, status, pageNum]);

  useEffect(() => {
    setPageInput(String(pageNum));
  }, [pageNum]);

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

  function goToPage(raw: string) {
    const n = Math.round(Number(raw));

    if (!Number.isFinite(n)) {
      setPageInput(String(pageNum));
      return;
    }

    const clamped = Math.min(
      Math.max(n, 1),
      Math.max(numPages, 1)
    );

    setPageNum(clamped);
    setPageInput(String(clamped));
  }

  function zoomIn() {
    setZoom((z) =>
      Math.min(
        MAX_ZOOM,
        Math.round((z + ZOOM_STEP) * 100) / 100
      )
    );
  }

  function zoomOut() {
    setZoom((z) =>
      Math.max(
        MIN_ZOOM,
        Math.round((z - ZOOM_STEP) * 100) / 100
      )
    );
  }

  function touchDistance(t0: ReactTouch, t1: ReactTouch) {
    return Math.hypot(
      t1.clientX - t0.clientX,
      t1.clientY - t0.clientY
    );
  }

  function onTouchStart(e: ReactTouchEvent) {
    if (e.touches.length >= 2) {
      touchStartRef.current = null;

      pinchRef.current = {
        startDist: touchDistance(
          e.touches[0],
          e.touches[1]
        ),
        startZoom: zoom,
      };

      return;
    }

    if (pinchRef.current) return;

    const t = e.touches[0];

    touchStartRef.current = {
      x: t.clientX,
      y: t.clientY,
    };
  }

  function onTouchMove(e: ReactTouchEvent) {
    const pinch = pinchRef.current;

    if (!pinch || e.touches.length < 2) return;

    const dist = touchDistance(
      e.touches[0],
      e.touches[1]
    );

    if (pinch.startDist <= 0) return;

    const ratio = dist / pinch.startDist;

    const liveZoom = Math.min(
      MAX_ZOOM,
      Math.max(
        MIN_ZOOM,
        pinch.startZoom * ratio
      )
    );

    if (zoomWrapRef.current) {
      zoomWrapRef.current.style.transform =
        `scale(${liveZoom / zoom})`;
    }
  }

  function endPinch() {
    const pinch = pinchRef.current;

    if (!pinch) return;

    pinchRef.current = null;

    if (zoomWrapRef.current) {
      const transform =
        zoomWrapRef.current.style.transform;

      const match =
        /scale\(([\d.]+)\)/.exec(transform);

      const liveFactor =
        match ? parseFloat(match[1]) : 1;

      const finalZoom = Math.min(
        MAX_ZOOM,
        Math.max(
          MIN_ZOOM,
          Math.round(
            zoom * liveFactor * 100
          ) / 100
        )
      );

      zoomWrapRef.current.style.transform = '';

      setZoom(finalZoom);
    }
  }

  function onTouchEnd(e: ReactTouchEvent) {
    if (
      e.touches.length < 2 &&
      pinchRef.current
    ) {
      endPinch();
    }

    if (e.touches.length > 0) return;

    const start = touchStartRef.current;
    touchStartRef.current = null;

    if (!start) return;

    const t = e.changedTouches[0];

    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;

    if (
      Math.abs(dx) > 60 &&
      Math.abs(dx) > Math.abs(dy) * 1.5
    ) {
      if (dx < 0) goNext();
      else goPrev();
    }
  }

  async function handleDownload() {
    if (downloading) return;

    setDownloading(true);
    setDownloadError(false);

    try {
      const res = await fetch(url);

      if (!res.ok) {
        throw new Error('download failed');
      }

      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);

      const safeName =
        title
          .trim()
          .replace(/[\\/:*?"<>|]+/g, ' ')
          .replace(/\s+/g, ' ')
          .trim() || 'book';

      const a = document.createElement('a');

      a.href = blobUrl;
      a.download = `${safeName}.pdf`;

      document.body.appendChild(a);
      a.click();
      a.remove();

      setTimeout(
        () => URL.revokeObjectURL(blobUrl),
        30000
      );
    } catch (err) {
      console.error(
        'Failed to download PDF',
        err
      );

      setDownloadError(true);
    } finally {
      setDownloading(false);
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
            disabled={
              status !== 'ready' ||
              zoom <= MIN_ZOOM
            }
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
            disabled={
              status !== 'ready' ||
              zoom >= MAX_ZOOM
            }
            aria-label="Zoom in"
            className={toolbarBtn}
          >
            +
          </button>
        </div>

        {numPages > 0 && (
          <span className="text-xs font-medium text-ink/60">
            Page {pageNum} of {numPages}
          </span>
        )}

        <button
          type="button"
          onClick={handleDownload}
          disabled={
            status !== 'ready' ||
            downloading
          }
          aria-label="Download PDF"
          title="Download"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-blue-600 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {downloading ? (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 3v12" />
              <path d="m7 10 5 5 5-5" />
              <path d="M5 20h14" />
            </svg>
          )}
        </button>
      </div>

      <div
        ref={containerRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
        className="relative flex min-h-[65vh] items-start justify-center overflow-auto bg-emerald-50/40 p-2 sm:p-4"
        style={{
          touchAction: 'pan-x pan-y',
        }}
      >
        {status === 'loading' && (
          <div className="flex h-[60vh] w-full flex-col items-center justify-center gap-3 text-ink/50">
            <span className="h-7 w-7 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
            <p className="text-sm">
              Loading book…
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="flex h-[60vh] w-full flex-col items-center justify-center gap-3 px-6 text-center">
            <p className="max-w-sm text-sm text-ink/70">
              {errorMessage}
            </p>

            <div className="flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setReloadKey((k) => k + 1)
                }
                className="btn-secondary"
              >
                Try again
              </button>

              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
              >
                Open PDF
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

            <div
              ref={zoomWrapRef}
              className="min-w-full flex justify-center"
              style={{
                transformOrigin: 'center top',
              }}
            >
              <canvas
                ref={canvasRef}
                className="shrink-0 shadow-sm"
                aria-label={`${title} — page ${pageNum}`}
              />
            </div>
          </>
        )}
      </div>

      {downloadError && (
        <p className="px-3 pt-2 text-xs text-red-600">
          Couldn&apos;t download the file. Please try again.
        </p>
      )}

      {status === 'ready' && numPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line bg-white px-3 py-2.5">
          <button
            type="button"
            onClick={goPrev}
            disabled={pageNum <= 1}
            className="btn-secondary px-3 py-1.5 text-sm"
          >
            ‹ Prev
          </button>

          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-ink/40 sm:inline">
              Use ← → or swipe to turn pages
            </span>

            <div className="flex items-center gap-1.5 text-xs text-ink/60">
              <span className="hidden sm:inline">
                Go to
              </span>

              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={numPages}
                value={pageInput}
                onChange={(e) =>
                  setPageInput(e.target.value)
                }
                onBlur={(e) =>
                  goToPage(e.target.value)
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    goToPage(
                      (
                        e.target as HTMLInputElement
                      ).value
                    );
                  }
                }}
                aria-label="Go to page"
                className="w-14 rounded-card border border-line bg-white px-2 py-1 text-center text-sm text-ink focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />

              <span>
                / {numPages}
              </span>
            </div>
          </div>

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
