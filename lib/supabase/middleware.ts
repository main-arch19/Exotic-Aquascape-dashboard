import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const REQUIRED_ENV = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'] as const;

/**
 * The proxy runs on every request, so an unhandled throw here 500s the entire
 * site. When Supabase isn't configured we fail *closed* with a readable 503
 * instead: letting requests through would silently disable the auth gate while
 * the data APIs (which use the same project URL) kept working.
 */
function configError(request: NextRequest, detail: string) {
  console.error('[proxy] Supabase not configured —', detail);

  if (request.nextUrl.pathname.startsWith('/api')) {
    return NextResponse.json(
      { error: 'Server configuration error', detail },
      { status: 503 }
    );
  }

  return new NextResponse(
    `<!doctype html><meta charset="utf-8"><title>Configuration error</title>` +
      `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:34rem;margin:15vh auto;padding:0 1.5rem;line-height:1.6">` +
      `<h1 style="font-size:1.15rem;margin:0 0 .5rem">Server configuration error</h1>` +
      `<p style="color:#555;margin:0 0 1rem">This deployment can’t reach Supabase, so sign-in is unavailable.</p>` +
      `<p style="color:#555;margin:0"><strong>${detail}</strong></p>` +
      `<p style="color:#888;font-size:.875rem;margin:1rem 0 0">Set these for this environment in your hosting provider, then redeploy.</p>` +
      `</div>`,
    { status: 503, headers: { 'content-type': 'text/html; charset=utf-8' } }
  );
}

/**
 * Refreshes the Supabase auth session on every matched request and, for page
 * navigations, redirects unauthenticated visitors to /login.
 *
 * Called from the Next.js `proxy.ts` file convention (the v16 rename of
 * `middleware.ts`). API routes are intentionally left to enforce their own
 * 401s so client fetches get a JSON error instead of an HTML redirect.
 */
export async function updateSession(request: NextRequest) {
  const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    return configError(
      request,
      `Missing environment variable${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}`
    );
  }

  try {
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
  } catch (err) {
    return configError(
      request,
      err instanceof Error ? err.message : 'Supabase session check failed'
    );
  }
}
