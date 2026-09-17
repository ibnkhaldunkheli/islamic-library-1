'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { AudioLecture, Category, Scholar, Language, PermissionStatus } from '@/lib/types';
import { PERMISSION_STATUS_LABELS } from '@/lib/types';
import { getStorageProvider } from '@/lib/storage';

const emptyForm = {
  title: '',
  description: '',
  language: 'english' as Language,
  category_id: '',
  scholar_id: '',
  permission_status: 'unknown' as PermissionStatus,
  permission_note: '',
  copyright_note: '',
  source_note: '',
  downloadable: true,
  series_name: '',
  part_number: '',
  featured: false,
};

export default function AdminAudioPage() {
  const supabase = createClient();
  const [lectures, setLectures] = useState<AudioLecture[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [scholars, setScholars] = useState<Scholar[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [{ data: a }, { data: c }, { data: s }] = await Promise.all([
      supabase
        .from('audio_lectures')
        .select('*, scholars(*), categories(*)')
        .order('created_at', { ascending: false }),
      supabase.from('categories').select('*').order('name'),
      supabase.from('scholars').select('*').order('name'),
    ]);
    setLectures((a ?? []) as AudioLecture[]);
    setCategories((c ?? []) as Category[]);
    setScholars((s ?? []) as Scholar[]);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setAudioFile(null);
    setEditingId(null);
  };

  const storageProvider = getStorageProvider();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (!editingId && !audioFile) {
        throw new Error('Please choose an audio file.');
      }

      // Goes through the storage-provider abstraction (lib/storage) rather
      // than calling supabase.storage directly — see lib/storage/README.md.
      const audio = audioFile ? await storageProvider.upload('audio-file', audioFile) : undefined;

      const payload: Partial<AudioLecture> = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        language: form.language,
        category_id: form.category_id || null,
        scholar_id: form.scholar_id || null,
        permission_status: form.permission_status,
        permission_note: form.permission_note.trim() || null,
        copyright_note: form.copyright_note.trim() || null,
        source_note: form.source_note.trim() || null,
        downloadable: form.downloadable,
        series_name: form.series_name.trim() || null,
        part_number: form.part_number.trim() ? Number(form.part_number) : null,
        featured: form.featured,
      };
      if (audio) {
        payload.audio_url = audio.url;
        payload.storage_provider = audio.provider;
        payload.storage_bucket = audio.bucket;
        payload.storage_path = audio.path;
        payload.file_size = audio.size;
        payload.mime_type = audio.mimeType;
      }

      const result = editingId
        ? await supabase.from('audio_lectures').update(payload).eq('id', editingId)
        : await supabase.from('audio_lectures').insert(payload);

      if (result.error) throw result.error;

      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (a: AudioLecture) => {
    setEditingId(a.id);
    setForm({
      title: a.title,
      description: a.description ?? '',
      language: a.language,
      category_id: a.category_id ?? '',
      scholar_id: a.scholar_id ?? '',
      permission_status: a.permission_status ?? 'unknown',
      permission_note: a.permission_note ?? '',
      copyright_note: a.copyright_note ?? '',
      source_note: a.source_note ?? '',
      downloadable: a.downloadable ?? true,
      series_name: a.series_name ?? '',
      part_number: a.part_number != null ? String(a.part_number) : '',
      featured: a.featured ?? false,
    });
    setAudioFile(null);
  };

  const handleDelete = async (a: AudioLecture) => {
    if (!confirm('Delete this lecture? This cannot be undone.')) return;
    const { error: delError } = await supabase.from('audio_lectures').delete().eq('id', a.id);
    if (delError) {
      setError(delError.message);
      return;
    }
    // Best-effort storage cleanup — same reasoning as the books admin
    // page: the DB row (what matters for RLS/visibility) is already
    // gone, so a storage-side failure here is logged, never blocking.
    if (a.storage_bucket && a.storage_path && a.storage_provider) {
      storageProvider
        .remove({ provider: a.storage_provider, bucket: a.storage_bucket, path: a.storage_path })
        .catch((err) => console.error('Could not remove stored audio file:', err));
    }
    await load();
  };

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-[380px_1fr]">
      <form onSubmit={handleSubmit} className="card flex h-fit flex-col gap-4 p-5">
        <h2 className="font-semibold text-ink">{editingId ? 'Edit lecture' : 'Add lecture'}</h2>

        <div>
          <label className="label">Title</label>
          <input
            className="input"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
        </div>

        <div>
          <label className="label">Description</label>
          <textarea
            className="input min-h-[80px]"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Language</label>
            <select
              className="input"
              value={form.language}
              onChange={(e) => setForm({ ...form, language: e.target.value as Language })}
            >
              <option value="pashto">Pashto</option>
              <option value="urdu">Urdu</option>
              <option value="english">English</option>
              <option value="arabic">Arabic</option>
            </select>
          </div>
          <div>
            <label className="label">Category</label>
            <select
              className="input"
              value={form.category_id}
              onChange={(e) => setForm({ ...form, category_id: e.target.value })}
            >
              <option value="">None</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="label">Shaykh / Ulama</label>
          <select
            className="input"
            value={form.scholar_id}
            onChange={(e) => setForm({ ...form, scholar_id: e.target.value })}
          >
            <option value="">None</option>
            {scholars.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-card border border-line p-3.5">
          <p className="label mb-2">Permission &amp; trust</p>
          <p className="mb-2 text-xs text-ink/50">
            Only publish content you have the right to share. This is shown to visitors on
            the lecture page, so it should be accurate.
          </p>
          <select
            className="input"
            value={form.permission_status}
            onChange={(e) => setForm({ ...form, permission_status: e.target.value as PermissionStatus })}
          >
            {Object.entries(PERMISSION_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <textarea
            className="input mt-2 min-h-[50px]"
            placeholder="Permission note (optional, shown to visitors)"
            value={form.permission_note}
            onChange={(e) => setForm({ ...form, permission_note: e.target.value })}
          />
          <textarea
            className="input mt-2 min-h-[50px]"
            placeholder="Copyright note (optional, shown to visitors)"
            value={form.copyright_note}
            onChange={(e) => setForm({ ...form, copyright_note: e.target.value })}
          />
          <input
            className="input mt-2"
            placeholder="Source (optional, shown to visitors)"
            value={form.source_note}
            onChange={(e) => setForm({ ...form, source_note: e.target.value })}
          />
          <label className="mt-2 flex items-center gap-2 text-sm text-ink/70">
            <input
              type="checkbox"
              checked={form.downloadable}
              onChange={(e) => setForm({ ...form, downloadable: e.target.checked })}
            />
            Allow download
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm text-ink/70">
          <input
            type="checkbox"
            checked={form.featured}
            onChange={(e) => setForm({ ...form, featured: e.target.checked })}
          />
          Feature on homepage
        </label>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Series name (optional)</label>
            <input
              className="input"
              value={form.series_name}
              onChange={(e) => setForm({ ...form, series_name: e.target.value })}
              placeholder="e.g. Tafsir Surah Al-Baqarah"
              dir="auto"
            />
          </div>
          <div>
            <label className="label">Part number</label>
            <input
              type="number"
              min={1}
              className="input"
              value={form.part_number}
              onChange={(e) => setForm({ ...form, part_number: e.target.value })}
            />
          </div>
        </div>
        <p className="-mt-2 text-xs text-ink/40">
          Lectures that share the same series name will show &quot;Part X&quot; and
          next/previous navigation on the lecture page, ordered by part number.
        </p>

        <div>
          <label className="label">Audio file {editingId && '(leave empty to keep current file)'}</label>
          <input
            type="file"
            accept="audio/*"
            onChange={(e) => setAudioFile(e.target.files?.[0] ?? null)}
            className="text-sm"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2">
          <button type="submit" disabled={saving} className="btn-primary flex-1">
            {saving ? 'Saving…' : editingId ? 'Save changes' : 'Add lecture'}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm} className="btn-secondary">
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="card divide-y divide-line">
        {lectures.length === 0 && <p className="p-5 text-sm text-ink/60">No lectures yet.</p>}
        {lectures.map((a) => (
          <div key={a.id} className="flex items-center justify-between gap-3 p-4">
            <div>
              <p className="text-sm font-medium text-ink">
                {a.title}
                {a.featured && (
                  <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                    Featured
                  </span>
                )}
              </p>
              <p className="text-xs text-ink/50">
                {a.scholars?.name ?? '—'} · {a.language}
                {a.categories?.name ? ` · ${a.categories.name}` : ''}
                {a.series_name ? ` · ${a.series_name}${a.part_number ? ` #${a.part_number}` : ''}` : ''}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button onClick={() => handleEdit(a)} className="btn-secondary">
                Edit
              </button>
              <button onClick={() => handleDelete(a)} className="btn-danger">
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
