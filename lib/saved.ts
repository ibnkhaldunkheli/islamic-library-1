const keyFor = (itemType: 'book' | 'audio') => `maktaba:saved:${itemType}`;

export function getSavedIds(itemType: 'book' | 'audio'): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(keyFor(itemType));
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function toggleSaved(itemType: 'book' | 'audio', id: string): boolean {
  const current = getSavedIds(itemType);
  const exists = current.includes(id);
  const next = exists ? current.filter((x) => x !== id) : [...current, id];
  window.localStorage.setItem(keyFor(itemType), JSON.stringify(next));
  return !exists;
}
