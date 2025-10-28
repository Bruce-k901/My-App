"use client";

import React from 'react';
import { useParams } from 'next/navigation';

export default function TaskViewPage() {
  const params = useParams();
  const taskId = params.taskId as string;

  return (
    <div className="min-h-screen bg-neutral-900 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold mb-2">Task Details</h1>
          <p className="text-neutral-400">Viewing task: {taskId}</p>
        </div>

        <div className="bg-neutral-800 rounded-lg p-6">
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📋</div>
            <h2 className="text-xl font-semibold text-white mb-2">Task View Coming Soon</h2>
            <p className="text-neutral-400 mb-4">
              This page will show detailed task information and completion forms.
            </p>
            <div className="text-sm text-neutral-500">
              Task ID: {taskId}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
