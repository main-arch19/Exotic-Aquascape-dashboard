import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

// Auth gate is active: unauthenticated visitors are redirected to /login and
// sessions are refreshed on each request. Set AUTH_PAUSED = true to temporarily
// make the whole app reachable without signing in.
const AUTH_PAUSED = false;

// Next.js 16 renamed the `middleware` file convention to `proxy`. The exported
// function must be named `proxy` (or be the default export).
export async function proxy(request: NextRequest) {
  if (AUTH_PAUSED) return NextResponse.next();
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico
     * - image assets (e.g. /logo.jpeg)
     * API routes are matched so the session cookie refreshes on API calls too.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
