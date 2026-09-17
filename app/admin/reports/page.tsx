'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { Report } from '@/lib/types';
import { REPORT_REASON_LABELS } from '@/lib/types';
import EmptyState from '@/components/EmptyState';

export default function AdminReportsPage() {
  const supabase = createClient();
  const [reports, setReports] = useState<Report[]>([]);
  const [filter, setFilter] = useState<'open' | 'resolved' | 'all'>('open');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    let query = supabase.from('reports').select('*').order('created_at', { ascending: false });
    if (filter !== 'all') query = query.eq('status', filter);
    const { data } = await query;
    setReports((data ?? []) as Report[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const setStatus = async (id: string, status: 'open' | 'resolved') => {
    await supabase.from('reports').update({ status }).eq('id', id);
    await load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this report?')) return;
    await supabase.from('reports').delete().eq('id', id);
    await load();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-ink">Reports</h1>
        <div className="flex gap-2">
          {(['open', 'resolved', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-card border px-3 py-1.5 text-xs font-medium ${
                filter === f ? 'border-emerald-600 bg-emerald-50 text-emerald-700' : 'border-line text-ink/60'
              }`}
            >
              {f[0].toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {!loading && reports.length === 0 && (
        <EmptyState title="No reports" hint="Problems visitors flag on books or lectures will show up here." />
      )}

      <div className="card divide-y divide-line">
        {reports.map((r) => (
          <div key={r.id} className="flex flex-col gap-2 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-paper px-2 py-0.5 text-[11px] font-medium text-ink/60 ring-1 ring-line">
                  {r.item_type}
                </span>
                <span className="text-sm font-medium text-ink">{REPORT_REASON_LABELS[r.reason]}</span>
                {r.status === 'open' ? (
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                    Open
                  </span>
                ) : (
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                    Resolved
                  </span>
                )}
              </div>
              <Link
                href={`/${r.item_type === 'book' ? 'books' : 'audio'}/${r.item_id}`}
                className="text-xs text-emerald-700 hover:underline"
                target="_blank"
              >
                View item →
              </Link>
            </div>
            {r.message && <p className="text-sm text-ink/70">{r.message}</p>}
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-ink/40">{new Date(r.created_at).toLocaleString()}</span>
              <div className="flex gap-2">
                {r.status === 'open' ? (
                  <button onClick={() => setStatus(r.id, 'resolved')} className="btn-secondary text-xs">
                    Mark resolved
                  </button>
                ) : (
                  <button onClick={() => setStatus(r.id, 'open')} className="btn-secondary text-xs">
                    Reopen
                  </button>
                )}
                <button onClick={() => remove(r.id)} className="btn-danger text-xs">
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
