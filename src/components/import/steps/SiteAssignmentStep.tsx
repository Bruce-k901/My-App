'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';

interface Site {
  id: string;
  name: string;
}

interface SiteAssignmentStepProps {
  selectedSites: string[];
  onSitesChange: (siteIds: string[]) => void;
  onNext: () => void;
  onBack: () => void;
  includedCount: number;
  trailSiteName: string;
}

export function SiteAssignmentStep({
  selectedSites,
  onSitesChange,
  onNext,
  onBack,
  includedCount,
  trailSiteName,
}: SiteAssignmentStepProps) {
  const { companyId } = useAppContext();
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;
    (async () => {
      const { data } = await supabase
        .from('sites')
        .select('id, name')
        .eq('company_id', companyId)
        .order('name');

      if (data) {
        setSites(data);
        // Auto-select site matching Trail site name
        if (selectedSites.length === 0 && trailSiteName) {
          const match = data.find(
            s => s.name.toLowerCase().includes(trailSiteName.toLowerCase()) ||
                 trailSiteName.toLowerCase().includes(s.name.toLowerCase())
          );
          if (match) onSitesChange([match.id]);
        }
      }
      setLoading(false);
    })();
  }, [companyId]);

  const toggleSite = (siteId: string) => {
    if (selectedSites.includes(siteId)) {
      onSitesChange(selectedSites.filter(s => s !== siteId));
    } else {
      onSitesChange([...selectedSites, siteId]);
    }
  };

  const selectAll = () => onSitesChange(sites.map(s => s.id));
  const selectNone = () => onSitesChange([]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-theme-primary mb-1">
          Link templates to sites
        </h3>
        <p className="text-xs text-theme-tertiary">
          {includedCount} templates will be linked to the selected site(s) for scheduling later.
          {trailSiteName && <> Trail data is from <strong>{trailSiteName}</strong>.</>}
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-checkly-dark dark:border-checkly border-t-transparent rounded-full animate-spin" />
        </div>
      ) : sites.length === 0 ? (
        <p className="text-sm text-theme-secondary py-4">
          No sites found. Please create a site first.
        </p>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={selectAll} className="text-xs">
              Select all
            </Button>
            <Button variant="ghost" size="sm" onClick={selectNone} className="text-xs">
              Clear
            </Button>
          </div>

          <div className="space-y-2">
            {sites.map(site => {
              const isSelected = selectedSites.includes(site.id);
              const isTrailMatch = trailSiteName &&
                (site.name.toLowerCase().includes(trailSiteName.toLowerCase()) ||
                 trailSiteName.toLowerCase().includes(site.name.toLowerCase()));

              return (
                <button
                  key={site.id}
                  onClick={() => toggleSite(site.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors text-left ${
                    isSelected
                      ? 'border-checkly-dark dark:border-checkly bg-checkly-dark/10 dark:bg-checkly/10'
                      : 'border-theme hover:border-checkly-dark/50 dark:hover:border-checkly/50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}}
                    className="accent-checkly-dark dark:accent-checkly"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-theme-primary">{site.name}</span>
                    {isTrailMatch && (
                      <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500">
                        Matches Trail
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2">
        <Button variant="ghost" onClick={onBack}>Back</Button>
        <Button
          onClick={onNext}
          disabled={selectedSites.length === 0}
          className="bg-checkly-dark dark:bg-checkly text-white dark:text-[#1C1916] hover:opacity-90"
        >
          Import {includedCount} Templates
        </Button>
      </div>
    </div>
  );
}
