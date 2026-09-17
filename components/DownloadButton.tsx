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
        <button type="button" onClick={remove} className="text-ink/40 hover:text-red-600 hover:underline">
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
        onClick={start}
        className="flex w-fit items-center gap-1 text-xs text-emerald-700 hover:underline"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 3v12m0 0-4-4m4 4 4-4M5 21h14" />
        </svg>
        Download for offline
      </button>
      {state === 'error' && <p className="text-xs text-red-600">{errorMsg}</p>}
    </div>
  );
}
