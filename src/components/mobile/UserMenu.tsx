'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  MapPin,
  Moon,
  Sun,
  Settings,
  LogOut,
  ChevronRight,
  Check,
  User,
  Shield,
} from '@/components/ui/icons';
import { useAppContext } from '@/context/AppContext';
import { useSiteContext } from '@/contexts/SiteContext';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';

interface UserMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UserMenu({ isOpen, onClose }: UserMenuProps) {
  const router = useRouter();
  const { profile, signOut, role } = useAppContext();
  const {
    selectedSiteId,
    accessibleSites,
    setSelectedSite,
    getCurrentSiteName,
    canUserSwitchSites,
  } = useSiteContext();
  const { theme, toggleTheme } = useTheme();
  const [showSites, setShowSites] = React.useState(false);

  // Body scroll lock + Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      haptics.medium();
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Reset sites view when menu closes
  useEffect(() => {
    if (!isOpen) setShowSites(false);
  }, [isOpen]);

  const userName = profile?.full_name ||
    (profile?.first_name && profile?.last_name
      ? `${profile.first_name} ${profile.last_name}`
      : 'User');

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const themeLabel = theme === 'dark' ? 'Dark' : theme === 'light' ? 'Light' : 'System';
  const ThemeIcon = theme === 'dark' ? Moon : Sun;

  const handleSiteSelect = (siteId: string | 'all') => {
    haptics.light();
    setSelectedSite(siteId);
    setShowSites(false);
  };

  const handleLogout = () => {
    haptics.medium();
    if (confirm('Are you sure you want to log out?')) {
      signOut();
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed top-0 right-0 bottom-0 w-[80vw] max-w-[320px] z-50 bg-[rgb(var(--surface-elevated))] border-l border-[rgb(var(--border))] overflow-y-auto"
          >
            {/* Header */}
            <div className="p-5 border-b border-[rgb(var(--border))]">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#D37E91] text-white text-lg font-bold flex items-center justify-center flex-shrink-0">
                    {getInitials(userName)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-theme-primary truncate">{userName}</h3>
                    <p className="text-xs text-theme-tertiary truncate">{profile?.email}</p>
                    {role && (
                      <div className="flex items-center gap-1 mt-1">
                        <Shield size={12} className="text-theme-tertiary" />
                        <span className="text-xs text-theme-tertiary">{role}</span>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 -mr-2 rounded-full hover:bg-[rgb(var(--theme-bg-hover))] transition-colors"
                >
                  <X size={20} className="text-theme-tertiary" />
                </button>
              </div>
            </div>

            {/* Menu Items */}
            <div className="p-3 space-y-1">
              {/* Current Site */}
              <div className="px-3 py-2.5">
                <div className="flex items-center gap-2 text-xs text-theme-tertiary mb-1">
                  <MapPin size={12} />
                  <span>Current Site</span>
                </div>
                <div className="text-sm font-medium text-theme-primary">{getCurrentSiteName()}</div>
              </div>

              {/* Switch Site */}
              {canUserSwitchSites && (
                <button
                  onClick={() => setShowSites(!showSites)}
                  className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-[rgb(var(--theme-bg-hover))] rounded-lg text-sm transition-colors"
                >
                  <div className="flex items-center gap-3 text-theme-primary">
                    <MapPin size={18} />
                    <span>Switch Site</span>
                  </div>
                  <ChevronRight
                    size={16}
                    className={cn(
                      "text-theme-tertiary transition-transform",
                      showSites && "rotate-90"
                    )}
                  />
                </button>
              )}

              {/* Site List */}
              {showSites && canUserSwitchSites && (
                <div className="ml-6 mr-2 border-l border-[rgb(var(--border))] pl-3 space-y-0.5">
                  <button
                    onClick={() => handleSiteSelect('all')}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors",
                      selectedSiteId === 'all'
                        ? 'text-[#D37E91] bg-[#D37E91]/10'
                        : 'text-theme-secondary hover:bg-[rgb(var(--theme-bg-hover))]'
                    )}
                  >
                    <span>All Sites</span>
                    {selectedSiteId === 'all' && <Check size={14} />}
                  </button>
                  {accessibleSites.map((site) => (
                    <button
                      key={site.id}
                      onClick={() => handleSiteSelect(site.id)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors",
                        selectedSiteId === site.id
                          ? 'text-[#D37E91] bg-[#D37E91]/10'
                          : 'text-theme-secondary hover:bg-[rgb(var(--theme-bg-hover))]'
                      )}
                    >
                      <span className="truncate">{site.name}</span>
                      {selectedSiteId === site.id && <Check size={14} />}
                    </button>
                  ))}
                </div>
              )}

              {/* Divider */}
              <div className="my-2 border-t border-[rgb(var(--border))]" />

              {/* Theme Toggle */}
              <button
                onClick={() => { haptics.light(); toggleTheme(); }}
                className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-[rgb(var(--theme-bg-hover))] rounded-lg text-sm transition-colors"
              >
                <div className="flex items-center gap-3 text-theme-primary">
                  <ThemeIcon size={18} />
                  <span>Appearance</span>
                </div>
                <span className="text-xs text-theme-tertiary">{themeLabel}</span>
              </button>

              {/* Settings */}
              <button
                onClick={() => {
                  onClose();
                  router.push('/dashboard/settings');
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[rgb(var(--theme-bg-hover))] rounded-lg text-sm text-theme-primary transition-colors"
              >
                <Settings size={18} />
                <span>Settings</span>
              </button>

              {/* Divider */}
              <div className="my-2 border-t border-[rgb(var(--border))]" />

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-red-500/10 rounded-lg text-sm text-red-400 transition-colors"
              >
                <LogOut size={18} />
                <span>Log Out</span>
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
