'use client';

import React, { useState, useEffect } from 'react';
import { Bell, MapPin, ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { useSiteContext } from '@/contexts/SiteContext';

interface MobileHeaderProps {
  userName: string;
  siteName?: string;
  department?: string;
  unreadNotifications?: number;
  onNotificationClick?: () => void;
  showSiteSelector?: boolean;
}

export function MobileHeader({
  userName,
  siteName: propSiteName,
  department,
  unreadNotifications = 0,
  onNotificationClick,
  showSiteSelector = true,
}: MobileHeaderProps) {
  const { companyId, profile, siteId } = useAppContext();
  const { setSiteId } = useSiteContext();
  const [sites, setSites] = useState<{ id: string; name: string }[]>([]);
  const [showSiteDropdown, setShowSiteDropdown] = useState(false);
  const [currentSiteName, setCurrentSiteName] = useState(propSiteName || 'All Sites');

  // Check if user is owner/admin
  const isOwnerOrAdmin = profile?.app_role === 'Owner' || profile?.app_role === 'Admin' || profile?.app_role === 'owner' || profile?.app_role === 'admin';

  // Fetch sites for owners/admins
  useEffect(() => {
    if (!companyId || !isOwnerOrAdmin) return;

    const fetchSites = async () => {
      const { data } = await supabase
        .from('sites')
        .select('id, name')
        .eq('company_id', companyId)
        .order('name');

      if (data) {
        setSites(data);
        // Set current site name
        if (siteId && siteId !== 'all') {
          const site = data.find(s => s.id === siteId);
          setCurrentSiteName(site?.name || 'All Sites');
        } else {
          setCurrentSiteName('All Sites');
        }
      }
    };

    fetchSites();
  }, [companyId, siteId, isOwnerOrAdmin]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const handleSiteSelect = (selectedSiteId: string | null) => {
    setSiteId(selectedSiteId);
    if (selectedSiteId === null || selectedSiteId === 'all') {
      setCurrentSiteName('All Sites');
    } else {
      const site = sites.find(s => s.id === selectedSiteId);
      setCurrentSiteName(site?.name || 'All Sites');
    }
    setShowSiteDropdown(false);
  };

  const displaySiteName = propSiteName || currentSiteName;

  return (
    <header className="px-5 pt-4 pb-6 relative">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-400 text-sm">{getGreeting()}</p>
          <h1 className="text-2xl font-bold mt-0.5 text-white">{userName}</h1>

          {/* Site selector for owners */}
          {showSiteSelector && isOwnerOrAdmin && sites.length > 0 ? (
            <button
              onClick={() => setShowSiteDropdown(!showSiteDropdown)}
              className="flex items-center gap-2 mt-1 text-gray-400 text-sm hover:text-gray-300 transition-colors"
            >
              <MapPin size={14} />
              <span>{displaySiteName}</span>
              <ChevronDown size={14} className={`transition-transform ${showSiteDropdown ? 'rotate-180' : ''}`} />
            </button>
          ) : (
            <div className="flex items-center gap-2 mt-1 text-gray-400 text-sm">
              <MapPin size={14} />
              <span>{displaySiteName}</span>
              {department && (
                <>
                  <span className="text-gray-600">•</span>
                  <span>{department}</span>
                </>
              )}
            </div>
          )}
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

      {/* Site dropdown */}
      {showSiteDropdown && isOwnerOrAdmin && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowSiteDropdown(false)}
          />
          <div className="absolute left-5 right-5 mt-2 bg-[#1a1a1f] border border-white/10 rounded-xl shadow-xl z-50 max-h-[50vh] overflow-y-auto">
            <button
              onClick={() => handleSiteSelect('all')}
              className={cn(
                "w-full px-4 py-3 text-left flex items-center justify-between border-b border-white/10",
                (siteId === 'all' || !siteId) ? 'text-[#EC4899]' : 'text-white'
              )}
            >
              <span>All Sites</span>
              {(siteId === 'all' || !siteId) && <Check size={16} />}
            </button>
            {sites.map(site => (
              <button
                key={site.id}
                onClick={() => handleSiteSelect(site.id)}
                className={cn(
                  "w-full px-4 py-3 text-left flex items-center justify-between border-b border-white/5 last:border-0",
                  siteId === site.id ? 'text-[#EC4899]' : 'text-white/80'
                )}
              >
                <span>{site.name}</span>
                {siteId === site.id && <Check size={16} />}
              </button>
            ))}
          </div>
        </>
      )}
    </header>
  );
}
