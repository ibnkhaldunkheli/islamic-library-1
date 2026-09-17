'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({ email, password });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    // If email confirmation is required (the Supabase default), there's no
    // active session yet — show a "check your inbox" message instead of
    // redirecting. If confirmation is off, a session comes back immediately
    // and we can go straight to /account.
    if (data.session) {
      router.push('/account');
      router.refresh();
    } else {
      setSent(true);
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="mx-auto flex max-w-sm flex-col gap-4 text-center">
        <h1 className="text-2xl font-bold text-ink">Check your email</h1>
        <p className="text-sm text-ink/60">
          We sent a confirmation link to {email}. Follow it to finish creating your account.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Create an account</h1>
        <p className="mt-1 text-sm text-ink/60">
          Optional — lets your saved books, lectures, and reading/listening progress follow
          you across devices. Browsing the library never requires an account.
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
            minLength={6}
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="text-center text-sm text-ink/60">
        Already have an account?{' '}
        <Link href="/account/login" className="font-medium text-emerald-700 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
