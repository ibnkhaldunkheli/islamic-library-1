// True offline downloads: explicit, visitor-initiated storage of a book's
// PDF or a lecture's audio file for offline access — distinct from:
//   - the service worker's tiny app-shell cache (public/sw.js), which
//     never touches library content, and
//   - the browser's ordinary temporary HTTP cache, which can be evicted
//     at any time without the visitor knowing.
// Uses IndexedDB (not the Cache API) so each download is its own listed,
// sized, removable record, entirely on-device — same no-account-needed
// approach as lib/saved.ts and lib/progress.ts. Nothing here ever talks
// to Supabase directly; it downloads the same public file URL the rest
// of the app already uses.

const DB_NAME = 'maktaba-offline';
const DB_VERSION = 1;
const STORE = 'downloads';

export type OfflineItemType = 'book' | 'audio';

export type OfflineDownload = {
  key: string;
  itemType: OfflineItemType;
  itemId: string;
  title: string;
  mimeType: string;
  size: number;
  downloadedAt: number;
};

type StoredRecord = OfflineDownload & { blob: Blob };

function keyFor(itemType: OfflineItemType, itemId: string) {
  return `${itemType}:${itemId}`;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('Offline storage is not available in this browser.'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Could not open offline storage.'));
  });
}

export async function isDownloaded(itemType: OfflineItemType, itemId: string): Promise<boolean> {
  try {
    const db = await openDb();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).getKey(keyFor(itemType, itemId));
      req.onsuccess = () => resolve(req.result !== undefined);
      req.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

export async function getOfflineBlob(itemType: OfflineItemType, itemId: string): Promise<Blob | null> {
  try {
    const db = await openDb();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(keyFor(itemType, itemId));
      req.onsuccess = () => resolve((req.result as StoredRecord | undefined)?.blob ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function listOfflineDownloads(): Promise<OfflineDownload[]> {
  try {
    const db = await openDb();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => {
        const rows = (req.result as StoredRecord[] | undefined) ?? [];
        resolve(
          rows
            .map(({ blob: _blob, ...meta }) => meta)
            .sort((a, b) => b.downloadedAt - a.downloadedAt)
        );
      };
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function removeOfflineDownload(itemType: OfflineItemType, itemId: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(keyFor(itemType, itemId));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Could not remove the download.'));
  });
}

export type DownloadProgress = { loaded: number; total: number | null };

// Streams the file with progress reporting, and only writes it to
// IndexedDB once the transfer has completed in full — an interrupted,
// cancelled, or failed download never leaves a partial/corrupt entry
// behind, so a retry always starts from a clean slate.
export async function downloadForOffline(
  itemType: OfflineItemType,
  itemId: string,
  title: string,
  url: string,
  onProgress?: (p: DownloadProgress) => void,
  signal?: AbortSignal
): Promise<void> {
  const res = await fetch(url, { signal });
  if (!res.ok || !res.body) {
    throw new Error('The download failed. Check your connection and try again.');
  }

  const total = Number(res.headers.get('content-length')) || null;

  // Best-effort pre-flight storage check. Browsers don't guarantee an
  // exact usable number here, so this is a friendly early warning, not
  // the real safety net — the IndexedDB write below is what actually
  // fails (and is caught) if the device truly runs out of room.
  if (total && navigator.storage?.estimate) {
    try {
      const { quota, usage } = await navigator.storage.estimate();
      if (quota != null && usage != null && quota - usage < total) {
        throw new Error('Not enough free storage on this device for this download.');
      }
    } catch (err) {
      if (err instanceof Error && err.message.startsWith('Not enough')) throw err;
      // A failing estimate() call shouldn't block the download attempt.
    }
  }

  const reader = res.body.getReader();
  const chunks: BlobPart[] = [];
  let loaded = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.byteLength;
    onProgress?.({ loaded, total });
  }

  const mimeType = res.headers.get('content-type') || 'application/octet-stream';
  const blob = new Blob(chunks, { type: mimeType });

  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const record: StoredRecord = {
      key: keyFor(itemType, itemId),
      itemType,
      itemId,
      title,
      mimeType,
      size: blob.size,
      downloadedAt: Date.now(),
      blob,
    };
    tx.objectStore(STORE).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () =>
      reject(
        tx.error?.name === 'QuotaExceededError'
          ? new Error('Not enough free storage on this device to save this download.')
          : tx.error ?? new Error('Could not save the download.')
      );
  });
}

export async function getStorageEstimate(): Promise<{ usage: number; quota: number } | null> {
  if (!navigator.storage?.estimate) return null;
  try {
    const { usage, quota } = await navigator.storage.estimate();
    if (usage == null || quota == null) return null;
    return { usage, quota };
  } catch {
    return null;
  }
}
