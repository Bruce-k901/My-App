'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Admin page error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-4">
      <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-8 max-w-md w-full shadow-sm">
        <h2 className="text-2xl font-bold text-theme-primary mb-4">Something went wrong!</h2>
        <p className="text-theme-tertiary mb-6">{error.message || 'An unexpected error occurred'}</p>
        <div className="flex gap-4">
          <Button
            onClick={reset}
            className="bg-[#D37E91] hover:bg-[#D37E91]/80 text-white"
          >
            Try again
          </Button>
          <Button
            onClick={() => window.location.href = '/admin/login'}
            className="bg-transparent border border-[#D37E91] text-[#D37E91] hover:shadow-[0_0_12px_rgba(211, 126, 145,0.7)]"
          >
            Go to Login
          </Button>
        </div>
      </div>
    </div>
  );
}

