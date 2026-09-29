'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function AccountLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    router.push('/account');
    router.refresh();
  };

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Sign in</h1>
        <p className="mt-1 text-sm text-ink/60">
          Sign in to sync your favorites and reading/listening progress across devices.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card flex flex-col gap-4 p-5">
        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="text-center text-sm text-ink/60">
        Don&apos;t have an account?{' '}
        <Link href="/account/signup" className="font-medium text-emerald-700 hover:underline">
          Create one
        </Link>
      </p>
      <p className="text-center text-xs text-ink/40">
        Looking for the library administrator sign-in?{' '}
        <Link href="/login" className="hover:underline">
          Owner login
        </Link>
      </p>
    </div>
  );
}
