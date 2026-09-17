'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  listOfflineDownloads,
  removeOfflineDownload,
  getStorageEstimate,
  type OfflineDownload,
} from '@/lib/offlineStore';
import EmptyState from '@/components/EmptyState';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DownloadsPage() {
  const [items, setItems] = useState<OfflineDownload[]>([]);
  const [estimate, setEstimate] = useState<{ usage: number; quota: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [downloads, storage] = await Promise.all([listOfflineDownloads(), getStorageEstimate()]);
    setItems(downloads);
    setEstimate(storage);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const remove = async (item: OfflineDownload) => {
    await removeOfflineDownload(item.itemType, item.itemId);
    await load();
  };

  const totalSize = items.reduce((sum, i) => sum + i.size, 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Downloads</h1>
        <p className="mt-1 text-sm text-ink/60">
          Books and lectures saved on this device for offline reading and listening. Downloads are
          kept on this device only — they&apos;re not tied to an account and won&apos;t follow you to
          another device.
        </p>
      </div>

      {estimate && estimate.quota > 0 && (
        <div className="card p-4">
          <div className="mb-1.5 flex items-center justify-between text-xs text-ink/50">
            <span>
              {formatBytes(totalSize)} downloaded · {formatBytes(estimate.usage)} of{' '}
              {formatBytes(estimate.quota)} device storage used by this site
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-line">
            <div
              className="h-full bg-emerald-600"
              style={{ width: `${Math.min(100, (estimate.usage / estimate.quota) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {!loading && items.length === 0 && (
        <EmptyState
          title="Nothing downloaded yet."
          hint="Look for “Download for offline” on a book or lecture page to read or listen without an internet connection."
        />
      )}

      <div className="card divide-y divide-line">
        {items.map((item) => (
          <div key={item.key} className="flex items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <Link
                href={`/${item.itemType === 'book' ? 'books' : 'audio'}/${item.itemId}`}
                className="truncate text-sm font-medium text-ink hover:text-emerald-700"
                dir="auto"
              >
                {item.title}
              </Link>
              <p className="text-xs text-ink/40">
                {item.itemType === 'book' ? 'Book' : 'Audio'} · {formatBytes(item.size)} ·{' '}
                {new Date(item.downloadedAt).toLocaleDateString()}
              </p>
            </div>
            <button onClick={() => remove(item)} className="btn-secondary shrink-0 text-xs">
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
