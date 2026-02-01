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
          <p className="text-muted-foreground text-sm">{getGreeting()}</p>
          <h1 className="text-2xl font-bold mt-0.5">{userName}</h1>
          <div className="flex items-center gap-2 mt-1 text-muted-foreground text-sm">
            <MapPin size={14} />
            <span>{siteName}</span>
            {department && (
              <>
                <span className="text-muted-foreground/50">•</span>
                <span>{department}</span>
              </>
            )}
          </div>
        </div>
        <button
          onClick={onNotificationClick}
          className={cn(
            "relative p-2 rounded-full",
            "bg-muted hover:bg-muted/80",
            "transition-colors"
          )}
        >
          <Bell size={20} />
          {unreadNotifications > 0 && (
            <span className={cn(
              "absolute top-1 right-1 w-2.5 h-2.5",
              "bg-primary rounded-full",
              "ring-2 ring-background"
            )} />
          )}
        </button>
      </div>
    </header>
  );
}
