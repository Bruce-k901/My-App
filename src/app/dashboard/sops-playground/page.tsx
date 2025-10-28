'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SOPsPlaygroundRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/sop-playground');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-neutral-400">Redirecting to SOP Playground...</p>
    </div>
  );
}
