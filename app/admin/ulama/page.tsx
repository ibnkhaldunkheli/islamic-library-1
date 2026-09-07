'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Scholar } from '@/lib/types';

export default function AdminUlamaPage() {
  const supabase = createClient();
  const [scholars, setScholars] = useState<Scholar[]>([]);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
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
    setBio('');
    setPhoto(null);
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      let photo_url: string | undefined;
      if (photo) {
        const path = `${crypto.randomUUID()}-${photo.name}`;
        const { error: uploadError } = await supabase.storage
          .from('scholar-photos')
          .upload(path, photo);
        if (uploadError) throw uploadError;
        const { data: pub } = supabase.storage.from('scholar-photos').getPublicUrl(path);
        photo_url = pub.publicUrl;
      }

      const payload: Partial<Scholar> = { name: name.trim(), bio: bio.trim() || null };
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
    setBio(s.bio ?? '');
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
              <p className="text-sm font-medium text-ink">{s.name}</p>
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
