'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

type TabId = 'home' | 'tasks' | 'messages' | 'schedule' | 'more';

interface MobileNavContextType {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  isMoreSheetOpen: boolean;
  openMoreSheet: () => void;
  closeMoreSheet: () => void;
  badges: {
    tasks: number;
    messages: number;
  };
  setBadges: (badges: { tasks?: number; messages?: number }) => void;
}

const MobileNavContext = createContext<MobileNavContextType | undefined>(undefined);

export function MobileNavProvider({ children }: { children: React.ReactNode }) {
  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [isMoreSheetOpen, setIsMoreSheetOpen] = useState(false);
  const [badges, setBadgesState] = useState({ tasks: 0, messages: 0 });

  const openMoreSheet = useCallback(() => setIsMoreSheetOpen(true), []);
  const closeMoreSheet = useCallback(() => setIsMoreSheetOpen(false), []);

  const setBadges = useCallback((newBadges: { tasks?: number; messages?: number }) => {
    setBadgesState(prev => ({ ...prev, ...newBadges }));
  }, []);

  // When "more" tab is tapped, open sheet instead of navigating
  const handleSetActiveTab = useCallback((tab: TabId) => {
    if (tab === 'more') {
      openMoreSheet();
    } else {
      setActiveTab(tab);
      closeMoreSheet();
    }
  }, [openMoreSheet, closeMoreSheet]);

  return (
    <MobileNavContext.Provider
      value={{
        activeTab,
        setActiveTab: handleSetActiveTab,
        isMoreSheetOpen,
        openMoreSheet,
        closeMoreSheet,
        badges,
        setBadges,
      }}
    >
      {children}
    </MobileNavContext.Provider>
  );
}

export function useMobileNav() {
  const context = useContext(MobileNavContext);
  if (!context) {
    throw new Error('useMobileNav must be used within MobileNavProvider');
  }
  return context;
}
