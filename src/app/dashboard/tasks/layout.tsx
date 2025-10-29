import React from 'react';
import { TaskSubHeader } from '@/components/tasks/TaskSubHeader';

export default function TasksLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-white">Task Management</h1>
      </div>
      <TaskSubHeader />
      <div className="mt-6">
        {children}
      </div>
    </div>
  );
}
