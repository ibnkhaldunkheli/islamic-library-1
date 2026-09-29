// Tracks "Continue reading" (book page number) and "Continue listening"
// (audio playback position in seconds) locally on the visitor's device —
// same approach as lib/saved.ts, so no account/login is required and
// nothing new is sent to the server.

type ProgressType = 'book' | 'audio';

type ProgressEntry = {
  value: number; // page number for books, seconds for audio
  updated_at: number;
};

const keyFor = (itemType: ProgressType) => `maktaba:progress:${itemType}`;

function readMap(itemType: ProgressType): Record<string, ProgressEntry> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(keyFor(itemType));
    return raw ? (JSON.parse(raw) as Record<string, ProgressEntry>) : {};
  } catch {
    return {};
  }
}

function writeMap(itemType: ProgressType, map: Record<string, ProgressEntry>) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(keyFor(itemType), JSON.stringify(map));
}

export function getProgress(itemType: ProgressType, id: string): number | undefined {
  return readMap(itemType)[id]?.value;
}

export function setProgress(itemType: ProgressType, id: string, value: number) {
  if (!id || !Number.isFinite(value)) return;
  const map = readMap(itemType);
  map[id] = { value, updated_at: Date.now() };
  writeMap(itemType, map);
}

export function clearProgress(itemType: ProgressType, id: string) {
  const map = readMap(itemType);
  if (!(id in map)) return;
  delete map[id];
  writeMap(itemType, map);
}

// Most-recent-first list of item ids that have in-progress reading/listening,
// for rendering a "Continue reading/listening" section.
export function getRecentProgressIds(itemType: ProgressType, limit = 6): string[] {
  const map = readMap(itemType);
  return Object.entries(map)
    .sort((a, b) => b[1].updated_at - a[1].updated_at)
    .slice(0, limit)
    .map(([id]) => id);
}
