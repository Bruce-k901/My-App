"use client";

import { Suspense } from 'react';
import { Messaging } from '@/components/messaging/Messaging';

function MessagingContent() {
  return <Messaging />;
}

export default function MessagingPage() {
  return (
    <div className="h-screen md:h-[calc(100vh-72px)] w-full bg-[#0B0D13] overflow-hidden">
      <Suspense fallback={
        <div className="flex items-center justify-center h-full bg-[#0B0D13]">
          <div className="text-white">Loading messaging...</div>
        </div>
      }>
        <MessagingContent />
      </Suspense>
    </div>
  );
}

