'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Category, Language } from '@/lib/types';

export default function AdminCategoriesPage() {
  const supabase = createClient();
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState('');
  const [language, setLanguage] = useState<Language>('english');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await supabase.from('categories').select('*').order('name');
    setCategories((data ?? []) as Category[]);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => {
    setName('');
    setLanguage('english');
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = { name: name.trim(), language };
    const result = editingId
      ? await supabase.from('categories').update(payload).eq('id', editingId)
      : await supabase.from('categories').insert(payload);

    if (result.error) {
      setError(result.error.message);
    } else {
      resetForm();
      await load();
    }
    setSaving(false);
  };

  const handleEdit = (c: Category) => {
    setEditingId(c.id);
    setName(c.name);
    setLanguage(c.language);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this category? Books/lectures using it will keep their other details.')) return;
    const { error: delError } = await supabase.from('categories').delete().eq('id', id);
    if (delError) setError(delError.message);
    else await load();
  };

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-[320px_1fr]">
      <form onSubmit={handleSubmit} className="card flex h-fit flex-col gap-4 p-5">
        <h2 className="font-semibold text-ink">{editingId ? 'Edit category' : 'Add category'}</h2>

        <div>
          <label className="label">Name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>

        <div>
          <label className="label">Language</label>
          <select
            className="input"
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
          >
            <option value="pashto">Pashto</option>
            <option value="urdu">Urdu</option>
            <option value="english">English</option>
            <option value="arabic">Arabic</option>
          </select>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2">
          <button type="submit" disabled={saving} className="btn-primary flex-1">
            {saving ? 'Saving…' : editingId ? 'Save changes' : 'Add category'}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm} className="btn-secondary">
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="card divide-y divide-line">
        {categories.length === 0 && <p className="p-5 text-sm text-ink/60">No categories yet.</p>}
        {categories.map((c) => (
          <div key={c.id} className="flex items-center justify-between gap-3 p-4">
            <div>
              <p className="text-sm font-medium text-ink">{c.name}</p>
              <p className="text-xs capitalize text-ink/50">{c.language}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleEdit(c)} className="btn-secondary">
                Edit
              </button>
              <button onClick={() => handleDelete(c.id)} className="btn-danger">
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
