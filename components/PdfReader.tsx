'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type TouchEvent as ReactTouchEvent, type Touch as ReactTouch, type WheelEvent } from 'react';
import { getProgress, setProgress } from '@/lib/progress';
import { getProgressCloud, setProgressCloud } from '@/lib/cloudProgress';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { createClient } from '@/lib/supabase/client';
import { getOfflineBlob } from '@/lib/offlineStore';

type Status = 'loading' | 'ready' | 'error';
type FitMode = 'manual' | 'width' | 'page' | 'actual';
type TextItem = { str?: string; transform?: number[]; width?: number; height?: number };
type SearchResult = { page: number; count: number };

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.25;
const ZOOM_PRESETS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4];
const PAGE_MARGIN = 32;

function Icon({ name, size = 16 }: { name: 'back' | 'next' | 'plus' | 'minus' | 'download' | 'fullscreen' | 'rotate' | 'bookmark' | 'bookmarkFilled' | 'search' | 'close' | 'print' | 'grid' | 'play' | 'pause'; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
  if (name === 'bookmarkFilled') return <svg {...common} fill="currentColor"><path d="M6 3.5A1.5 1.5 0 0 1 7.5 2h9A1.5 1.5 0 0 1 18 3.5V22l-6-3.5L6 22V3.5Z" /></svg>;
  if (name === 'play') return <svg {...common} fill="currentColor" stroke="none"><path d="m8 5 11 7-11 7V5Z" /></svg>;
  if (name === 'pause') return <svg {...common} fill="currentColor" stroke="none"><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>;
  const paths: Record<string, React.ReactNode> = {
    back: <path d="m15 18-6-6 6-6" />, next: <path d="m9 18 6-6-6-6" />, plus: <><path d="M12 5v14" /><path d="M5 12h14" /></>, minus: <path d="M5 12h14" />, download: <><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 20h14" /></>, fullscreen: <><path d="M8 3H3v5" /><path d="M16 3h5v5" /><path d="M21 16v5h-5" /><path d="M3 16v5h5" /></>, rotate: <><path d="M4 12a8 8 0 0 1 13.5-5.8L20 9" /><path d="M20 4v5h-5" /><path d="M20 12a8 8 0 0 1-13.5 5.8L4 15" /><path d="M4 20v-5h5" /></>, bookmark: <path d="M6 3.5A1.5 1.5 0 0 1 7.5 2h9A1.5 1.5 0 0 1 18 3.5V22l-6-3.5L6 22V3.5Z" />, search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 5 5" /></>, close: <><path d="m6 6 12 12" /><path d="m18 6-12 12" /></>, print: <><path d="M6 9V3h12v6" /><path d="M6 18H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2" /><path d="M6 14h12v7H6z" /></>, grid: <><rect x="4" y="4" width="6" height="6" /><rect x="14" y="4" width="6" height="6" /><rect x="4" y="14" width="6" height="6" /><rect x="14" y="14" width="6" height="6" /></>,
  };
  return <svg {...common}>{paths[name]}</svg>;
}

function normalizeText(value: string) { return value.normalize('NFKC').toLocaleLowerCase().replace(/[\u064B-\u065F\u0670]/g, ''); }
function distance(a: ReactTouch, b: ReactTouch) { return Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY); }

