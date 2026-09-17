'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Scholar, Language } from '@/lib/types';
import { LANGUAGE_LABELS } from '@/lib/types';
import { getStorageProvider } from '@/lib/storage';

const ALL_LANGUAGES: Language[] = ['pashto', 'urdu', 'english', 'arabic'];

export default function AdminUlamaPage() {
  const supabase = createClient();
  const [scholars, setScholars] = useState<Scholar[]>([]);
  const [name, setName] = useState('');
  const [arabicName, setArabicName] = useState('');
  const [aliases, setAliases] = useState('');
  const [languages, setLanguages] = useState<Language[]>([]);
  const [bio, setBio] = useState('');
  const [featured, setFeatured] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await supabase.from('scholars').select('*').order('name');
    setScholars((data ?? []) as Scholar[]);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => {
    setName('');
    setArabicName('');
    setAliases('');
    setLanguages([]);
    setBio('');
    setFeatured(false);
    setPhoto(null);
    setEditingId(null);
  };

  const toggleLanguage = (lang: Language) => {
    setLanguages((prev) => (prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]));
  };

  const storageProvider = getStorageProvider();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      // Goes through the storage-provider abstraction (lib/storage) —
      // see lib/storage/README.md. Scholar photos don't have their own
      // storage-metadata columns (unlike books/audio) since they're a
      // small secondary asset, not something worth tracking for future
      // migration/mirroring; only the public URL is kept, as before.
      const photoResult = photo ? await storageProvider.upload('scholar-photo', photo) : undefined;
      const photo_url = photoResult?.url;

      const payload: Partial<Scholar> = {
        name: name.trim(),
        bio: bio.trim() || null,
        arabic_name: arabicName.trim() || null,
        aliases: aliases
          .split(',')
          .map((a) => a.trim())
          .filter(Boolean),
        languages,
        featured,
      };
      if (photo_url) payload.photo_url = photo_url;

      const result = editingId
        ? await supabase.from('scholars').update(payload).eq('id', editingId)
        : await supabase.from('scholars').insert(payload);

      if (result.error) throw result.error;

      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (s: Scholar) => {
    setEditingId(s.id);
    setName(s.name);
    setArabicName(s.arabic_name ?? '');
    setAliases((s.aliases ?? []).join(', '));
    setLanguages(s.languages ?? []);
    setBio(s.bio ?? '');
    setFeatured(s.featured ?? false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this scholar profile?')) return;
    const { error: delError } = await supabase.from('scholars').delete().eq('id', id);
    if (delError) setError(delError.message);
    else await load();
  };

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-[360px_1fr]">
      <form onSubmit={handleSubmit} className="card flex h-fit flex-col gap-4 p-5">
        <h2 className="font-semibold text-ink">{editingId ? 'Edit scholar' : 'Add scholar'}</h2>

        <div>
          <label className="label">Name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>

        <div>
          <label className="label">Arabic name (optional)</label>
          <input
            className="input"
            value={arabicName}
            onChange={(e) => setArabicName(e.target.value)}
            dir="auto"
          />
        </div>

        <div>
          <label className="label">Other names / spellings (optional)</label>
          <input
            className="input"
            value={aliases}
            onChange={(e) => setAliases(e.target.value)}
            placeholder="Comma-separated, e.g. Ibn Baz, Bin Baz"
            dir="auto"
          />
          <p className="mt-1 text-xs text-ink/40">
            Helps search find this scholar under alternate spellings or transliterations.
          </p>
        </div>

        <div>
          <label className="label">Languages taught/written in</label>
          <div className="flex flex-wrap gap-3">
            {ALL_LANGUAGES.map((lang) => (
              <label key={lang} className="flex items-center gap-1.5 text-sm text-ink/70">
                <input
                  type="checkbox"
                  checked={languages.includes(lang)}
                  onChange={() => toggleLanguage(lang)}
                />
                {LANGUAGE_LABELS[lang]}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Bio (optional)</label>
          <textarea className="input min-h-[90px]" value={bio} onChange={(e) => setBio(e.target.value)} />
        </div>

        <div>
          <label className="label">Photo (optional)</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
            className="text-sm"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-ink/70">
          <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} />
          Feature this scholar
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2">
          <button type="submit" disabled={saving} className="btn-primary flex-1">
            {saving ? 'Saving…' : editingId ? 'Save changes' : 'Add scholar'}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm} className="btn-secondary">
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="card divide-y divide-line">
        {scholars.length === 0 && <p className="p-5 text-sm text-ink/60">No scholars yet.</p>}
        {scholars.map((s) => (
          <div key={s.id} className="flex items-center justify-between gap-3 p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 overflow-hidden rounded-full bg-emerald-50">
                {s.photo_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.photo_url} alt="" className="h-full w-full object-cover" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-ink">
                  {s.name}
                  {s.featured && (
                    <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                      Featured
                    </span>
                  )}
                </p>
                {(s.aliases?.length || s.languages?.length) ? (
                  <p className="text-xs text-ink/40">
                    {s.aliases?.length ? s.aliases.join(', ') : ''}
                    {s.aliases?.length && s.languages?.length ? ' · ' : ''}
                    {s.languages?.map((l) => LANGUAGE_LABELS[l]).join(', ') ?? ''}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleEdit(s)} className="btn-secondary">
                Edit
              </button>
              <button onClick={() => handleDelete(s.id)} className="btn-danger">
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
