"use client";

import { Suspense, useEffect, useState } from 'react';
import { Messaging } from '@/components/messaging/Messaging';

function MessagingContent() {
  return <Messaging />;
}

export default function MessagingPage() {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  return (
    <div 
      className="w-full bg-[#0B0D13] overflow-hidden flex flex-col fixed" 
      style={{ 
        margin: 0,
        padding: 0,
        top: '112px', // Header (64px) + ModuleBar (56px) - 8px border overlap = 112px
        left: isDesktop ? '80px' : '0', // Sidebar width on desktop
        right: 0,
        width: isDesktop ? 'calc(100vw - 80px)' : '100vw', // Full width minus sidebar on desktop
        height: 'calc(100vh - 112px)', // Full height minus header (112px)
        zIndex: 10
      }}
    >
      <Suspense fallback={
        <div className="flex items-center justify-center h-full bg-[#0B0D13] min-h-[400px]">
          <div className="text-white">Loading messaging...</div>
        </div>
      }>
        <MessagingContent />
      </Suspense>
    </div>
  );
}

