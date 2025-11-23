'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function StartAllergenCoursePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/learn/uk-l2-allergens');
  }, [router]);

  return null;
}
