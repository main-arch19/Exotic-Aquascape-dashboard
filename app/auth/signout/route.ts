import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Signs the current user out and redirects to /login. Wired to a native
// <form method="post" action="/auth/signout"> so the browser follows the 303.
export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL('/login', request.url), { status: 303 });
}
