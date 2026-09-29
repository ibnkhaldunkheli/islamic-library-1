'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Announcement } from '@/lib/types';

const emptyForm = { message: '', link: '', active: true };

export default function AdminAnnouncementsPage() {
  const supabase = createClient();
  const [items, setItems] = useState<Announcement[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
    setItems((data ?? []) as Announcement[]);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        message: form.message.trim(),
        link: form.link.trim() || null,
        active: form.active,
      };
      const result = editingId
        ? await supabase.from('announcements').update(payload).eq('id', editingId)
        : await supabase.from('announcements').insert(payload);
      if (result.error) throw result.error;
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (a: Announcement) => {
    setEditingId(a.id);
    setForm({ message: a.message, link: a.link ?? '', active: a.active });
  };

  const toggleActive = async (a: Announcement) => {
    await supabase.from('announcements').update({ active: !a.active }).eq('id', a.id);
    await load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this announcement?')) return;
    await supabase.from('announcements').delete().eq('id', id);
    await load();
  };

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-[380px_1fr]">
      <form onSubmit={handleSubmit} className="card flex h-fit flex-col gap-4 p-5">
        <h2 className="font-semibold text-ink">{editingId ? 'Edit announcement' : 'New announcement'}</h2>
        <div>
          <label className="label">Message</label>
          <textarea
            className="input min-h-[80px]"
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            dir="auto"
            required
          />
        </div>
        <div>
          <label className="label">Link (optional)</label>
          <input
            className="input"
            value={form.link}
            onChange={(e) => setForm({ ...form, link: e.target.value })}
            placeholder="/books or https://…"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-ink/70">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => setForm({ ...form, active: e.target.checked })}
          />
          Active (shown to visitors)
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button type="submit" disabled={saving} className="btn-primary flex-1">
            {saving ? 'Saving…' : editingId ? 'Save changes' : 'Create'}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm} className="btn-secondary">
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="card divide-y divide-line">
        {items.length === 0 && <p className="p-5 text-sm text-ink/60">No announcements yet.</p>}
        {items.map((a) => (
          <div key={a.id} className="flex items-center justify-between gap-3 p-4">
            <div>
              <p className="text-sm font-medium text-ink" dir="auto">
                {a.message}
              </p>
              <p className="text-xs text-ink/50">{a.active ? 'Active' : 'Inactive'}</p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button onClick={() => toggleActive(a)} className="btn-secondary">
                {a.active ? 'Deactivate' : 'Activate'}
              </button>
              <button onClick={() => handleEdit(a)} className="btn-secondary">
                Edit
              </button>
              <button onClick={() => remove(a.id)} className="btn-danger">
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
