'use client';

import React from 'react';
import { Bell, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileHeaderProps {
  userName: string;
  siteName: string;
  department?: string;
  unreadNotifications?: number;
  onNotificationClick?: () => void;
}

export function MobileHeader({
  userName,
  siteName,
  department,
  unreadNotifications = 0,
  onNotificationClick,
}: MobileHeaderProps) {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <header className="px-5 pt-4 pb-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-400 text-sm">{getGreeting()}</p>
          <h1 className="text-2xl font-bold mt-0.5 text-white">{userName}</h1>
          <div className="flex items-center gap-2 mt-1 text-gray-400 text-sm">
            <MapPin size={14} />
            <span>{siteName}</span>
            {department && (
              <>
                <span className="text-gray-600">•</span>
                <span>{department}</span>
              </>
            )}
          </div>
        </div>
        <button
          onClick={onNotificationClick}
          className={cn(
            "relative p-2 rounded-full",
            "bg-white/5 hover:bg-white/10",
            "transition-colors"
          )}
        >
          <Bell size={20} className="text-gray-400" />
          {unreadNotifications > 0 && (
            <span className={cn(
              "absolute top-1 right-1 w-2.5 h-2.5",
              "bg-[#FF6B9D] rounded-full",
              "ring-2 ring-[#0a0a0a]"
            )} />
          )}
        </button>
      </div>
    </header>
  );
}
