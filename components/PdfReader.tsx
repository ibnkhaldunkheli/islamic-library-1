'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { loadPdfDocument, type PdfDocumentProxy, type PdfPageProxy } from './pdf-reader/PdfDocument';
import { PdfPageCache } from './pdf-reader/PdfCache';
import { PdfRenderQueue } from './pdf-reader/PdfRenderQueue';
import { restorePdfProgress, savePdfProgress } from './pdf-reader/PdfProgress';
import { searchPdf, type PdfSearchResult } from './pdf-reader/PdfSearch';
import PdfToolbar from './pdf-reader/PdfToolbar';
import PdfViewport from './pdf-reader/PdfViewport';

const MIN_ZOOM = 0.75;
const MAX_ZOOM = 3.5;

type TouchPair = { distance: number; zoom: number };

export default function PdfReader({ url, title, bookId }: { url: string; title: string; bookId?: string }) {
  const { user, loading: userLoading } = useCurrentUser();
  const shellRef = useRef<HTMLDivElement>(null);
  const documentRef = useRef<PdfDocumentProxy | null>(null);
  const cacheRef = useRef(new PdfPageCache(10));
  const queueRef = useRef(new PdfRenderQueue(1));
  const saveTimer = useRef<number | null>(null);
  const pinchRef = useRef<TouchPair | null>(null);
  const transformRef = useRef<HTMLDivElement>(null);
  const liveZoom = useRef(1);
  const progressPage = useRef(1);

  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const [total, setTotal] = useState(0);
  const [current, setCurrent] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [pageWidth, setPageWidth] = useState(560);
  const [pages, setPages] = useState<Map<number, PdfPageProxy>>(new Map());
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<PdfSearchResult[]>([]);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [downloadError, setDownloadError] = useState(false);
  const [loadToken, setLoadToken] = useState(0);

  const getPage = useCallback(async (pageNumber: number) => {
    const cached = cacheRef.current.get(pageNumber);
    if (cached) return cached;
    if (!documentRef.current) throw new Error('PDF is not ready');
    const page = await documentRef.current.getPage(pageNumber);
    cacheRef.current.set(pageNumber, page);
    setPages((previous) => {
      const next = new Map(previous);
      next.set(pageNumber, page);
      return next;
    });
    return page;
  }, []);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    setError('');
    cacheRef.current.clear();
    queueRef.current.clear();
    void (async () => {
      try {
        const document = await loadPdfDocument(url, bookId);
        if (cancelled) {
          await document.destroy();
          return;
        }
        documentRef.current = document;
        const first = await document.getPage(1);
        cacheRef.current.set(1, first);
        const viewport = first.getViewport({ scale: 1 });
        setPageWidth(Math.min(760, Math.max(280, viewport.width)));
        setTotal(document.numPages);
        setPages(new Map([[1, first]]));
        setStatus('ready');
      } catch (cause) {
        if (!cancelled) {
          console.error('Failed to load PDF', cause);
          setError('Unable to open this book. Check your connection or offline download and try again.');
          setStatus('error');
        }
      }
    })();
    const queue = queueRef.current;
    const cache = cacheRef.current;
    return () => {
      cancelled = true;
      queue.clear();
      cache.clear();
      const document = documentRef.current;
      documentRef.current = null;
      if (document) void document.destroy();
    };
  }, [bookId, loadToken, url]);

  useEffect(() => {
    if (!bookId || !total || status !== 'ready' || userLoading) return;
    let cancelled = false;
    void restorePdfProgress(bookId, user?.id, total).then((page) => {
      if (cancelled) return;
      progressPage.current = page;
      setCurrent(page);
      void getPage(page);
      window.requestAnimationFrame(() => shellRef.current?.querySelector<HTMLElement>(`[data-page="${page}"]`)?.scrollIntoView({ block: 'start' }));
    });
    return () => { cancelled = true; };
  }, [bookId, getPage, status, total, user?.id, userLoading]);

  useEffect(() => {
    if (!bookId || status !== 'ready') return;
    progressPage.current = current;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => savePdfProgress(bookId, user?.id, progressPage.current), 700);
    return () => { if (saveTimer.current) window.clearTimeout(saveTimer.current); };
  }, [bookId, current, status, user?.id]);

  useEffect(() => {
    const onVisibility = () => { if (document.visibilityState === 'hidden' && bookId) savePdfProgress(bookId, user?.id, progressPage.current); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [bookId, user?.id]);

  useEffect(() => {
    const onResize = () => setPageWidth(Math.min(760, Math.max(280, (shellRef.current?.clientWidth ?? 600) - 48)));
    onResize();
    const observer = shellRef.current && typeof ResizeObserver !== 'undefined' ? new ResizeObserver(onResize) : null;
    if (observer && shellRef.current) observer.observe(shellRef.current);
    return () => observer?.disconnect();
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void shellRef.current?.requestFullscreen?.();
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement) return;
      if (event.key === '+' || event.key === '=') setZoom((value) => Math.min(MAX_ZOOM, value + 0.2));
      if (event.key === '-') setZoom((value) => Math.max(MIN_ZOOM, value - 0.2));
      if (event.key === 'Home') shellRef.current?.querySelector<HTMLElement>('[data-page="1"]')?.scrollIntoView({ behavior: 'smooth' });
      if (event.key === 'End' && total) shellRef.current?.querySelector<HTMLElement>(`[data-page="${total}"]`)?.scrollIntoView({ behavior: 'smooth' });
      if (event.key.toLowerCase() === 'f') toggleFullscreen();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggleFullscreen, total]);

  const updateCurrent = useCallback((page: number) => {
    if (page < 1 || page > total) return;
    progressPage.current = page;
    setCurrent(page);
    const nearby = new Set<number>();
    for (let offset = -2; offset <= 2; offset += 1) if (page + offset >= 1 && page + offset <= total) nearby.add(page + offset);
    void Promise.all([...nearby].map((value) => getPage(value)));
    setPages((previous) => { const next = new Map<number, PdfPageProxy>(); for (const value of nearby) { const cached = cacheRef.current.get(value) ?? previous.get(value); if (cached) next.set(value, cached); } return next; });
  }, [getPage, total]);

  const jump = useCallback((page: number) => {
    const safe = Math.min(total, Math.max(1, Math.round(page)));
    updateCurrent(safe);
    window.requestAnimationFrame(() => shellRef.current?.querySelector<HTMLElement>(`[data-page="${safe}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }, [total, updateCurrent]);

  const download = async () => {
    setDownloadOpen(false); setDownloadError(false);
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('download');
      const objectUrl = URL.createObjectURL(await response.blob());
      const link = document.createElement('a'); link.href = objectUrl; link.download = `${title.replace(/[^\w\s-]/g, '').trim() || 'book'}.pdf`; link.click();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30000);
    } catch { setDownloadError(true); }
  };

  const onPinchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (event.touches.length !== 2) return;
    const a = event.touches[0]; const b = event.touches[1];
    pinchRef.current = { distance: Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY), zoom };
    liveZoom.current = zoom;
  };
  const onPinchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (!pinchRef.current || event.touches.length !== 2 || !transformRef.current) return;
    const a = event.touches[0]; const b = event.touches[1];
    liveZoom.current = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, pinchRef.current.zoom * (Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY) / pinchRef.current.distance)));
    transformRef.current.style.transform = `scale(${liveZoom.current / zoom})`;
  };
  const onPinchEnd = () => {
    if (!pinchRef.current) return;
    setZoom(liveZoom.current);
    if (transformRef.current) transformRef.current.style.transform = '';
    pinchRef.current = null;
  };

  const runSearch = async () => {
    if (!documentRef.current || !query.trim()) return;
    setSearching(true);
    const found = await searchPdf(documentRef.current, query, getPage);
    setResults(found); setSearching(false);
    if (found[0]) jump(found[0].page);
  };

  return <div ref={shellRef} className="pdf-reader-shell overflow-hidden rounded-xl border border-line bg-white">
    <PdfToolbar title={title} page={current} total={total} zoom={zoom} onPage={jump} onZoom={(delta) => setZoom((value) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, value + delta)))} onFit={() => setZoom(1)} onSearch={() => setSearchOpen((value) => !value)} onFullscreen={toggleFullscreen} onDownload={() => setDownloadOpen(true)} />
    {searchOpen && <div className="flex flex-wrap items-center gap-2 border-b border-line bg-blue-50/60 px-3 py-2"><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void runSearch(); }} placeholder="Search inside this PDF…" className="input max-w-md py-2 text-xs" /><button type="button" onClick={() => void runSearch()} className="btn-primary px-3 py-2 text-xs">{searching ? 'Searching…' : 'Search'}</button>{results.length > 0 && <span className="text-xs font-bold text-blue-700">{results.reduce((sum, result) => sum + result.count, 0)} matches</span>}</div>}
    {status === 'loading' && <div className="flex h-[65vh] items-center justify-center bg-slate-100 text-sm text-ink/55">Loading the first page…</div>}
    {status === 'error' && <div className="flex h-[65vh] flex-col items-center justify-center gap-3 bg-slate-100 p-6 text-center"><p className="text-sm text-ink/70">{error}</p><button type="button" onClick={() => setLoadToken((value) => value + 1)} className="btn-secondary">Retry</button></div>}
    {status === 'ready' && <div ref={transformRef}><PdfViewport total={total} pages={pages} queue={queueRef.current} current={current} width={pageWidth} scale={zoom} title={title} onCurrent={updateCurrent} onPinchStart={onPinchStart} onPinchMove={onPinchMove} onPinchEnd={onPinchEnd} /></div>}
    {downloadError && <p className="px-3 py-2 text-xs text-red-600">Couldn&apos;t download the file. Please try again.</p>}
    {downloadOpen && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-navy/40 p-4"><div role="dialog" aria-modal="true" className="w-full max-w-sm rounded-2xl border border-line bg-white p-6 shadow-2xl"><h2 className="text-lg font-extrabold text-navy">Download PDF?</h2><p className="mt-2 text-sm text-ink/65">Save a copy of this book to your device?</p><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setDownloadOpen(false)} className="btn-secondary">Cancel</button><button type="button" onClick={() => void download()} className="btn-primary">Continue</button></div></div></div>}
  </div>;
}
