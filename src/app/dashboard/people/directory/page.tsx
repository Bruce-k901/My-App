'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Redirect directory page to employees page
export default function DirectoryRedirectPage() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/dashboard/people/employees');
  }, [router]);
  
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <p className="text-theme-tertiary">Redirecting to employees page...</p>
      </div>
    </div>
  );
}
