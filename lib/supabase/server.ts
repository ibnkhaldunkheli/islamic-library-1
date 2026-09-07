import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Creates a Supabase client bound to the current request's cookies.
// IMPORTANT: this only ever uses the public anon key. The anon key is safe
// to ship to the browser because every table and storage bucket is locked
// down with Row Level Security (see supabase/schema.sql) — the anon key
// alone can never bypass those rules, only an authenticated admin session can.
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Called from a Server Component with no writable cookie store;
            // safe to ignore because middleware refreshes the session too.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch {
            // See note above.
          }
        },
      },
    }
  );
}

// Checks whether the currently logged-in user is a registered admin,
// by querying the server-enforced app_admins table (RLS-protected).
export async function getIsAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { user: null, isAdmin: false };

  const { data } = await supabase
    .from('app_admins')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();

  return { user, isAdmin: !!data };
}
