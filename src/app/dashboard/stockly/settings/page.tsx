"use client";

import { useState, useEffect } from 'react';

import { useAppContext } from '@/context/AppContext';

import { supabase } from '@/lib/supabase';

import { 
  Settings,
  Save,
  Loader2,
  Percent,
  DollarSign,
  Users,
  Bell,
  ClipboardList,
  Trash2,
  Tags,
  Shield,
  Eye,
  ChevronRight,
  Plus,
  X,
  Check,
  AlertTriangle,
  ArrowLeft
} from '@/components/ui/icons';
import Link from 'next/link';
import { toast } from 'sonner';

interface StocklySettings {
  // GP & Costing
  default_gp_target: number;
  default_vat_rate: number;
  
  // Staff Purchases
  staff_discount_tiers: number[];
  staff_default_discount: number;
  staff_approval_threshold: number | null;
  staff_payment_methods: string[];
  
  // Alerts
  low_stock_threshold_percent: number;
  expiry_warning_days: number;
  enable_low_stock_alerts: boolean;
  enable_expiry_alerts: boolean;
  
  // Stock Counts
  variance_alert_threshold_percent: number;
  auto_approve_variance_percent: number;
  count_reminder_frequency: string;
  
  // Waste
  waste_reasons: string[];
  require_waste_notes: boolean;
  
  // Categories
  menu_categories: string[];
  
  // Display
  date_format: string;
  week_start_day: string;
  default_report_days: number;
}

const DEFAULT_SETTINGS: StocklySettings = {
  default_gp_target: 70,
  default_vat_rate: 20,
  staff_discount_tiers: [0, 25, 50, 75, 100],
  staff_default_discount: 50,
  staff_approval_threshold: null,
  staff_payment_methods: ['cash', 'payroll', 'free'],
  low_stock_threshold_percent: 20,
  expiry_warning_days: 3,
  enable_low_stock_alerts: true,
  enable_expiry_alerts: true,
  variance_alert_threshold_percent: 5,
  auto_approve_variance_percent: 2,
  count_reminder_frequency: 'weekly',
  waste_reasons: ['expired', 'damaged', 'spoiled', 'spillage', 'theft', 'other'],
  require_waste_notes: false,
  menu_categories: ['Starters', 'Mains', 'Desserts', 'Sides', 'Drinks', 'Cocktails', 'Wine', 'Coffee', 'Kids', 'Specials'],
  date_format: 'DD/MM/YYYY',
  week_start_day: 'monday',
  default_report_days: 30
};

const PAYMENT_METHOD_OPTIONS = [
  { value: 'cash', label: 'Cash', icon: '💵' },
  { value: 'payroll', label: 'Deduct from Wages', icon: '📋' },
  { value: 'free', label: 'Free (Comp)', icon: '🎁' },
  { value: 'card', label: 'Card', icon: '💳' },
];

const COUNT_FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'fortnightly', label: 'Fortnightly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'none', label: 'No reminders' },
];

