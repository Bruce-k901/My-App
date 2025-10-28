"use client";

import React, { useState } from 'react';

interface ComplianceTemplate {
  id: string;
  name: string;
  description: string;
  regulation_type: string;
  category: string;
  frequency: string;
  min_instances_per_day: number;
  icon: string;
}

interface DeployComplianceModalProps {
  template: ComplianceTemplate;
  onDeploy: (siteIds: string[], daypart: string) => void;
  onClose: () => void;
}

export function DeployComplianceModal({ template, onDeploy, onClose }: DeployComplianceModalProps) {
  const [selectedSites, setSelectedSites] = useState<string[]>([]);
  const [selectedDaypart, setSelectedDaypart] = useState<string>('morning');

  // Mock sites data
  const sites = [
    { id: 'site-1', name: 'Main Restaurant' },
    { id: 'site-2', name: 'Kitchen Prep Area' },
    { id: 'site-3', name: 'Storage Room' }
  ];

  const dayparts = [
    { value: 'morning', label: 'Morning (6AM - 12PM)' },
    { value: 'afternoon', label: 'Afternoon (12PM - 6PM)' },
    { value: 'evening', label: 'Evening (6PM - 12AM)' }
  ];

  const handleSiteToggle = (siteId: string) => {
    setSelectedSites(prev => 
      prev.includes(siteId) 
        ? prev.filter(id => id !== siteId)
        : [...prev, siteId]
    );
  };

  const handleDeploy = () => {
    if (selectedSites.length === 0) {
      alert('Please select at least one site');
      return;
    }
    onDeploy(selectedSites, selectedDaypart);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-neutral-800 rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Deploy {template.name}</h2>
          <button 
            onClick={onClose}
            className="text-neutral-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="mb-4">
          <p className="text-neutral-300 text-sm mb-4">{template.description}</p>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-white mb-2">
              Select Sites:
            </label>
            <div className="space-y-2">
              {sites.map(site => (
                <label key={site.id} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedSites.includes(site.id)}
                    onChange={() => handleSiteToggle(site.id)}
                    className="mr-2"
                  />
                  <span className="text-neutral-300">{site.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-white mb-2">
              Daypart:
            </label>
            <select
              value={selectedDaypart}
              onChange={(e) => setSelectedDaypart(e.target.value)}
              className="w-full bg-neutral-700 border border-neutral-600 rounded px-3 py-2 text-white"
            >
              {dayparts.map(daypart => (
                <option key={daypart.value} value={daypart.value}>
                  {daypart.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-neutral-600 text-white rounded hover:bg-neutral-500 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDeploy}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-pink-600/70 to-blue-600/70 text-white rounded hover:shadow-lg hover:shadow-pink-500/30 transition-all"
          >
            Deploy Template
          </button>
        </div>
      </div>
    </div>
  );
}