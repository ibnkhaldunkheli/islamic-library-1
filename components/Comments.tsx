'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCurrentUser } from '@/lib/useCurrentUser';
import type { Comment } from '@/lib/types';

const PAGE_SIZE = 20;

type Props = { itemType: 'book' | 'audio'; itemId: string };

export default function Comments({ itemType, itemId }: Props) {
  const { user } = useCurrentUser();
  const [comments, setComments] = useState<Comment[]>([]);
  const [content, setContent] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [reporting, setReporting] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const commentCountRef = useRef(0);

  const load = useCallback(async (append = false) => {
    const from = append ? commentCountRef.current : 0;
    const { data, error } = await createClient().from('comments').select('*').eq('item_type', itemType).eq('item_id', itemId).eq('status', 'visible').is('parent_id', null).order('created_at', { ascending: false }).range(from, from + PAGE_SIZE - 1);
    if (error) { setMessage('Unable to load comments right now.'); return; }
    const roots = (data ?? []) as Comment[];
    setComments((current) => append ? [...current, ...roots] : roots);
    commentCountRef.current = append ? commentCountRef.current + roots.length : roots.length;
    setHasMore(roots.length === PAGE_SIZE);
    setLoading(false); setLoadingMore(false);
  }, [itemId, itemType]);

  useEffect(() => { void load(); }, [load]);

  const replies = useMemo(() => comments.reduce<Record<string, Comment[]>>((groups, comment) => { groups[comment.id] = []; return groups; }, {}), [comments]);
  const [nestedReplies, setNestedReplies] = useState<Record<string, Comment[]>>({});
  useEffect(() => { if (comments.length === 0) return; createClient().from('comments').select('*').eq('item_type', itemType).eq('item_id', itemId).eq('status', 'visible').not('parent_id', 'is', null).order('created_at', { ascending: true }).then(({ data }) => { const grouped = { ...replies }; (data as Comment[] | null ?? []).forEach((reply) => { if (grouped[reply.parent_id!]) grouped[reply.parent_id!].push(reply); }); setNestedReplies(grouped); }); }, [comments, itemId, itemType, replies]);

  function setError(text: string) { setMessage(text); setSaving(false); }
  async function submitComment(e: React.FormEvent) {
    e.preventDefault(); if (!user) { setMessage('Sign in to join the discussion.'); return; } if (!content.trim()) return;
    setSaving(true); setMessage(''); const { data, error } = await createClient().from('comments').insert({ user_id: user.id, item_type: itemType, item_id: itemId, parent_id: replyTo, content: content.trim() }).select('*').single();
    if (error) setError(error.message.includes('parent') ? 'That reply target is no longer available.' : 'Unable to post this comment.'); else { if (replyTo) setNestedReplies((groups) => ({ ...groups, [replyTo]: [...(groups[replyTo] ?? []), data as Comment] })); else setComments((current) => [data as Comment, ...current]); setContent(''); setReplyTo(null); setSaving(false); }
  }
  async function saveEdit(id: string) { if (!editText.trim()) return; setSaving(true); const { data, error } = await createClient().from('comments').update({ content: editText.trim() }).eq('id', id).eq('user_id', user?.id ?? '').select('*').single(); if (error) setError('You can only edit your own comments.'); else { setComments((rows) => rows.map((row) => row.id === id ? data as Comment : row)); setNestedReplies((groups) => Object.fromEntries(Object.entries(groups).map(([key, rows]) => [key, rows.map((row) => row.id === id ? data as Comment : row)]))); setEditing(null); setSaving(false); } }
  async function deleteComment(id: string) { if (!user || !window.confirm('Delete this comment?')) return; const { error } = await createClient().from('comments').delete().eq('id', id).eq('user_id', user.id); if (error) setMessage('Unable to delete this comment.'); else { setComments((rows) => rows.filter((row) => row.id !== id)); setNestedReplies((groups) => Object.fromEntries(Object.entries(groups).map(([key, rows]) => [key, rows.filter((row) => row.id !== id)]))); } }
  async function reportComment(id: string) { if (!user) { setMessage('Sign in to report a comment.'); return; } if (!reportReason.trim()) return; const { error } = await createClient().from('comment_reports').insert({ comment_id: id, reporter_id: user.id, reason: reportReason.trim() }); setMessage(error ? (error.code === '23505' ? 'You already reported this comment.' : 'Unable to submit the report.') : 'Report submitted for review.'); setReporting(null); setReportReason(''); }

  function actions(comment: Comment) { const own = user?.id === comment.user_id; return <div className="mt-2 flex flex-wrap items-center gap-3 text-xs font-semibold text-ink/45"><button type="button" onClick={() => setReplyTo(comment.id)} className="hover:text-blue-700">Reply</button>{own && <><button type="button" onClick={() => { setEditing(comment.id); setEditText(comment.content); }} className="hover:text-blue-700">Edit</button><button type="button" onClick={() => void deleteComment(comment.id)} className="hover:text-red-700">Delete</button></>}{!own && <button type="button" onClick={() => setReporting(comment.id)} className="hover:text-blue-700">Report</button>}</div>; }
  function renderComment(comment: Comment, nested = false) { return <article key={comment.id} className={`${nested ? 'ml-5 border-l-2 border-blue-100 pl-4 sm:ml-8' : 'border-t border-line pt-4'}`}><div className="flex items-center justify-between gap-3"><span className="text-xs font-bold text-navy">Library member</span><time className="text-xs text-ink/45" dateTime={comment.created_at}>{new Date(comment.created_at).toLocaleDateString()}</time></div>{editing === comment.id ? <div className="mt-2 flex gap-2"><textarea value={editText} onChange={(e) => setEditText(e.target.value)} className="input min-h-20"/><button type="button" disabled={saving} onClick={() => void saveEdit(comment.id)} className="btn-primary self-start px-3 text-xs">Save</button></div> : <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink/75">{comment.content}</p>}{actions(comment)}{reporting === comment.id && <div className="mt-3 flex flex-wrap gap-2"><input value={reportReason} onChange={(e) => setReportReason(e.target.value)} placeholder="Why are you reporting this?" className="input max-w-sm py-2 text-xs"/><button type="button" onClick={() => void reportComment(comment.id)} className="btn-secondary px-3 py-2 text-xs">Submit report</button></div>}{replyTo === comment.id && <form onSubmit={submitComment} className="mt-3 flex gap-2"><input autoFocus value={content} onChange={(e) => setContent(e.target.value)} placeholder="Write a reply…" className="input py-2 text-xs"/><button disabled={saving || !content.trim()} className="btn-primary px-3 py-2 text-xs">Reply</button></form>}{(nestedReplies[comment.id] ?? []).map((reply) => renderComment(reply, true))}</article>; }

  return <section className="card p-5 sm:p-6"><div className="mb-5"><p className="text-xs font-bold uppercase tracking-[.16em] text-blue-600">Community notes</p><h2 className="mt-1 text-xl font-extrabold text-navy">Discussion</h2></div><form onSubmit={submitComment} className="space-y-3"><label htmlFor={`comment-${itemId}`} className="sr-only">Write a comment</label><textarea id={`comment-${itemId}`} value={replyTo ? '' : content} onChange={(e) => setContent(e.target.value)} maxLength={2000} rows={3} placeholder={user ? 'Share a thoughtful note about this work…' : 'Sign in to leave a comment'} className="input resize-y"/><div className="flex items-center justify-between gap-3"><span className="text-xs text-ink/45">{content.length}/2000 · Comments are moderated.</span><button type="submit" disabled={saving || !content.trim() || !!replyTo} className="btn-primary">{saving ? 'Posting…' : 'Post comment'}</button></div>{replyTo && <button type="button" onClick={() => { setReplyTo(null); setContent(''); }} className="text-xs font-semibold text-blue-700">Cancel reply</button>}{message && <p role="status" className="text-sm text-amber-700">{message}</p>}</form><div className="mt-6 space-y-4">{loading ? <p className="text-sm text-ink/45">Loading discussion…</p> : comments.length === 0 ? <p className="text-sm text-ink/50">Be the first to share a thoughtful note.</p> : comments.map((comment) => renderComment(comment))}</div>{hasMore && <button type="button" disabled={loadingMore} onClick={() => { setLoadingMore(true); void load(true); }} className="btn-secondary mt-5 w-full">{loadingMore ? 'Loading…' : 'Load more comments'}</button>}</section>;
}
