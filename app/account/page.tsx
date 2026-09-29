'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useCurrentUser } from '@/lib/useCurrentUser';

export default function AccountPage() {
  const router = useRouter();
  const { user, loading } = useCurrentUser();
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push('/account/login');
  }, [loading, user, router]);

  if (loading || !user) {
    return <p className="text-sm text-ink/60">Loading…</p>;
  }

  const signOut = async () => {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Account</h1>
        <p className="mt-1 text-sm text-ink/60">{user.email}</p>
      </div>

      <div className="card flex flex-col gap-3 p-5">
        <Link href="/saved" className="btn-secondary text-center">
          Saved books &amp; lectures
        </Link>
        <button type="button" onClick={signOut} disabled={signingOut} className="btn-danger">
          {signingOut ? 'Signing out…' : 'Sign out'}
        </button>
      </div>
    </div>
  );
}
