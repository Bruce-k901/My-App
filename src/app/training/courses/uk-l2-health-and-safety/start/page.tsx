'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function StartHealthAndSafetyCoursePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/learn/uk-l2-health-and-safety");
  }, [router]);

  return <div className="flex h-screen items-center justify-center text-white">Redirecting to new course player...</div>;
}
