import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Refreshes the Supabase auth session on every matched request and, for page
 * navigations, redirects unauthenticated visitors to /login.
 *
 * Called from the Next.js `proxy.ts` file convention (the v16 rename of
 * `middleware.ts`). API routes are intentionally left to enforce their own
 * 401s so client fetches get a JSON error instead of an HTML redirect.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Do not run code between createServerClient and getUser(): getUser revalidates
  // the token and refreshes cookies. Anything in between risks logging users out.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isAuthRoute =
    pathname.startsWith('/login') || pathname.startsWith('/auth');
  const isApiRoute = pathname.startsWith('/api');

  // Page requests from signed-out visitors go to /login. API routes handle their
  // own auth (returning 401) so callers receive JSON rather than a redirect.
  if (!user && !isAuthRoute && !isApiRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
