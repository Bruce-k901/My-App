'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import GlassCard from '@/components/ui/GlassCard';
import { AuthLayout } from '@/components/layouts';
import { Eye, EyeOff } from '@/components/ui/icons';
import { Input, Button } from '@/components/ui';
import { supabase } from '@/lib/supabase';

export default function CustomerLoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      });

      if (signInError) throw signInError;

      // Wait for session cookie before navigating
      for (let i = 0; i < 10; i++) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          window.location.href = '/customer/dashboard';
          return;
        }
        await new Promise((r) => setTimeout(r, 200));
      }
      // Fallback navigate
      window.location.href = '/customer/dashboard';
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Failed to sign in');
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <GlassCard className="mx-4 sm:mx-6 md:mx-auto max-w-md w-full">
        <h1 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6 text-center text-theme-primary">
          Customer Portal
        </h1>
        <p className="text-sm text-theme-tertiary text-center mb-6">
          Log in to place orders and manage your account
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          <div>
            <label className="block text-theme-tertiary text-sm mb-2">Email</label>
            <Input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              required
              placeholder="you@example.com"
              className="w-full"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-theme-tertiary text-sm mb-2">Password</label>
            <div className="relative">
              <Input
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={handleChange}
                required
                placeholder="Password"
                className="pr-12 w-full"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-theme-tertiary hover:text-white p-1"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff size={18} className="sm:w-5 sm:h-5" />
                ) : (
                  <Eye size={18} className="sm:w-5 sm:h-5" />
                )}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            fullWidth
            loading={loading}
            disabled={loading}
            className="mt-6 min-h-[44px]"
          >
            {loading ? 'Signing in...' : 'Log in'}
          </Button>
          {error && (
            <p className="mt-3 text-xs sm:text-sm text-red-400 text-center" role="alert">
              {error}
            </p>
          )}
        </form>

        <div className="text-center mt-5 sm:mt-6">
          <Link
            href="/forgot-password"
            className="text-[#D37E91] hover:text-[#D37E91]/80 text-xs sm:text-sm transition-colors"
          >
            Forgotten your password?
          </Link>
        </div>
      </GlassCard>
    </AuthLayout>
  );
}

