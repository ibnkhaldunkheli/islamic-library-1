'use client';

import { useEffect, useRef, useState } from 'react';
import {
  isDownloaded,
  downloadForOffline,
  removeOfflineDownload,
  type OfflineItemType,
  type DownloadProgress,
} from '@/lib/offlineStore';

type State = 'checking' | 'idle' | 'downloading' | 'downloaded' | 'error';

export default function DownloadButton({
  itemType,
  itemId,
  title,
  url,
}: {
  itemType: OfflineItemType;
  itemId: string;
  title: string;
  url: string;
}) {
  const [state, setState] = useState<State>('checking');
  const [progress, setProgress] = useState<DownloadProgress>({ loaded: 0, total: null });
  const [errorMsg, setErrorMsg] = useState('');
  const [confirm, setConfirm] = useState<'download' | 'remove' | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let cancelled = false;
    isDownloaded(itemType, itemId).then((yes) => {
      if (!cancelled) setState(yes ? 'downloaded' : 'idle');
    });
    return () => {
      cancelled = true;
    };
  }, [itemType, itemId]);

  const start = async () => {
    // Duplicate-download guard: idle→downloading is the only path in, so
    // a second tap while already downloading/downloaded can't start a
    // second concurrent fetch for the same item.
    if (state !== 'idle' && state !== 'error') return;
    setConfirm(null);
    setState('downloading');
    setErrorMsg('');
    setProgress({ loaded: 0, total: null });
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      await downloadForOffline(itemType, itemId, title, url, setProgress, controller.signal);
      setState('downloaded');
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setState('idle');
      } else {
        setErrorMsg(err instanceof Error ? err.message : 'Download failed.');
        setState('error');
      }
    } finally {
      abortRef.current = null;
    }
  };

  const cancel = () => abortRef.current?.abort();

  const remove = async () => {
    await removeOfflineDownload(itemType, itemId);
    setConfirm(null);
    setState('idle');
  };

  if (state === 'checking') return null;

  if (state === 'downloaded') {
    return (
      <div className="flex items-center gap-2.5 text-xs">
        <span className="flex items-center gap-1 text-emerald-700">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M20 6 9 17l-5-5" />
          </svg>
          Available offline
        </span>
        <button type="button" onClick={() => setConfirm('remove')} className="text-ink/40 hover:text-red-600 hover:underline">
          Remove download
        </button>
      </div>
    );
  }

  if (state === 'downloading') {
    const pct = progress.total ? Math.round((progress.loaded / progress.total) * 100) : null;
    return (
      <div className="flex items-center gap-2.5 text-xs">
        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-line">
          <div
            className="h-full bg-emerald-600 transition-all"
            style={{ width: pct != null ? `${pct}%` : '35%' }}
          />
        </div>
        <span className="text-ink/50">{pct != null ? `${pct}%` : 'Downloading…'}</span>
        <button type="button" onClick={cancel} className="text-ink/40 hover:underline">
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => setConfirm('download')}
        className="flex w-fit items-center gap-1 text-xs font-bold text-blue-700 transition hover:underline"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 3v12m0 0-4-4m4 4 4-4M5 21h14" />
        </svg>
        Download for offline
      </button>
      {state === 'error' && <p className="text-xs text-red-600">{errorMsg}</p>}
      {confirm && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-navy/40 p-4" role="presentation"><div role="dialog" aria-modal="true" className="w-full max-w-sm rounded-2xl border border-line bg-white p-6 shadow-2xl"><h2 className="text-lg font-extrabold text-navy">{confirm === 'download' ? 'Save for offline?' : 'Remove download?'}</h2><p className="mt-2 text-sm leading-6 text-ink/65">{confirm === 'download' ? 'Download this item for reading or listening without a connection.' : 'Remove the offline copy from this device?'}</p><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setConfirm(null)} className="btn-secondary">Cancel</button><button type="button" onClick={() => { if (confirm === 'download') void start(); else void remove(); }} className={confirm === 'remove' ? 'btn-danger' : 'btn-primary'}>{confirm === 'download' ? 'Continue' : 'Remove'}</button></div></div></div>}
    </div>
  );
}
