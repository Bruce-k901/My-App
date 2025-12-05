"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Shield, Loader2, AlertCircle } from 'lucide-react';
import { AdminFaviconSetter } from '@/components/admin/AdminFaviconSetter';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Sign in with Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error('No user returned from login');
      }

      // Check if user is platform admin
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('is_platform_admin')
        .eq('auth_user_id', authData.user.id)
        .single();

      if (profileError) throw profileError;

      if (!profile?.is_platform_admin) {
        // Sign them out - they're not an admin
        await supabase.auth.signOut();
        throw new Error('Access denied. This login is for platform administrators only.');
      }

      // Success - redirect to admin dashboard
      router.push('/admin');
    } catch (err: any) {
      console.error('Admin login error:', err);
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AdminFaviconSetter />
      <div className="min-h-screen bg-[#0B0D13] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#EC4899]/10 mb-4">
            <Shield className="w-8 h-8 text-[#EC4899]" />
          </div>
          <h1 className="text-2xl font-bold text-white">Checkly Admin</h1>
          <p className="text-white/60 mt-2">Platform Administration Portal</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 bg-white/[0.06] border border-white/[0.1] rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#EC4899]/40 focus:border-[#EC4899]/40"
              placeholder="admin@checkly.app"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 bg-white/[0.06] border border-white/[0.1] rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#EC4899]/40 focus:border-[#EC4899]/40"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-transparent border border-[#EC4899] text-[#EC4899] hover:shadow-[0_0_12px_rgba(236,72,153,0.7)] disabled:opacity-50 disabled:cursor-not-allowed font-semibold rounded-lg transition-all duration-200 ease-in-out flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <Shield className="w-4 h-4" />
                Access Admin Portal
              </>
            )}
          </button>
        </form>

        <p className="text-center text-white/40 text-xs mt-6">
          This portal is for authorized Checkly platform administrators only.
        </p>
      </div>
    </div>
    </>
  );
}