export default function PdfReader({ url, title, bookId }: { url: string; title: string; bookId?: string }) {
  const { user } = useCurrentUser();
  const containerRef = useRef<HTMLDivElement>(null);
  const documentRef = useRef<any>(null);
  const pageHosts = useRef<Record<number, HTMLDivElement | null>>({});
  const canvases = useRef<Record<number, HTMLCanvasElement | null>>({});
  const textLayers = useRef<Record<number, HTMLDivElement | null>>({});
  const pageCache = useRef(new Map<number, any>());
  const textCache = useRef(new Map<number, TextItem[]>());
  const renderTasks = useRef(new Map<number, any>());
  const restoredPage = useRef(false);
  const pinch = useRef<{ startDistance: number; startZoom: number } | null>(null);
  const pinchFrame = useRef<number | null>(null);
  const liveZoom = useRef(1);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const [status, setStatus] = useState<Status>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [fitMode, setFitMode] = useState<FitMode>('width');
  const [rotation, setRotation] = useState(0);
  const [visiblePages, setVisiblePages] = useState<Set<number>>(new Set([1]));
  const [renderedPages, setRenderedPages] = useState<Set<number>>(new Set());
  const [renderingPages, setRenderingPages] = useState<Set<number>>(new Set());
  const [pageSize, setPageSize] = useState({ width: 595, height: 842 });
  const [resizeTick, setResizeTick] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  const [pageInput, setPageInput] = useState('1');
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(false);
  const [bookmarks, setBookmarks] = useState<number[]>([]);
  const [thumbnailsOpen, setThumbnailsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchIndex, setSearchIndex] = useState(0);

  const zoomKey = bookId ? `maktaba:zoom:book:${bookId}` : null;
  const bookmarkKey = bookId ? `maktaba:bookmarks:${bookId}` : null;

  const getPage = useCallback(async (page: number) => {
    const cached = pageCache.current.get(page);
    if (cached) return cached;
    const loaded = await documentRef.current.getPage(page);
    pageCache.current.set(page, loaded);
    return loaded;
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setStatus('loading'); setErrorMessage(''); restoredPage.current = false; pageCache.current.clear(); textCache.current.clear();
      try {
        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
        const offline = bookId ? await getOfflineBlob('book', bookId) : null;
        const task = offline ? pdfjs.getDocument({ data: await offline.arrayBuffer() }) : pdfjs.getDocument({ url, disableAutoFetch: false, disableStream: false });
        const doc = await task.promise;
        if (cancelled) { doc.destroy(); return; }
        documentRef.current = doc; setNumPages(doc.numPages);
        const firstPage = await doc.getPage(1); const viewport = firstPage.getViewport({ scale: 1 }); setPageSize({ width: viewport.width, height: viewport.height }); pageCache.current.set(1, firstPage);
        const saved = bookId ? user ? await getProgressCloud(createClient(), user.id, 'book', bookId) : getProgress('book', bookId) : undefined;
        const start = saved && Number.isInteger(saved) && saved >= 1 && saved <= doc.numPages ? saved : 1;
        setPageNum(start); setPageInput(String(start)); setVisiblePages(new Set([start])); setRenderedPages(new Set([start])); restoredPage.current = true;
        const storedZoom = zoomKey ? Number(localStorage.getItem(zoomKey)) : 1; setZoom(Number.isFinite(storedZoom) && storedZoom >= MIN_ZOOM && storedZoom <= MAX_ZOOM ? storedZoom : 1);
        try { const stored = bookmarkKey ? JSON.parse(localStorage.getItem(bookmarkKey) || '[]') : []; setBookmarks(Array.isArray(stored) ? stored.filter((value) => Number.isInteger(value) && value >= 1 && value <= doc.numPages) : []); } catch { setBookmarks([]); }
        setStatus('ready');
      } catch (error) { if (!cancelled) { console.error('Failed to load PDF', error); setStatus('error'); setErrorMessage('This book could not be loaded. Please check your connection and try again.'); } }
    }
    void load();
    return () => { cancelled = true; renderTasks.current.forEach((task) => task.cancel?.()); documentRef.current?.destroy?.(); documentRef.current = null; };
  }, [bookId, bookmarkKey, reloadKey, url, user, zoomKey]);

  useEffect(() => {
    const root = containerRef.current; if (!root || !numPages || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver((entries) => { const nextVisible = new Set(visiblePages); entries.forEach((entry) => { const page = Number((entry.target as HTMLElement).dataset.page); if (entry.isIntersecting) nextVisible.add(page); else nextVisible.delete(page); }); setVisiblePages(nextVisible); const keep = new Set<number>(); nextVisible.forEach((page) => { for (let offset = -1; offset <= 1; offset += 1) if (page + offset >= 1 && page + offset <= numPages) keep.add(page + offset); }); setRenderedPages(keep); const closest = [...nextVisible].sort((a, b) => Math.abs(a - pageNum) - Math.abs(b - pageNum))[0]; if (closest) setPageNum(closest); }, { root, rootMargin: '900px 0px', threshold: 0.01 });
    Object.entries(pageHosts.current).forEach(([page, host]) => { if (host) { host.dataset.page = page; observer.observe(host); } });
    return () => observer.disconnect();
  }, [numPages, pageNum, resizeTick, visiblePages]);

  const calculateScale = useCallback((page: any) => { const root = containerRef.current; if (!root) return 1; const viewport = page.getViewport({ scale: 1, rotation }); const width = Math.max(1, root.clientWidth - PAGE_MARGIN); const height = Math.max(1, root.clientHeight - PAGE_MARGIN); const widthScale = width / viewport.width; const pageScale = Math.min(widthScale, height / viewport.height); if (fitMode === 'width') return Math.max(0.1, widthScale); if (fitMode === 'page') return Math.max(0.1, pageScale); if (fitMode === 'actual') return 1; return zoom; }, [fitMode, rotation, zoom]);

  const renderPage = useCallback(async (pageNumber: number) => {
    const canvas = canvases.current[pageNumber]; const layer = textLayers.current[pageNumber]; const host = pageHosts.current[pageNumber]; if (!canvas || !host || !documentRef.current) return;
    setRenderingPages((current) => new Set(current).add(pageNumber));
    try {
      const page = await getPage(pageNumber); const scale = calculateScale(page); const viewport = page.getViewport({ scale, rotation }); const ratio = window.devicePixelRatio || 1; canvas.width = Math.floor(viewport.width * ratio); canvas.height = Math.floor(viewport.height * ratio); canvas.style.width = `${Math.floor(viewport.width)}px`; canvas.style.height = `${Math.floor(viewport.height)}px`; host.style.minHeight = `${Math.floor(viewport.height) + PAGE_MARGIN}px`; const task = page.render({ canvasContext: canvas.getContext('2d')!, viewport, transform: ratio !== 1 ? [ratio, 0, 0, ratio, 0, 0] : undefined }); renderTasks.current.set(pageNumber, task); await task.promise;
      if (layer) { const items = await getTextItems(pageNumber, page); layer.replaceChildren(); layer.style.width = `${viewport.width}px`; layer.style.height = `${viewport.height}px`; const query = normalizeText(searchText.trim()); items.forEach((item) => { if (!item.str || !item.transform) return; const span = document.createElement('span'); const x = item.transform[4] * scale; const y = viewport.height - item.transform[5] * scale; span.textContent = item.str; span.style.cssText = `position:absolute;left:${x}px;top:${y - (item.height ?? 10) * scale}px;font-size:${Math.max(6, (item.height ?? 10) * scale)}px;line-height:1;white-space:pre;color:transparent;`; if (query && normalizeText(item.str).includes(query)) span.style.backgroundColor = 'rgba(250,204,21,.7)'; layer.appendChild(span); }); }
      setRenderingPages((current) => { const next = new Set(current); next.delete(pageNumber); return next; });
    } catch (error: any) { if (error?.name !== 'RenderingCancelledException') console.error('Failed to render PDF page', error); setRenderingPages((current) => { const next = new Set(current); next.delete(pageNumber); return next; }); }
  }, [calculateScale, getPage, rotation, searchText]);

  const getTextItems = useCallback(async (pageNumber: number, page?: any) => { const cached = textCache.current.get(pageNumber); if (cached) return cached; const source = page ?? await getPage(pageNumber); const content = await source.getTextContent(); const items = (content.items ?? []) as TextItem[]; textCache.current.set(pageNumber, items); return items; }, [getPage]);

  useEffect(() => { renderedPages.forEach((page) => { void renderPage(page); }); }, [renderedPages, renderPage, resizeTick]);
  useEffect(() => { if (!zoomKey || status === 'loading') return; localStorage.setItem(zoomKey, String(zoom)); }, [status, zoom, zoomKey]);
  useEffect(() => { if (!bookId || status !== 'ready' || !restoredPage.current) return; setProgress('book', bookId, pageNum); if (user) setProgressCloud(createClient(), user.id, 'book', bookId, pageNum); }, [bookId, pageNum, status, user]);
  useEffect(() => { const root = containerRef.current; if (!root || typeof ResizeObserver === 'undefined') return; const observer = new ResizeObserver(() => setResizeTick((value) => value + 1)); observer.observe(root); return () => observer.disconnect(); }, []);

  async function runSearch() { const query = normalizeText(searchText.trim()); if (!query || !numPages) { setSearchResults([]); return; } setSearching(true); const results: SearchResult[] = []; for (let page = 1; page <= numPages; page += 1) { const items = await getTextItems(page); const count = items.reduce((total, item) => total + (normalizeText(item.str ?? '').split(query).length - 1), 0); if (count > 0) results.push({ page, count }); if (page % 8 === 0) await new Promise((resolve) => setTimeout(resolve, 0)); } setSearchResults(results); setSearchIndex(0); setSearching(false); if (results[0]) jumpToPage(results[0].page); }
  function jumpToPage(page: number) { const host = pageHosts.current[page]; setPageNum(page); setVisiblePages((current) => new Set([...current, page])); setRenderedPages((current) => new Set([...current, page])); host?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  function nextResult(direction: 1 | -1) { if (!searchResults.length) return; const next = (searchIndex + direction + searchResults.length) % searchResults.length; setSearchIndex(next); jumpToPage(searchResults[next].page); }
  function setManualZoom(value: number) { setFitMode('manual'); setZoom(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value))); }
  function changeZoom(delta: number) { setManualZoom(Math.round((zoom + delta) * 100) / 100); }
  function toggleBookmark() { if (!bookId) return; const next = bookmarks.includes(pageNum) ? bookmarks.filter((page) => page !== pageNum) : [...bookmarks, pageNum].sort((a, b) => a - b); setBookmarks(next); if (bookmarkKey) localStorage.setItem(bookmarkKey, JSON.stringify(next)); }
  function pageKey(page: number) { return `maktaba:page:${bookId ?? 'pdf'}:${page}`; }
  async function download() { if (downloading) return; setDownloading(true); setDownloadError(false); try { const response = await fetch(url); if (!response.ok) throw new Error('download failed'); const blobUrl = URL.createObjectURL(await response.blob()); const link = document.createElement('a'); link.href = blobUrl; link.download = `${title.replace(/[^\w\s-]/g, '').trim() || 'book'}.pdf`; link.click(); setTimeout(() => URL.revokeObjectURL(blobUrl), 30000); } catch { setDownloadError(true); } finally { setDownloading(false); } }

  function onTouchStart(e: ReactTouchEvent) { if (e.touches.length >= 2) { pinch.current = { startDistance: distance(e.touches[0], e.touches[1]), startZoom: zoom }; liveZoom.current = zoom; touchStart.current = null; } else if (!pinch.current) touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }
  function onTouchMove(e: ReactTouchEvent) { if (!pinch.current || e.touches.length < 2) return; const ratio = distance(e.touches[0], e.touches[1]) / pinch.current.startDistance; liveZoom.current = Math.round(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, pinch.current.startZoom * ratio)) * 100) / 100; if (pinchFrame.current === null) pinchFrame.current = requestAnimationFrame(() => { setManualZoom(liveZoom.current); pinchFrame.current = null; }); }
  function onTouchEnd(e: ReactTouchEvent) { if (pinch.current && e.touches.length < 2) { if (pinchFrame.current !== null) cancelAnimationFrame(pinchFrame.current); pinchFrame.current = null; setManualZoom(liveZoom.current); pinch.current = null; } if (e.touches.length > 0 || !touchStart.current) return; const start = touchStart.current; const end = e.changedTouches[0]; touchStart.current = null; const dx = end.clientX - start.x; const dy = end.clientY - start.y; if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) jumpToPage(Math.min(numPages, Math.max(1, pageNum + (dx < 0 ? 1 : -1)))); }
  function onWheel(e: WheelEvent<HTMLDivElement>) { if (!e.ctrlKey) return; e.preventDefault(); changeZoom(e.deltaY < 0 ? 0.1 : -0.1); }
  function toolbarButton(label: string) { return `flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-white text-ink transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40`; }

  const thumbnailPages = useMemo(() => { const pages = new Set<number>([1, numPages, pageNum]); for (let offset = -8; offset <= 8; offset += 1) if (pageNum + offset >= 1 && pageNum + offset <= numPages) pages.add(pageNum + offset); return [...pages].filter(Boolean).sort((a, b) => a - b); }, [numPages, pageNum]);

  return <div className="pdf-reader-shell overflow-hidden rounded-xl border border-line bg-white">
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-white px-3 py-2">
      <div className="flex items-center gap-1.5"><button type="button" onClick={() => setThumbnailsOpen((value) => !value)} className={toolbarButton('Pages')} aria-label="Show page thumbnails"><Icon name="grid" /></button><button type="button" onClick={() => setSearchOpen((value) => !value)} className={toolbarButton('Search')} aria-label="Search PDF"><Icon name="search" /></button><button type="button" onClick={() => jumpToPage(Math.max(1, pageNum - 1))} disabled={pageNum <= 1} className={toolbarButton('Previous')} aria-label="Previous page"><Icon name="back" /></button><button type="button" onClick={() => jumpToPage(Math.min(numPages, pageNum + 1))} disabled={pageNum >= numPages} className={toolbarButton('Next')} aria-label="Next page"><Icon name="next" /></button></div>
      <span className="min-w-28 text-center text-xs font-bold text-ink/65">Page {pageNum} / {numPages || '—'}</span>
      <div className="flex items-center gap-1.5"><button type="button" onClick={() => changeZoom(-ZOOM_STEP)} disabled={zoom <= MIN_ZOOM} className={toolbarButton('Zoom out')} aria-label="Zoom out"><Icon name="minus" /></button><select value={fitMode === 'manual' ? String(zoom) : fitMode} onChange={(e) => e.target.value === 'width' || e.target.value === 'page' || e.target.value === 'actual' ? (setFitMode(e.target.value), e.target.value === 'actual' && setZoom(1)) : setManualZoom(Number(e.target.value))} className="h-9 rounded-lg border border-line bg-white px-1.5 text-xs font-bold" aria-label="Fit or zoom"><option value="width">Fit width</option><option value="page">Fit page</option><option value="actual">Actual size</option>{ZOOM_PRESETS.map((value) => <option key={value} value={value}>{Math.round(value * 100)}%</option>)}</select><button type="button" onClick={() => changeZoom(ZOOM_STEP)} disabled={zoom >= MAX_ZOOM} className={toolbarButton('Zoom in')} aria-label="Zoom in"><Icon name="plus" /></button><button type="button" onClick={() => setRotation((value) => (value + 90) % 360)} className={toolbarButton('Rotate')} aria-label="Rotate page"><Icon name="rotate" /></button><button type="button" onClick={() => { if (document.fullscreenElement) void document.exitFullscreen(); else void document.querySelector('.pdf-reader-shell')?.requestFullscreen?.(); }} className={toolbarButton('Fullscreen')} aria-label="Fullscreen"><Icon name="fullscreen" /></button><button type="button" onClick={toggleBookmark} className={`${toolbarButton('Bookmark')} ${bookmarks.includes(pageNum) ? 'bg-blue-100 text-blue-700' : ''}`} aria-label="Bookmark page"><Icon name={bookmarks.includes(pageNum) ? 'bookmarkFilled' : 'bookmark'} /></button><button type="button" onClick={() => window.print()} className={`${toolbarButton('Print')} hidden sm:flex`} aria-label="Print"><Icon name="print" /></button><button type="button" onClick={download} disabled={status !== 'ready' || downloading} className={toolbarButton('Download')} aria-label="Download"><Icon name="download" /></button></div>
    </div>
    {searchOpen && <div className="flex flex-wrap items-center gap-2 border-b border-line bg-blue-50/60 px-3 py-2"><Icon name="search" size={15} /><input autoFocus value={searchText} onChange={(e) => setSearchText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void runSearch(); }} placeholder="Search inside this PDF…" className="input max-w-md py-2 text-xs"/><button type="button" onClick={() => void runSearch()} className="btn-primary px-3 py-2 text-xs">{searching ? 'Searching…' : 'Search'}</button><span className="text-xs text-ink/55">{searchResults.length ? `${searchResults.reduce((sum, result) => sum + result.count, 0)} matches` : 'No matches yet'}</span>{searchResults.length > 0 && <><button type="button" onClick={() => nextResult(-1)} className="btn-secondary px-2 py-1.5 text-xs">Prev</button><button type="button" onClick={() => nextResult(1)} className="btn-secondary px-2 py-1.5 text-xs">Next</button></>}</div>}
    {bookmarks.length > 0 && <div className="flex gap-2 overflow-x-auto border-b border-line bg-blue-50/40 px-3 py-2 text-xs"><span className="shrink-0 font-bold text-blue-700">Bookmarks</span>{bookmarks.map((page) => <button key={page} type="button" onClick={() => jumpToPage(page)} className="shrink-0 rounded-md bg-white px-2 py-1 font-semibold text-ink/65 hover:text-blue-700">Page {page}</button>)}</div>}
    {thumbnailsOpen && <div className="fixed inset-0 z-50 flex md:hidden"><button type="button" aria-label="Close thumbnails" onClick={() => setThumbnailsOpen(false)} className="absolute inset-0 bg-navy/40" /><aside className="relative z-10 h-full w-72 overflow-y-auto border-r border-line bg-white p-3 shadow-xl"><div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-bold text-navy">Pages</h2><button type="button" onClick={() => setThumbnailsOpen(false)} className="rounded-md p-1 text-ink/60 hover:bg-blue-50" aria-label="Close thumbnails"><Icon name="close" /></button></div>{thumbnailPages.map((page) => <button type="button" key={page} onClick={() => { jumpToPage(page); setThumbnailsOpen(false); }} className={`mb-2 block w-full rounded-md border p-1 text-center text-[10px] ${page === pageNum ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-line text-ink/55'}`}><Thumbnail doc={documentRef.current} page={page} /><span>Page {page}</span></button>)}</aside></div>}
    <div className="flex min-h-[65vh] bg-slate-100">
      {thumbnailsOpen && <aside className="hidden w-28 shrink-0 overflow-y-auto border-r border-line bg-white p-2 md:block">{thumbnailPages.map((page) => <button type="button" key={page} onClick={() => jumpToPage(page)} className={`mb-2 block w-full rounded-md border p-1 text-center text-[10px] ${page === pageNum ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-line text-ink/55'}`}><Thumbnail doc={documentRef.current} page={page} /><span>Page {page}</span></button>)}</aside>}
      <div ref={containerRef} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} onTouchCancel={onTouchEnd} onWheel={onWheel} onDoubleClick={() => setManualZoom(zoom > 1.1 ? 1 : 2)} className="relative min-w-0 flex-1 overflow-auto p-4" style={{ touchAction: zoom > 1 || fitMode === 'manual' ? 'pan-x pan-y' : 'pan-y' }}>
        {status === 'loading' && <div className="flex h-[60vh] items-center justify-center text-sm text-ink/50">Loading book…</div>}
        {status === 'error' && <div className="flex h-[60vh] flex-col items-center justify-center gap-3 text-center"><p className="text-sm text-ink/70">{errorMessage}</p><button type="button" onClick={() => setReloadKey((value) => value + 1)} className="btn-secondary">Try again</button></div>}
        {status === 'ready' && Array.from({ length: numPages }, (_, index) => index + 1).map((page) => <div key={page} ref={(node) => { pageHosts.current[page] = node; }} data-page={page} className="relative mx-auto mb-4 flex w-fit min-w-[min(100%,595px)] justify-center bg-white shadow-sm" style={{ minHeight: `${Math.max(300, pageSize.height / pageSize.width * Math.min(containerRef.current?.clientWidth ?? 595, pageSize.width) + PAGE_MARGIN)}px` }}><div className="relative"><canvas ref={(node) => { canvases.current[page] = node; }} className={renderedPages.has(page) ? 'block' : 'hidden'} aria-label={`${title} — page ${page}`} /><div ref={(node) => { textLayers.current[page] = node; }} className="pointer-events-none absolute left-0 top-0 select-text" aria-hidden="true" />{!renderedPages.has(page) && <button type="button" onClick={() => jumpToPage(page)} className="flex min-h-[300px] min-w-[280px] items-center justify-center text-xs font-semibold text-ink/35">Load page {page}</button>}{renderingPages.has(page) && <span className="absolute left-1/2 top-4 h-5 w-5 -translate-x-1/2 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />}</div></div>)}
      </div>
    </div>
    {downloadError && <p className="px-3 py-2 text-xs text-red-600">Couldn&apos;t download the file. Please try again.</p>}
    <div className="flex items-center justify-between gap-2 border-t border-line bg-white px-3 py-2.5"><button type="button" onClick={() => jumpToPage(1)} disabled={pageNum <= 1} className="btn-secondary px-3 py-1.5 text-xs"><Icon name="back" size={14} /> <span className="ml-1">First</span></button><div className="flex items-center gap-1.5 text-xs text-ink/60"><span>Go to</span><input type="number" min={1} max={numPages} value={pageInput} onChange={(e) => setPageInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { const page = Math.min(numPages, Math.max(1, Number(pageInput))); jumpToPage(page); setPageInput(String(page)); } }} className="w-14 rounded-lg border border-line px-2 py-1.5 text-center" aria-label="Go to page"/><span>/ {numPages}</span></div><button type="button" onClick={() => jumpToPage(numPages)} disabled={pageNum >= numPages} className="btn-secondary px-3 py-1.5 text-xs"><span className="mr-1">Last</span><Icon name="next" size={14} /></button></div>
  </div>;
}

function Thumbnail({ doc, page }: { doc: any; page: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => { let cancelled = false; if (!doc || !canvasRef.current) return; void doc.getPage(page).then((pdfPage: any) => { if (cancelled) return; const viewport = pdfPage.getViewport({ scale: 0.16 }); const canvas = canvasRef.current!; canvas.width = viewport.width; canvas.height = viewport.height; canvas.style.width = `${viewport.width}px`; canvas.style.height = `${viewport.height}px`; void pdfPage.render({ canvasContext: canvas.getContext('2d')!, viewport }).promise; }); return () => { cancelled = true; }; }, [doc, page]);
  return <canvas ref={canvasRef} className="mx-auto max-h-24 max-w-full" aria-hidden="true" />;
}
