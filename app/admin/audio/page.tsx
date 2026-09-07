'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { AudioLecture, Category, Scholar, Language } from '@/lib/types';

const emptyForm = {
  title: '',
  description: '',
  language: 'english' as Language,
  category_id: '',
  scholar_id: '',
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (!editingId && !audioFile) {
        throw new Error('Please choose an audio file.');
      }

      let audio_url: string | undefined;
      if (audioFile) {
        const path = `${crypto.randomUUID()}-${audioFile.name}`;
        const { error: uploadError } = await supabase.storage.from('audio-files').upload(path, audioFile);
        if (uploadError) throw uploadError;
        const { data: pub } = supabase.storage.from('audio-files').getPublicUrl(path);
        audio_url = pub.publicUrl;
      }

      const payload: Partial<AudioLecture> = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        language: form.language,
        category_id: form.category_id || null,
        scholar_id: form.scholar_id || null,
      };
      if (audio_url) payload.audio_url = audio_url;

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
    });
    setAudioFile(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this lecture? This cannot be undone.')) return;
    const { error: delError } = await supabase.from('audio_lectures').delete().eq('id', id);
    if (delError) setError(delError.message);
    else await load();
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
              <p className="text-sm font-medium text-ink">{a.title}</p>
              <p className="text-xs text-ink/50">
                {a.scholars?.name ?? '—'} · {a.language}
                {a.categories?.name ? ` · ${a.categories.name}` : ''}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button onClick={() => handleEdit(a)} className="btn-secondary">
                Edit
              </button>
              <button onClick={() => handleDelete(a.id)} className="btn-danger">
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
