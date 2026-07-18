'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Loader2, LogIn, Mail, Lock, User } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type Mode = 'signin' | 'signup';

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState<Mode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setSubmitting(true);
    // Created here (not during render) so it never runs during static
    // prerendering, where NEXT_PUBLIC_* env vars may be absent at build time.
    const supabase = createClient();
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          setError(error.message);
          return;
        }
        router.push('/');
        router.refresh();
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name: name.trim() || email.split('@')[0] } },
        });
        if (error) {
          setError(error.message);
          return;
        }
        // If email confirmation is disabled, a session is returned and we can go straight in.
        if (data.session) {
          router.push('/');
          router.refresh();
        } else {
          setNotice('Account created. Check your email to confirm, then sign in.');
          setMode('signin');
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4">
      {/* Ambient background wash. Decorative: fixed so it never affects layout,
          clipped so the drifting blobs can't create scrollbars. */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="drift-slow absolute -left-[15%] -top-[10%] h-[55vmax] w-[55vmax] rounded-full bg-[var(--primary)] opacity-[0.13] blur-[90px]" />
        <div className="drift-slower absolute -bottom-[15%] -right-[20%] h-[50vmax] w-[50vmax] rounded-full bg-[var(--accent)] opacity-[0.10] blur-[100px]" />
      </div>

      {/* overflow-hidden guarantees the ripple rings can never escape the card. */}
      <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center">
          <div className="relative flex h-28 w-28 items-center justify-center">
            {[0, 1.3, 2.6].map((delay) => (
              <span
                key={delay}
                aria-hidden
                className="ripple pointer-events-none absolute inset-0 rounded-full border border-[var(--primary)]"
                style={{ animationDelay: `${delay}s` }}
              />
            ))}
            <Image
              src="/logo.jpeg"
              alt="Exotic Aquascape"
              width={640}
              height={640}
              priority
              className="logo-float relative h-28 w-28 object-contain"
            />
          </div>
          <p className="mt-5 text-xs font-medium uppercase tracking-wider text-gray-400">
            Field Operations
          </p>
        </div>

        <h1 className="mb-1 text-center text-lg font-semibold text-gray-900">
          {mode === 'signin' ? 'Sign in' : 'Create account'}
        </h1>
        <p className="mb-6 text-center text-sm text-gray-500">
          {mode === 'signin'
            ? 'Sign in to access the team dashboard.'
            : 'Create an account to join the team dashboard.'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'signup' && (
            <div className="space-y-1">
              <label className="flex items-center gap-1 text-xs font-medium text-gray-500">
                <User className="h-3 w-3" /> Display name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Smith"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-400"
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="flex items-center gap-1 text-xs font-medium text-gray-500">
              <Mail className="h-3 w-3" /> Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />
          </div>

          <div className="space-y-1">
            <label className="flex items-center gap-1 text-xs font-medium text-gray-500">
              <Lock className="h-3 w-3" /> Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}
          {notice && (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-60"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
            {submitting ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode((m) => (m === 'signin' ? 'signup' : 'signin'));
            setError(null);
            setNotice(null);
          }}
          className="mt-4 w-full text-center text-xs text-gray-500 hover:text-gray-800"
        >
          {mode === 'signin'
            ? "Don't have an account? Create one"
            : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  );
}
