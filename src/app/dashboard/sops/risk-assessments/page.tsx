"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Shield, Plus, AlertTriangle, CheckCircle, Download } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';

const TEMPLATES = [
  {
    id: 'general',
    title: 'General Risk Assessment',
    description: 'Comprehensive risk assessment for all activities',
    icon: FileText,
    color: 'from-red-500/20 to-orange-500/20',
    borderColor: 'border-red-500/30',
    link: '/dashboard/risk-assessments/general-template'
  },
  {
    id: 'coshh',
    title: 'COSHH Risk Assessment',
    description: 'Control of Substances Hazardous to Health',
    icon: Shield,
    color: 'from-amber-500/20 to-yellow-500/20',
    borderColor: 'border-amber-500/30',
    link: '/dashboard/risk-assessments/coshh-template'
  }
];

export default function RiskAssessmentsPage() {
  const router = useRouter();
  const { companyId } = useAppContext();
  
  const [loading, setLoading] = useState(true);
  const [coshhSheets, setCOSHHSheets] = useState([]);
  const [missingSheets, setMissingSheets] = useState(0);

  useEffect(() => {
    loadCOSHHData();
  }, [companyId]);

  const loadCOSHHData = async () => {
    if (!companyId) return;
    
    try {
      setLoading(true);
      
      const [sheetsResult, chemicalsResult] = await Promise.all([
        supabase.from('coshh_data_sheets').select('*').eq('company_id', companyId).eq('status', 'Active').order('created_at', { ascending: false }).limit(5),
        supabase.from('chemicals_library').select('id').eq('company_id', companyId)
      ]);
      
      setCOSHHSheets(sheetsResult.data || []);
      
      // Count chemicals without COSHH sheets
      const chemicalsWithoutSheets = (chemicalsResult.data || []).filter(c => {
        return !coshhSheets.some(s => s.chemical_id === c.id);
      });
      setMissingSheets(chemicalsWithoutSheets.length);
    } catch (error) {
      console.error('Error loading COSHH data:', error);
    } finally {
      setLoading(false);
    }
  };

  const isExpiringSoon = (expiryDate) => {
    if (!expiryDate) return false;
    const daysUntilExpiry = Math.floor((new Date(expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 30 && daysUntilExpiry >= 0;
  };

  return (
    <div className="space-y-6">
      {/* COSHH Data Summary */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">COSHH Data</h2>
          <button
            onClick={() => router.push('/dashboard/coshh-data')}
            className="px-4 py-2 bg-magenta-600 hover:bg-magenta-500 rounded-lg text-white text-sm flex items-center gap-2"
          >
            <Download size={16} />
            Manage All COSHH Data
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-neutral-800/50 rounded-xl p-4 border border-neutral-700">
            <div className="text-neutral-400 text-sm">Total Sheets</div>
            <div className="text-2xl font-bold text-white mt-1">{coshhSheets.length}</div>
          </div>
          <div className="bg-neutral-800/50 rounded-xl p-4 border border-neutral-700">
            <div className="text-neutral-400 text-sm">Verified</div>
            <div className="text-2xl font-bold text-green-400 mt-1">
              {coshhSheets.filter(s => s.verification_status === 'Verified').length}
            </div>
          </div>
          <div className="bg-neutral-800/50 rounded-xl p-4 border border-neutral-700">
            <div className="text-neutral-400 text-sm">Expiring Soon</div>
            <div className={`text-2xl font-bold mt-1 ${coshhSheets.filter(s => isExpiringSoon(s.expiry_date)).length > 0 ? 'text-orange-400' : 'text-white'}`}>
              {coshhSheets.filter(s => isExpiringSoon(s.expiry_date)).length}
            </div>
          </div>
          <div className="bg-neutral-800/50 rounded-xl p-4 border border-neutral-700">
            <div className="text-neutral-400 text-sm">Missing</div>
            <div className={`text-2xl font-bold mt-1 ${missingSheets > 0 ? 'text-red-400' : 'text-white'}`}>
              {missingSheets}
            </div>
          </div>
        </div>

        {/* Missing Sheets Alert */}
        {missingSheets > 0 && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3 mb-4">
            <AlertTriangle size={20} className="text-red-400" />
            <div className="flex-1">
              <div className="text-red-400 font-semibold">{missingSheets} chemical(s) missing COSHH sheets</div>
              <div className="text-red-300 text-sm">Upload safety data sheets to maintain compliance</div>
            </div>
            <button
              onClick={() => router.push('/dashboard/coshh-data')}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-white text-sm"
            >
              Upload Now
            </button>
          </div>
        )}

        {/* Recent Uploads */}
        {coshhSheets.length > 0 && (
          <div className="bg-neutral-800/50 rounded-xl p-4 border border-neutral-700">
            <h3 className="text-sm font-semibold text-neutral-300 mb-3">Recent Uploads</h3>
            <div className="space-y-2">
              {coshhSheets.slice(0, 5).map((sheet) => (
                <div key={sheet.id} className="flex items-center justify-between p-2 bg-neutral-900/50 rounded border border-neutral-600">
                  <div className="flex-1">
                    <div className="text-sm text-white">{sheet.product_name}</div>
                    <div className="text-xs text-neutral-400">{sheet.manufacturer}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {sheet.verification_status === 'Verified' && (
                      <CheckCircle size={16} className="text-green-400" />
                    )}
                    {sheet.verification_status === 'Pending' && (
                      <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/40 rounded text-xs">
                        Pending
                      </span>
                    )}
                    {isExpiringSoon(sheet.expiry_date) && (
                      <AlertTriangle size={16} className="text-orange-400" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Create New Risk Assessments */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-4">Create New Risk Assessment</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {TEMPLATES.map((template) => {
            const Icon = template.icon;
            return (
              <button
                key={template.id}
                onClick={() => router.push(template.link)}
                className={`bg-gradient-to-br ${template.color} border ${template.borderColor} rounded-xl p-6 text-left hover:scale-105 transition-all cursor-pointer group`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-3 rounded-lg bg-white/10 group-hover:bg-white/20 transition-colors">
                    <Icon size={24} className="text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">{template.title}</h3>
                </div>
                <p className="text-sm text-neutral-300">{template.description}</p>
                <div className="mt-4 flex items-center gap-2 text-xs text-neutral-400">
                  <Plus size={14} />
                  <span>Create new</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-neutral-800/50 rounded-xl p-8 text-center border border-neutral-700">
        <p className="text-neutral-400">
          View and manage existing risk assessments from the main Risk Assessments page.
        </p>
      </div>
    </div>
  );
}

