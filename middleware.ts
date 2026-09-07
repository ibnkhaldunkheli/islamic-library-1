import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// This middleware does two jobs:
// 1. Keeps the Supabase auth session cookie fresh on every request.
// 2. Redirects signed-out visitors away from /admin to /login.
//
// NOTE: this is a convenience redirect, not the security boundary.
// The real enforcement lives in supabase/schema.sql (Row Level Security).
// Even if someone bypassed this middleware entirely, the database itself
// would refuse any write that doesn't come from a row in app_admins.
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!user) {
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }

    const { data: adminRow } = await supabase
      .from('app_admins')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!adminRow) {
      const homeUrl = new URL('/', request.url);
      return NextResponse.redirect(homeUrl);
    }
  }

  return response;
}

export const config = {
  matcher: ['/admin/:path*'],
};
