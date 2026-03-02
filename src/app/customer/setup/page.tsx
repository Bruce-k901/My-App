"use client";

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { supabase } from '@/lib/supabase';
import { Loader2, CheckCircle2, AlertCircle } from '@/components/ui/icons';

function SetupContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [step, setStep] = useState<'loading' | 'invalid' | 'form' | 'success'>('loading');
  const [token, setToken] = useState<string | null>(null);
  const [customerEmail, setCustomerEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{
    password?: string;
    confirmPassword?: string;
    general?: string;
  }>({});
  const [loading, setLoading] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null);

  useEffect(() => {
    const tokenParam = searchParams.get('token');
    if (!tokenParam) {
      setStep('invalid');
      return;
    }

    setToken(tokenParam);
    validateToken(tokenParam);
  }, [searchParams]);

  const validateToken = async (tokenValue: string) => {
    try {
      const response = await fetch(`/api/validate-invitation-token?token=${encodeURIComponent(tokenValue)}`);
      
      if (!response.ok) {
        setStep('invalid');
        return;
      }

      const result = await response.json();
      if (!result || !result.email || !result.customer_id) {
        setStep('invalid');
        return;
      }

      setCustomerEmail(result.email);
      setCustomerId(result.customer_id);
      setStep('form');
    } catch (error) {
      console.error('Error validating token:', error);
      setStep('invalid');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      // Validate password
      if (password.length < 8) {
        setErrors({ password: 'Password must be at least 8 characters' });
        setLoading(false);
        return;
      }

      if (password !== confirmPassword) {
        setErrors({ confirmPassword: 'Passwords do not match' });
        setLoading(false);
        return;
      }

      if (!token || !customerId) {
        setErrors({ general: 'Invalid invitation token' });
        setLoading(false);
        return;
      }

      // Create auth account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: customerEmail,
        password: password,
        options: {
          emailRedirectTo: `${window.location.origin}/customer/dashboard`,
        },
      });

      if (authError) {
        throw new Error(authError.message);
      }

      if (!authData.user) {
        throw new Error('Failed to create account');
      }

      // Link auth to customer record (activate in planly)
      const { error: updateError } = await supabase
        .from('planly_customers')
        .update({
          is_active: true,
        })
        .eq('id', customerId);

      if (updateError) {
        throw new Error(updateError.message);
      }

      // Mark invitation as used
      await fetch('/api/mark-invitation-used', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      // Auto-login
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: customerEmail,
        password: password,
      });

      if (signInError) {
        // Account created but login failed - redirect to login page
        router.push('/login?message=Account created successfully. Please sign in.');
        return;
      }

      setStep('success');

      // Redirect to customer portal after 2 seconds
      setTimeout(() => {
        router.push('/customer/dashboard');
      }, 2000);
    } catch (error: any) {
      console.error('Error creating account:', error);
      setErrors({ general: error.message || 'Failed to create account' });
    } finally {
      setLoading(false);
    }
  };

  if (step === 'loading') {
    return (
      <div className="min-h-screen bg-[rgb(var(--background))] flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-module-fg mx-auto mb-4" />
          <p className="text-theme-tertiary">Validating invitation...</p>
        </div>
      </div>
    );
  }

  if (step === 'invalid') {
    return (
      <div className="min-h-screen bg-[rgb(var(--background))] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-theme-button border border-theme rounded-xl p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-600 dark:text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-theme-primary mb-2">Invalid Invitation</h1>
          <p className="text-theme-tertiary mb-6">
            This invitation link is invalid or has expired. Please contact your supplier for a new invitation.
          </p>
          <Button
            onClick={() => router.push('/login')}
            className="bg-transparent text-module-fg border border-module-fg hover:shadow-module-glow"
          >
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-[rgb(var(--background))] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-theme-button border border-theme rounded-xl p-8 text-center">
          <CheckCircle2 className="w-12 h-12 text-module-fg mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-theme-primary mb-2">Account Created!</h1>
          <p className="text-theme-tertiary mb-6">
            Your account has been set up successfully. Redirecting to your portal...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[rgb(var(--background))] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-theme-button border border-theme rounded-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-theme-primary mb-2">Welcome to Okja Bakery</h1>
          <p className="text-theme-tertiary">Set up your customer portal account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email (read-only) */}
          <div>
            <label className="block text-sm text-theme-secondary mb-1.5">Email</label>
            <Input
              type="email"
              value={customerEmail}
              disabled
              className="bg-theme-button text-theme-tertiary cursor-not-allowed focus-visible:ring-module-fg/50 focus-visible:border-module-fg/30"
            />
            <p className="text-xs text-theme-tertiary mt-1">This email will be used to log in</p>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm text-theme-secondary mb-1.5">
              Create Password <span className="text-red-600 dark:text-red-400">*</span>
            </label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password (min 8 characters)"
              required
              className="focus-visible:ring-module-fg/50 focus-visible:border-module-fg/30"
            />
            {errors.password && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.password}</p>
            )}
            <p className="text-xs text-theme-tertiary mt-1">Password must be at least 8 characters</p>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm text-theme-secondary mb-1.5">
              Confirm Password <span className="text-red-600 dark:text-red-400">*</span>
            </label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              required
              className="focus-visible:ring-module-fg/50 focus-visible:border-module-fg/30"
            />
            {errors.confirmPassword && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.confirmPassword}</p>
            )}
          </div>

          {errors.general && (
            <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg p-3">
              <p className="text-sm text-red-600 dark:text-red-400">{errors.general}</p>
            </div>
          )}

          <Button
            type="submit"
            loading={loading}
            className="w-full bg-transparent text-module-fg border border-module-fg hover:shadow-module-glow"
          >
            Create Account
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function CustomerSetupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[rgb(var(--background))] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-module-fg" />
        </div>
      }
    >
      <SetupContent />
    </Suspense>
  );
}