export default function StocklySettingsPage() {
  const { companyId } = useAppContext();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<StocklySettings>(DEFAULT_SETTINGS);
  const [activeSection, setActiveSection] = useState('costing');
  const [hasChanges, setHasChanges] = useState(false);
  
  // For adding new items
  const [newCategory, setNewCategory] = useState('');
  const [newWasteReason, setNewWasteReason] = useState('');

  useEffect(() => {
    if (companyId) {
      loadSettings();
    }
  }, [companyId]);

  async function loadSettings() {
    setLoading(true);
    try {
      // Load from company_modules table (module-specific settings)
      const { data } = await supabase
        .from('company_modules')
        .select('settings')
        .eq('company_id', companyId)
        .eq('module', 'stockly')
        .single();
      
      if (data?.settings) {
        setSettings({ ...DEFAULT_SETTINGS, ...data.settings });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      // If no module record exists, use defaults
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!companyId) return;
    setSaving(true);
    
    try {
      // Check if company_modules record exists
      const { data: existing } = await supabase
        .from('company_modules')
        .select('id')
        .eq('company_id', companyId)
        .eq('module', 'stockly')
        .single();
      
      if (existing) {
        // Update existing record
        const { error } = await supabase
          .from('company_modules')
          .update({ settings: settings })
          .eq('id', existing.id);
        
        if (error) throw error;
      } else {
        // Create new record
        const { error } = await supabase
          .from('company_modules')
          .insert({
            company_id: companyId,
            module: 'stockly',
            is_enabled: true,
            settings: settings
          });
        
        if (error) throw error;
      }
      
      setHasChanges(false);
      toast.success('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  function updateSetting<K extends keyof StocklySettings>(key: K, value: StocklySettings[K]) {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  }

  function addCategory() {
    if (newCategory && !settings.menu_categories.includes(newCategory)) {
      updateSetting('menu_categories', [...settings.menu_categories, newCategory]);
      setNewCategory('');
    }
  }

  function removeCategory(cat: string) {
    updateSetting('menu_categories', settings.menu_categories.filter(c => c !== cat));
  }

  function addWasteReason() {
    if (newWasteReason && !settings.waste_reasons.includes(newWasteReason.toLowerCase())) {
      updateSetting('waste_reasons', [...settings.waste_reasons, newWasteReason.toLowerCase()]);
      setNewWasteReason('');
    }
  }

  function removeWasteReason(reason: string) {
    updateSetting('waste_reasons', settings.waste_reasons.filter(r => r !== reason));
  }

  function togglePaymentMethod(method: string) {
    if (settings.staff_payment_methods.includes(method)) {
      updateSetting('staff_payment_methods', settings.staff_payment_methods.filter(m => m !== method));
    } else {
      updateSetting('staff_payment_methods', [...settings.staff_payment_methods, method]);
    }
  }

  const sections = [
    { id: 'costing', label: 'GP & Costing', icon: Percent },
    { id: 'staff', label: 'Staff Purchases', icon: Users },
    { id: 'alerts', label: 'Alerts', icon: Bell },
    { id: 'counts', label: 'Stock Counts', icon: ClipboardList },
    { id: 'waste', label: 'Waste', icon: Trash2 },
    { id: 'categories', label: 'Categories', icon: Tags },
    { id: 'display', label: 'Display', icon: Eye },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-magenta-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link 
            href="/dashboard/stockly"
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-theme-tertiary hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-theme-primary">Stockly Settings</h1>
            <p className="text-theme-tertiary text-sm mt-1">Configure how Stockly works for your business</p>
          </div>
        </div>
        
        <button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            hasChanges 
              ? 'bg-magenta-500 hover:bg-magenta-600 text-white' 
              : 'bg-white/5 text-theme-tertiary cursor-not-allowed'
          }`}
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          Save Changes
        </button>
      </div>

      {hasChanges && (
        <div className="mb-4 px-4 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-yellow-400" />
          <span className="text-yellow-400 text-sm">You have unsaved changes</span>
        </div>
      )}

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-56 shrink-0">
          <nav className="space-y-1">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeSection === section.id
                    ? 'bg-magenta-500/10 text-magenta-400'
                    : 'text-theme-tertiary hover:text-white hover:bg-white/5'
                }`}
              >
                <section.icon className="w-5 h-5" />
                {section.label}
                {activeSection === section.id && (
                  <ChevronRight className="w-4 h-4 ml-auto" />
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
          {/* GP & Costing */}
          {activeSection === 'costing' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-theme-primary mb-1">GP & Costing</h2>
                <p className="text-theme-tertiary text-sm">Default targets for gross profit and pricing</p>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-2">Default GP Target</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={settings.default_gp_target}
                      onChange={(e) => updateSetting('default_gp_target', parseFloat(e.target.value) || 70)}
                      className="w-full px-3 py-2 pr-8 bg-white/5 border border-white/10 rounded-lg text-theme-primary focus:outline-none focus:border-magenta-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-tertiary">%</span>
                  </div>
                  <p className="text-theme-tertiary text-xs mt-1">Used as default when creating new recipes</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-2">Default VAT Rate</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={settings.default_vat_rate}
                      onChange={(e) => updateSetting('default_vat_rate', parseFloat(e.target.value) || 20)}
                      className="w-full px-3 py-2 pr-8 bg-white/5 border border-white/10 rounded-lg text-theme-primary focus:outline-none focus:border-magenta-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-tertiary">%</span>
                  </div>
                  <p className="text-theme-tertiary text-xs mt-1">Applied to deliveries and pricing calculations</p>
                </div>
              </div>
            </div>
          )}

          {/* Staff Purchases */}
          {activeSection === 'staff' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-theme-primary mb-1">Staff Purchases</h2>
                <p className="text-theme-tertiary text-sm">Control staff discount and payment options</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-theme-secondary mb-2">Default Staff Discount</label>
                <div className="flex flex-wrap gap-2">
                  {[0, 25, 50, 75, 100].map(discount => (
                    <button
                      key={discount}
                      onClick={() => updateSetting('staff_default_discount', discount)}
                      className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                        settings.staff_default_discount === discount
                          ? 'bg-magenta-500/20 text-magenta-400 border border-magenta-500/50'
                          : 'bg-white/5 text-theme-tertiary border border-transparent hover:bg-white/10'
                      }`}
                    >
                      {discount === 0 ? 'Full Price' : discount === 100 ? 'At Cost' : `${discount}% Off`}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-theme-secondary mb-2">Allowed Payment Methods</label>
                <div className="flex flex-wrap gap-2">
                  {PAYMENT_METHOD_OPTIONS.map(method => (
                    <button
                      key={method.value}
                      onClick={() => togglePaymentMethod(method.value)}
                      className={`px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors ${
                        settings.staff_payment_methods.includes(method.value)
                          ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                          : 'bg-white/5 text-theme-tertiary border border-transparent hover:bg-white/10'
                      }`}
                    >
                      <span>{method.icon}</span>
                      {method.label}
                      {settings.staff_payment_methods.includes(method.value) && (
                        <Check className="w-4 h-4" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-theme-secondary mb-2">Require Approval Above</label>
                <div className="flex items-center gap-3">
                  <div className="relative flex-1 max-w-xs">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-tertiary">£</span>
                    <input
                      type="number"
                      value={settings.staff_approval_threshold || ''}
                      onChange={(e) => updateSetting('staff_approval_threshold', e.target.value ? parseFloat(e.target.value) : null)}
                      placeholder="No limit"
                      className="w-full pl-7 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-theme-primary placeholder:text-theme-disabled focus:outline-none focus:border-magenta-500"
                    />
                  </div>
                  <span className="text-theme-tertiary text-sm">Leave empty for no approval required</span>
                </div>
              </div>
            </div>
          )}

          {/* Alerts */}
          {activeSection === 'alerts' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-theme-primary mb-1">Alerts</h2>
                <p className="text-theme-tertiary text-sm">Configure when to show warnings</p>
              </div>
              
              <div className="space-y-4">
                <label className="flex items-center justify-between p-4 bg-white/[0.02] rounded-lg cursor-pointer">
                  <div>
                    <span className="text-theme-primary font-medium">Low Stock Alerts</span>
                    <p className="text-theme-tertiary text-sm">Warn when items fall below threshold</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.enable_low_stock_alerts}
                    onChange={(e) => updateSetting('enable_low_stock_alerts', e.target.checked)}
                    className="w-5 h-5 rounded border-white/20 bg-white/5 text-magenta-500 focus:ring-magenta-500"
                  />
                </label>
                
                {settings.enable_low_stock_alerts && (
                  <div className="ml-4">
                    <label className="block text-sm font-medium text-theme-secondary mb-2">Low Stock Threshold</label>
                    <div className="relative max-w-xs">
                      <input
                        type="number"
                        value={settings.low_stock_threshold_percent}
                        onChange={(e) => updateSetting('low_stock_threshold_percent', parseFloat(e.target.value) || 20)}
                        className="w-full px-3 py-2 pr-20 bg-white/5 border border-white/10 rounded-lg text-theme-primary focus:outline-none focus:border-magenta-500"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-tertiary">% of reorder point</span>
                    </div>
                  </div>
                )}
                
                <label className="flex items-center justify-between p-4 bg-white/[0.02] rounded-lg cursor-pointer">
                  <div>
                    <span className="text-theme-primary font-medium">Expiry Alerts</span>
                    <p className="text-theme-tertiary text-sm">Warn before items expire</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.enable_expiry_alerts}
                    onChange={(e) => updateSetting('enable_expiry_alerts', e.target.checked)}
                    className="w-5 h-5 rounded border-white/20 bg-white/5 text-magenta-500 focus:ring-magenta-500"
                  />
                </label>
                
                {settings.enable_expiry_alerts && (
                  <div className="ml-4">
                    <label className="block text-sm font-medium text-theme-secondary mb-2">Days Before Expiry</label>
                    <div className="relative max-w-xs">
                      <input
                        type="number"
                        value={settings.expiry_warning_days}
                        onChange={(e) => updateSetting('expiry_warning_days', parseInt(e.target.value) || 3)}
                        className="w-full px-3 py-2 pr-12 bg-white/5 border border-white/10 rounded-lg text-theme-primary focus:outline-none focus:border-magenta-500"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-tertiary">days</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Stock Counts */}
          {activeSection === 'counts' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-theme-primary mb-1">Stock Counts</h2>
                <p className="text-theme-tertiary text-sm">Configure counting and variance thresholds</p>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-2">Variance Alert Threshold</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      value={settings.variance_alert_threshold_percent}
                      onChange={(e) => updateSetting('variance_alert_threshold_percent', parseFloat(e.target.value) || 5)}
                      className="w-full px-3 py-2 pr-8 bg-white/5 border border-white/10 rounded-lg text-theme-primary focus:outline-none focus:border-magenta-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-tertiary">%</span>
                  </div>
                  <p className="text-theme-tertiary text-xs mt-1">Alert when variance exceeds this</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-2">Auto-Approve Under</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      value={settings.auto_approve_variance_percent}
                      onChange={(e) => updateSetting('auto_approve_variance_percent', parseFloat(e.target.value) || 2)}
                      className="w-full px-3 py-2 pr-8 bg-white/5 border border-white/10 rounded-lg text-theme-primary focus:outline-none focus:border-magenta-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-tertiary">%</span>
                  </div>
                  <p className="text-theme-tertiary text-xs mt-1">Auto-approve counts with tiny variances</p>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-theme-secondary mb-2">Count Reminder Frequency</label>
                <div className="flex flex-wrap gap-2">
                  {COUNT_FREQUENCY_OPTIONS.map(option => (
                    <button
                      key={option.value}
                      onClick={() => updateSetting('count_reminder_frequency', option.value)}
                      className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                        settings.count_reminder_frequency === option.value
                          ? 'bg-magenta-500/20 text-magenta-400 border border-magenta-500/50'
                          : 'bg-white/5 text-theme-tertiary border border-transparent hover:bg-white/10'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Waste */}
          {activeSection === 'waste' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-theme-primary mb-1">Waste Recording</h2>
                <p className="text-theme-tertiary text-sm">Configure wastage categories and requirements</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-theme-secondary mb-2">Waste Reasons</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {settings.waste_reasons.map(reason => (
                    <span
                      key={reason}
                      className="px-3 py-1.5 bg-white/5 rounded-lg text-theme-secondary text-sm flex items-center gap-2"
                    >
                      {reason.charAt(0).toUpperCase() + reason.slice(1)}
                      <button
                        onClick={() => removeWasteReason(reason)}
                        className="text-theme-tertiary hover:text-red-400"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2 max-w-sm">
                  <input
                    type="text"
                    value={newWasteReason}
                    onChange={(e) => setNewWasteReason(e.target.value)}
                    placeholder="Add new reason..."
                    className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-theme-primary placeholder:text-theme-disabled focus:outline-none focus:border-magenta-500"
                    onKeyDown={(e) => e.key === 'Enter' && addWasteReason()}
                  />
                  <button
                    onClick={addWasteReason}
                    className="px-3 py-2 bg-white/5 hover:bg-white/10 text-theme-primary rounded-lg"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              <label className="flex items-center justify-between p-4 bg-white/[0.02] rounded-lg cursor-pointer">
                <div>
                  <span className="text-theme-primary font-medium">Require Notes</span>
                  <p className="text-theme-tertiary text-sm">Force staff to add notes when recording waste</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.require_waste_notes}
                  onChange={(e) => updateSetting('require_waste_notes', e.target.checked)}
                  className="w-5 h-5 rounded border-white/20 bg-white/5 text-magenta-500 focus:ring-magenta-500"
                />
              </label>
            </div>
          )}

          {/* Categories */}
          {activeSection === 'categories' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-theme-primary mb-1">Menu Categories</h2>
                <p className="text-theme-tertiary text-sm">Categories used for recipes and reporting</p>
              </div>
              
              <div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {settings.menu_categories.map(cat => (
                    <span
                      key={cat}
                      className="px-3 py-1.5 bg-white/5 rounded-lg text-theme-secondary text-sm flex items-center gap-2"
                    >
                      {cat}
                      <button
                        onClick={() => removeCategory(cat)}
                        className="text-theme-tertiary hover:text-red-400"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2 max-w-sm">
                  <input
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="Add new category..."
                    className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-theme-primary placeholder:text-theme-disabled focus:outline-none focus:border-magenta-500"
                    onKeyDown={(e) => e.key === 'Enter' && addCategory()}
                  />
                  <button
                    onClick={addCategory}
                    className="px-3 py-2 bg-white/5 hover:bg-white/10 text-theme-primary rounded-lg"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Display */}
          {activeSection === 'display' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-theme-primary mb-1">Display Preferences</h2>
                <p className="text-theme-tertiary text-sm">How dates and data are shown</p>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-2">Date Format</label>
                  <select
                    value={settings.date_format}
                    onChange={(e) => updateSetting('date_format', e.target.value)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-theme-primary focus:outline-none focus:border-magenta-500"
                  >
                    <option value="DD/MM/YYYY">DD/MM/YYYY (UK)</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY (US)</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD (ISO)</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-2">Week Starts On</label>
                  <select
                    value={settings.week_start_day}
                    onChange={(e) => updateSetting('week_start_day', e.target.value)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-theme-primary focus:outline-none focus:border-magenta-500"
                  >
                    <option value="monday">Monday</option>
                    <option value="sunday">Sunday</option>
                    <option value="saturday">Saturday</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-theme-secondary mb-2">Default Report Period</label>
                <div className="flex flex-wrap gap-2">
                  {[7, 14, 30, 90].map(days => (
                    <button
                      key={days}
                      onClick={() => updateSetting('default_report_days', days)}
                      className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                        settings.default_report_days === days
                          ? 'bg-magenta-500/20 text-magenta-400 border border-magenta-500/50'
                          : 'bg-white/5 text-theme-tertiary border border-transparent hover:bg-white/10'
                      }`}
                    >
                      {days} days
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
