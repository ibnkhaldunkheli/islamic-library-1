'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { ReportReason } from '@/lib/types';
import { REPORT_REASON_LABELS } from '@/lib/types';

// Lightweight inline report form — no modal library needed. Anyone can
// submit (RLS allows anonymous inserts into `reports`, see
// supabase/migrations/006_reports_and_announcements.sql) but no one
// except the admin can ever read the list back, so this is safe to show
// to every visitor.
export default function ReportButton({
  itemType,
  itemId,
}: {
  itemType: 'book' | 'audio';
  itemId: string;
}) {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>('broken_pdf');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    const { error } = await supabase.from('reports').insert({
      item_type: itemType,
      item_id: itemId,
      reason,
      message: message.trim() || null,
    });
    setStatus(error ? 'error' : 'sent');
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-fit text-xs text-ink/40 transition-colors hover:text-emerald-700 hover:underline"
      >
        Report a problem
      </button>
    );
  }

  if (status === 'sent') {
    return <p className="text-xs text-emerald-700">Thanks — your report was sent.</p>;
  }

  return (
    <form onSubmit={submit} className="card flex max-w-sm flex-col gap-2 p-3.5">
      <select className="input" value={reason} onChange={(e) => setReason(e.target.value as ReportReason)}>
        {Object.entries(REPORT_REASON_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <textarea
        className="input min-h-[60px]"
        placeholder="Details (optional)"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      {status === 'error' && <p className="text-xs text-red-600">Couldn&apos;t send. Try again.</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={status === 'sending'} className="btn-primary flex-1 text-xs">
          {status === 'sending' ? 'Sending…' : 'Send report'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="btn-secondary text-xs">
          Cancel
        </button>
      </div>
    </form>
  );
}
