'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Rocket } from '@/components/ui/icons';

export default function BackToSetup() {
  const searchParams = useSearchParams();
  const fromSetup = searchParams.get('from') === 'setup';

  if (!fromSetup) return null;

  return (
    <Link
      href="/dashboard/business"
      className="inline-flex items-center gap-2 text-sm text-teamly dark:text-teamly hover:text-teamly dark:hover:text-teamly/30 transition-colors mb-4"
    >
      <ArrowLeft className="w-4 h-4" />
      <Rocket className="w-3.5 h-3.5" />
      Back to Getting Started
    </Link>
  );
}
