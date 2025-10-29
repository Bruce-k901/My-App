import React from 'react';

export default function TasksLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {children}
    </div>
  );
}
