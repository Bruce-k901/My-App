"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TasksPage() {
  const router = useRouter();

  useEffect(() => {
    // Get the current URL search params from the browser
    const searchParams = new URLSearchParams(window.location.search);
    const taskParam = searchParams.get('task');
    
    // Redirect to my-tasks page, preserving the task query parameter
    if (taskParam) {
      router.replace(`/dashboard/tasks/my-tasks?task=${taskParam}`);
    } else {
      router.replace('/dashboard/tasks/my-tasks');
    }
  }, [router]);

  // Show loading state while redirecting
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-white">Redirecting...</div>
    </div>
  );
}

