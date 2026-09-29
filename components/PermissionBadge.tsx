import type { PermissionStatus } from '@/lib/types';
import { PERMISSION_STATUS_LABELS } from '@/lib/types';

// Small, honest trust indicator for book/audio detail pages. Deliberately
// visible (not just an admin-only field) — the whole point of the
// permission system is that visitors can see how content was authorized,
// not just that the admin tracked it privately.
const STYLES: Record<PermissionStatus, string> = {
  authorized: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  public_domain: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  author_permission: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  publisher_permission: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  unknown: 'bg-amber-50 text-amber-700 ring-amber-200',
};

export default function PermissionBadge({
  status,
  note,
  copyrightNote,
  sourceNote,
}: {
  status?: PermissionStatus;
  note?: string | null;
  copyrightNote?: string | null;
  sourceNote?: string | null;
}) {
  const resolved: PermissionStatus = status ?? 'unknown';
  const hasDetail = note || copyrightNote || sourceNote;

  return (
    <div className="flex flex-col gap-1.5">
      <span
        className={`w-fit rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ${STYLES[resolved]}`}
      >
        {PERMISSION_STATUS_LABELS[resolved]}
      </span>
      {hasDetail && (
        <div className="max-w-xl space-y-0.5 text-xs text-ink/50">
          {note && <p dir="auto">{note}</p>}
          {copyrightNote && <p dir="auto">{copyrightNote}</p>}
          {sourceNote && <p dir="auto">Source: {sourceNote}</p>}
        </div>
      )}
    </div>
  );
}
