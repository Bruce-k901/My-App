"use client";

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function TasksPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Use Next.js searchParams instead of window.location to prevent hydration issues
    const taskParam = searchParams.get('task');
    
    // Redirect to my-tasks page, preserving the task query parameter
    if (taskParam) {
      router.replace(`/dashboard/tasks/my-tasks?task=${taskParam}`);
    } else {
      router.replace('/dashboard/tasks/my-tasks');
    }
  }, [router, searchParams]);

  // Show loading state while redirecting
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-white">Redirecting...</div>
    </div>
  );
}

export default function TasksPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-white">Loading...</div>
      </div>
    }>
      <TasksPageContent />
    </Suspense>
  );
}

