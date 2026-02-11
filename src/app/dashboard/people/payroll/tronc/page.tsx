'use client';

import { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Label from '@/components/ui/Label';
import { ArrowLeft, Save } from '@/components/ui/icons';
import Link from 'next/link';
import { toast } from 'sonner';

interface TroncConfig {
  id?: string;
  company_id: string;
  site_id: string | null;
  point_value: number;
  allocation_rules: any;
  period_start_date: string;
  period_end_date: string;
  total_tronc_pool: number;
  is_active: boolean;
}

export default function TroncPage() {
  const { profile, companyId } = useAppContext();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [configs, setConfigs] = useState<TroncConfig[]>([]);
  const [newConfig, setNewConfig] = useState<Partial<TroncConfig>>({
    site_id: null,
    point_value: 1.00,
    allocation_rules: {},
    total_tronc_pool: 0,
    is_active: true,
  });

  useEffect(() => {
    if (companyId) {
      fetchConfigs();
    }
  }, [companyId]);

  const fetchConfigs = async () => {
    if (!companyId) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('tronc_configurations')
      .select('*')
      .eq('company_id', companyId)
      .order('period_start_date', { ascending: false })
      .limit(10);
    
    if (error) {
      console.error('Error fetching tronc configs:', error);
      toast.error('Failed to load tronc configurations');
    } else {
      setConfigs(data || []);
    }
    
    setLoading(false);
  };

  const handleSave = async () => {
    if (!companyId || !profile?.id || !newConfig.period_start_date || !newConfig.period_end_date) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSaving(true);
    
    try {
      const configData = {
        ...newConfig,
        company_id: companyId,
        created_by: profile.id,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('tronc_configurations')
        .insert(configData);
      
      if (error) throw error;
      
      toast.success('Tronc configuration created');
      setNewConfig({
        site_id: null,
        point_value: 1.00,
        allocation_rules: {},
        total_tronc_pool: 0,
        is_active: true,
      });
      await fetchConfigs();
    } catch (error: any) {
      console.error('Error saving tronc config:', error);
      toast.error('Failed to save: ' + (error.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/people/payroll">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tronc Configuration</h1>
          <p className="text-gray-500 dark:text-white/60">Configure tip distribution points and values</p>
        </div>
      </div>

      {/* Create New Config */}
      <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Create Tronc Configuration</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="period_start" className="text-gray-900 dark:text-white">Period Start Date</Label>
            <Input
              id="period_start"
              type="date"
              value={newConfig.period_start_date || ''}
              onChange={(e) => setNewConfig({ ...newConfig, period_start_date: e.target.value })}
              className="bg-white dark:bg-white/[0.05] border-gray-300 dark:border-white/[0.12] text-gray-900 dark:text-white"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="period_end" className="text-gray-900 dark:text-white">Period End Date</Label>
            <Input
              id="period_end"
              type="date"
              value={newConfig.period_end_date || ''}
              onChange={(e) => setNewConfig({ ...newConfig, period_end_date: e.target.value })}
              className="bg-white dark:bg-white/[0.05] border-gray-300 dark:border-white/[0.12] text-gray-900 dark:text-white"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="point_value" className="text-gray-900 dark:text-white">Point Value (£ per point)</Label>
            <Input
              id="point_value"
              type="number"
              step="0.01"
              min="0"
              value={newConfig.point_value || 1.00}
              onChange={(e) => setNewConfig({ ...newConfig, point_value: parseFloat(e.target.value) || 1.00 })}
              className="bg-white dark:bg-white/[0.05] border-gray-300 dark:border-white/[0.12] text-gray-900 dark:text-white"
            />
            <p className="text-xs text-gray-500 dark:text-white/60">How much each point is worth in pounds</p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="tronc_pool" className="text-gray-900 dark:text-white">Total Tronc Pool (£)</Label>
            <Input
              id="tronc_pool"
              type="number"
              step="0.01"
              min="0"
              value={newConfig.total_tronc_pool || 0}
              onChange={(e) => setNewConfig({ ...newConfig, total_tronc_pool: parseFloat(e.target.value) || 0 })}
              className="bg-white dark:bg-white/[0.05] border-gray-300 dark:border-white/[0.12] text-gray-900 dark:text-white"
            />
            <p className="text-xs text-gray-500 dark:text-white/60">Total tip pool for this period</p>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-white/[0.06]">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-transparent border border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400 hover:shadow-[0_0_12px_rgba(37,99,235,0.4)] dark:hover:shadow-[0_0_12px_rgba(96,165,250,0.5)] transition-all duration-200"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 dark:border-blue-400 mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Create Configuration
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Existing Configs */}
      {configs.length > 0 && (
        <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-white/[0.06]">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Existing Configurations</h2>
          </div>
          <div className="divide-y divide-white/[0.06]">
            {configs.map((config) => (
              <div key={config.id} className="p-4 hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-900 dark:text-white font-medium">
                      {formatDate(config.period_start_date)} - {formatDate(config.period_end_date)}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-white/60">
                      Point Value: {formatCurrency(config.point_value)} | 
                      Pool: {formatCurrency(config.total_tronc_pool)}
                    </p>
                  </div>
                  {config.is_active && (
                    <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs">
                      Active
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
        <p className="text-sm text-blue-400">
          <strong>Tronc Points:</strong> Points are typically allocated based on hours worked. 
          The point value determines how much each point is worth. Total tronc pool is distributed 
          proportionally based on points earned.
        </p>
      </div>
    </div>
  );
}

