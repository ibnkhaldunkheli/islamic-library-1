'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Book, Category, Language, Scholar } from '@/lib/types';

const emptyForm = {
  title: '',
  author: '',
  description: '',
  language: 'english' as Language,
  category_id: '',
  scholar_id: '',
  seo_title: '',
  seo_description: '',
  search_keywords: '',
};

export default function AdminBooksPage() {
  const supabase = createClient();
  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [scholars, setScholars] = useState<Scholar[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showSeo, setShowSeo] = useState(false);

  const load = async () => {
    const [{ data: b }, { data: c }, { data: s }] = await Promise.all([
      supabase
        .from('books')
        .select('*, categories(*), scholars(*)')
        .order('created_at', { ascending: false }),
      supabase.from('categories').select('*').order('name'),
      supabase.from('scholars').select('*').order('name'),
    ]);
    setBooks((b ?? []) as Book[]);
    setCategories((c ?? []) as Category[]);
    setScholars((s ?? []) as Scholar[]);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setPdfFile(null);
    setCoverFile(null);
    setEditingId(null);
    setShowSeo(false);
  };

  const uploadFile = async (bucket: string, file: File) => {
    const path = `${crypto.randomUUID()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file);
    if (uploadError) throw uploadError;
    const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
    return pub.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (!editingId && !pdfFile) {
        throw new Error('Please choose a PDF file.');
      }

      let pdf_url: string | undefined;
      let cover_url: string | undefined;
      if (pdfFile) pdf_url = await uploadFile('book-pdfs', pdfFile);
      if (coverFile) cover_url = await uploadFile('book-covers', coverFile);

      const payload: Partial<Book> = {
        title: form.title.trim(),
        author: form.author.trim() || null,
        description: form.description.trim() || null,
        language: form.language,
        category_id: form.category_id || null,
        scholar_id: form.scholar_id || null,
        seo_title: form.seo_title.trim() || null,
        seo_description: form.seo_description.trim() || null,
        search_keywords: form.search_keywords.trim() || null,
      };
      if (pdf_url) payload.pdf_url = pdf_url;
      if (cover_url) payload.cover_url = cover_url;

      const result = editingId
        ? await supabase.from('books').update(payload).eq('id', editingId)
        : await supabase.from('books').insert(payload);

      if (result.error) throw result.error;

      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (b: Book) => {
    setEditingId(b.id);
    setForm({
      title: b.title,
      author: b.author ?? '',
      description: b.description ?? '',
      language: b.language,
      category_id: b.category_id ?? '',
      scholar_id: b.scholar_id ?? '',
      seo_title: b.seo_title ?? '',
      seo_description: b.seo_description ?? '',
      search_keywords: b.search_keywords ?? '',
    });
    setPdfFile(null);
    setCoverFile(null);
    setShowSeo(Boolean(b.seo_title || b.seo_description || b.search_keywords));
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this book? This cannot be undone.')) return;
    const { error: delError } = await supabase.from('books').delete().eq('id', id);
    if (delError) setError(delError.message);
    else await load();
  };

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-[380px_1fr]">
      <form onSubmit={handleSubmit} className="card flex h-fit flex-col gap-4 p-5">
        <h2 className="font-semibold text-ink">{editingId ? 'Edit book' : 'Add book'}</h2>

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
          <label className="label">Author / Alim name</label>
          <input
            className="input"
            value={form.author}
            onChange={(e) => setForm({ ...form, author: e.target.value })}
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
          <label className="label">Link to Shaykh / Ulama profile (optional)</label>
          <select
            className="input"
            value={form.scholar_id}
            onChange={(e) => setForm({ ...form, scholar_id: e.target.value })}
          >
            <option value="">None / not listed yet</option>
            {scholars.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-ink/40">
            Linking a Shaykh automatically adds this book to their profile page under
            &quot;Books by this Shaykh&quot;. The &quot;Author / Alim name&quot; field above still
            controls the label shown on the book itself.
          </p>
        </div>

        <div className="rounded-card border border-line">
          <button
            type="button"
            onClick={() => setShowSeo((v) => !v)}
            className="flex w-full items-center justify-between px-3.5 py-2.5 text-left text-sm font-medium text-ink"
          >
            <span>SEO &amp; search (admin only)</span>
            <span className="text-ink/40">{showSeo ? '−' : '+'}</span>
          </button>
          {showSeo && (
            <div className="flex flex-col gap-3 border-t border-line p-3.5">
              <p className="text-xs text-ink/50">
                These fields are never shown to visitors. They only power page metadata
                and help the internal search find this book.
              </p>
              <div>
                <label className="label">SEO title</label>
                <input
                  className="input"
                  value={form.seo_title}
                  onChange={(e) => setForm({ ...form, seo_title: e.target.value })}
                  placeholder="Falls back to the book title"
                />
              </div>
              <div>
                <label className="label">SEO description</label>
                <textarea
                  className="input min-h-[60px]"
                  value={form.seo_description}
                  onChange={(e) => setForm({ ...form, seo_description: e.target.value })}
                  placeholder="Falls back to the book description"
                />
              </div>
              <div>
                <label className="label">Search keywords / alternative spellings</label>
                <textarea
                  className="input min-h-[60px]"
                  value={form.search_keywords}
                  onChange={(e) => setForm({ ...form, search_keywords: e.target.value })}
                  placeholder="سترہ نماز, احکام سترہ, sutrah, ahkam al sutrah"
                  dir="auto"
                />
                <p className="mt-1 text-xs text-ink/40">
                  Separate terms with commas. Mix Arabic, Urdu, Pashto or English — a
                  search for any of these terms will find this book even if the words
                  aren&apos;t in the title.
                </p>
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="label">PDF file {editingId && '(leave empty to keep current file)'}</label>
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
            className="text-sm"
          />
        </div>

        <div>
          <label className="label">Cover image (optional)</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)}
            className="text-sm"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2">
          <button type="submit" disabled={saving} className="btn-primary flex-1">
            {saving ? 'Saving…' : editingId ? 'Save changes' : 'Add book'}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm} className="btn-secondary">
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="card divide-y divide-line">
        {books.length === 0 && <p className="p-5 text-sm text-ink/60">No books yet.</p>}
        {books.map((b) => (
          <div key={b.id} className="flex items-center justify-between gap-3 p-4">
            <div>
              <p className="text-sm font-medium text-ink">{b.title}</p>
              <p className="text-xs text-ink/50">
                {b.author ?? '—'} · {b.language}
                {b.categories?.name ? ` · ${b.categories.name}` : ''}
                {b.scholars?.name ? ` · linked to ${b.scholars.name}` : ''}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button onClick={() => handleEdit(b)} className="btn-secondary">
                Edit
              </button>
              <button onClick={() => handleDelete(b.id)} className="btn-danger">
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
