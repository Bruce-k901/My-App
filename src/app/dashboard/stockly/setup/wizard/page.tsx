'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Check, ChevronLeft, ChevronRight, Loader2, Factory, Store, ShoppingCart, Package, TrendingUp } from '@/components/ui/icons';
import { getSupabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { SiteConfig, TransferPricingMethod } from '@/types/library.types';

type SiteType = 'single_location' | 'multi_site_group' | 'production_facility' | 'hybrid';

interface WizardState {
  // Step 1: Site Type
  siteType: SiteType;
  siteName: string;

  // Step 2: Stock Sources
  receivesSupplierDeliveries: boolean;
  receivesInternalTransfers: boolean;
  producesItems: boolean;

  // Step 3: Sales Channels
  sellsWholesale: boolean;
  sellsRetail: boolean;
  sellsOnline: boolean;
  sellsInternal: boolean;

  // Step 4: Production (conditional)
  productionRecipes: string[];

  // Step 5: Transfer Pricing (conditional)
  transferPricingMethod: TransferPricingMethod;
  transferMarkupPercentage: number;
}

const INITIAL_STATE: WizardState = {
  siteType: 'single_location',
  siteName: '',
  receivesSupplierDeliveries: true,
  receivesInternalTransfers: false,
  producesItems: false,
  sellsWholesale: false,
  sellsRetail: true,
  sellsOnline: false,
  sellsInternal: false,
  productionRecipes: [],
  transferPricingMethod: 'cost_plus_markup',
  transferMarkupPercentage: 15,
};

export default function StocklySetupWizardPage() {
  const router = useRouter();
  const { siteId, companyId, profile } = useAppContext();
  const [step, setStep] = useState(1);
  const [state, setState] = useState<WizardState>(INITIAL_STATE);
  const [saving, setSaving] = useState(false);
  const [siteName, setSiteName] = useState('');
  const [existingConfig, setExistingConfig] = useState<SiteConfig | null>(null);

  const totalSteps = state.producesItems || state.sellsInternal ? 5 : 3;

  useEffect(() => {
    if (siteId && siteId !== 'all') {
      loadSiteInfo();
      loadExistingConfig();
    }
  }, [siteId]);

  async function loadSiteInfo() {
    const supabase = getSupabase();
    const { data } = await supabase
      .from('sites')
      .select('name')
      .eq('id', siteId)
      .single();

    if (data) {
      setSiteName(data.name);
      setState(prev => ({ ...prev, siteName: data.name }));
    }
  }

  async function loadExistingConfig() {
    const supabase = getSupabase();
    const { data } = await supabase
      .from('site_config')
      .select('*')
      .eq('site_id', siteId)
      .single();

    if (data && data.setup_completed) {
      setExistingConfig(data as SiteConfig);
      // Populate wizard with existing config
      setState({
        siteType: data.produces_items && data.sells_internal ? 'production_facility'
          : data.produces_items && data.sells_retail ? 'hybrid'
          : 'single_location',
        siteName: siteName,
        receivesSupplierDeliveries: data.receives_supplier_deliveries,
        receivesInternalTransfers: data.receives_internal_transfers,
        producesItems: data.produces_items,
        sellsWholesale: data.sells_wholesale,
        sellsRetail: data.sells_retail,
        sellsOnline: data.sells_online,
        sellsInternal: data.sells_internal,
        productionRecipes: data.production_recipe_ids || [],
        transferPricingMethod: data.transfer_pricing_method,
        transferMarkupPercentage: data.transfer_markup_percentage,
      });
    }
  }

  // Wizard intelligence: Recommend configuration based on site type
  function applyRecommendedConfig(siteType: SiteType) {
    let recommended: Partial<WizardState> = {};

    switch (siteType) {
      case 'production_facility':
        recommended = {
          producesItems: true,
          sellsWholesale: true,
          sellsInternal: true,
          receivesSupplierDeliveries: true,
          sellsRetail: false,
          sellsOnline: false,
        };
        break;
      case 'hybrid':
        recommended = {
          producesItems: true,
          sellsRetail: true,
          receivesSupplierDeliveries: true,
          sellsInternal: false,
        };
        break;
      case 'multi_site_group':
        recommended = {
          receivesSupplierDeliveries: true,
          receivesInternalTransfers: true,
          sellsRetail: true,
          producesItems: false,
        };
        break;
      case 'single_location':
      default:
        recommended = {
          receivesSupplierDeliveries: true,
          sellsRetail: true,
          producesItems: false,
          receivesInternalTransfers: false,
          sellsInternal: false,
        };
        break;
    }

    setState(prev => ({ ...prev, ...recommended, siteType }));
  }

  async function saveConfiguration() {
    if (!siteId || siteId === 'all' || !companyId) {
      toast.error('Please select a specific site');
      return;
    }

    setSaving(true);

    try {
      const supabase = getSupabase();

      const configData = {
        site_id: siteId,
        company_id: companyId,
        receives_supplier_deliveries: state.receivesSupplierDeliveries,
        receives_internal_transfers: state.receivesInternalTransfers,
        produces_items: state.producesItems,
        sells_wholesale: state.sellsWholesale,
        sells_retail: state.sellsRetail,
        sells_online: state.sellsOnline,
        sells_internal: state.sellsInternal,
        production_recipe_ids: state.productionRecipes.length > 0 ? state.productionRecipes : null,
        transfer_pricing_method: state.transferPricingMethod,
        transfer_markup_percentage: state.transferMarkupPercentage,
        setup_completed: true,
        setup_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Upsert (insert or update)
      const { error } = await supabase
        .from('site_config')
        .upsert(configData, { onConflict: 'site_id' });

      if (error) throw error;

      toast.success('Stock flow configuration saved!', {
        description: `${siteName} is now configured`
      });

      router.push('/dashboard/stockly');
    } catch (error) {
      console.error('Error saving configuration:', error);
      toast.error('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  }

  if (!siteId || siteId === 'all') {
    return (
      <div className="container mx-auto py-12 max-w-2xl">
        <Card className="p-8 text-center">
          <Package className="h-12 w-12 mx-auto mb-4 text-theme-tertiary" />
          <h2 className="text-xl font-semibold text-theme-primary mb-2">
            Select a Site
          </h2>
          <p className="text-theme-tertiary">
            Please select a specific site from the site selector to configure its stock flow
          </p>
        </Card>
      </div>
    );
  }

  const canProceedStep1 = state.siteType !== null;
  const canProceedStep2 = true; // Stock sources can all be false if needed
  const canProceedStep3 = state.sellsRetail || state.sellsWholesale || state.sellsOnline || state.sellsInternal;

  return (
    <div className="container mx-auto py-6 max-w-3xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-theme-primary mb-2">
          Stock Flow Setup Wizard
        </h1>
        <p className="text-theme-tertiary">
          Configure how <span className="font-medium text-theme-secondary">{siteName}</span> manages stock and sales
        </p>
      </div>

      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {Array.from({ length: totalSteps }, (_, i) => i + 1).map(s => (
            <div key={s} className="flex items-center">
              <div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors',
                  s < step
                    ? 'bg-module-fg text-white'
                    : s === step
                    ? 'bg-module-fg text-white'
                    : 'bg-gray-200 dark:bg-white/10 text-theme-tertiary'
                )}
              >
                {s < step ? <Check className="h-5 w-5" /> : s}
              </div>
              {s < totalSteps && (
                <div
                  className={cn(
                    'w-12 sm:w-16 h-1 mx-1 rounded',
                    s < step ? 'bg-module-fg' : 'bg-gray-200 dark:bg-white/10'
                  )}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-xs text-theme-tertiary">
          <span>Type</span>
          <span>Sources</span>
          <span>Sales</span>
          {(state.producesItems || state.sellsInternal) && (
            <>
              {state.producesItems && <span>Production</span>}
              {state.sellsInternal && <span>Pricing</span>}
            </>
          )}
        </div>
      </div>

      {/* Step Content */}
      <Card className="p-6 min-h-[400px]">
        {/* STEP 1: Site Type */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-theme-primary mb-2">
                What type of operation is this site?
              </h2>
              <p className="text-sm text-theme-tertiary">
                Choose the model that best describes {siteName}
              </p>
            </div>

            <div className="grid gap-4">
              <OptionCard
                icon={<Store className="h-6 w-6" />}
                title="Single Location Restaurant/Cafe"
                description="Receives stock from suppliers, prepares food, sells to customers"
                selected={state.siteType === 'single_location'}
                onClick={() => applyRecommendedConfig('single_location')}
              />
              <OptionCard
                icon={<ShoppingCart className="h-6 w-6" />}
                title="Multi-site Restaurant Group"
                description="Multiple venues that may share stock or receive from central warehouse"
                selected={state.siteType === 'multi_site_group'}
                onClick={() => applyRecommendedConfig('multi_site_group')}
              />
              <OptionCard
                icon={<Factory className="h-6 w-6" />}
                title="Production Facility (CPU)"
                description="Produces items to sell wholesale or supply other sites"
                selected={state.siteType === 'production_facility'}
                onClick={() => applyRecommendedConfig('production_facility')}
              />
              <OptionCard
                icon={<TrendingUp className="h-6 w-6" />}
                title="Hybrid (Production + Retail)"
                description="Produces items AND sells directly to customers (bakery, etc.)"
                selected={state.siteType === 'hybrid'}
                onClick={() => applyRecommendedConfig('hybrid')}
              />
            </div>
          </div>
        )}

        {/* STEP 2: Stock Sources */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-theme-primary mb-2">
                Where does stock come from?
              </h2>
              <p className="text-sm text-theme-tertiary">
                Select all sources that apply to {siteName}
              </p>
            </div>

            <div className="space-y-3">
              <CheckboxCard
                label="Receives supplier deliveries"
                description="Gets stock directly from external suppliers"
                checked={state.receivesSupplierDeliveries}
                onChange={(checked) => setState(prev => ({ ...prev, receivesSupplierDeliveries: checked }))}
              />
              <CheckboxCard
                label="Receives internal transfers"
                description="Gets stock from other sites in your company"
                checked={state.receivesInternalTransfers}
                onChange={(checked) => setState(prev => ({ ...prev, receivesInternalTransfers: checked }))}
              />
              <CheckboxCard
                label="Produces items"
                description="Makes items on-site from recipes (bakery, kitchen prep, etc.)"
                checked={state.producesItems}
                onChange={(checked) => setState(prev => ({ ...prev, producesItems: checked }))}
              />
            </div>
          </div>
        )}

        {/* STEP 3: Sales Channels */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-theme-primary mb-2">
                Who do you sell to?
              </h2>
              <p className="text-sm text-theme-tertiary">
                Select all sales channels that apply
              </p>
            </div>

            <div className="space-y-3">
              <CheckboxCard
                label="Wholesale customers"
                description="Sells to other businesses at wholesale prices"
                checked={state.sellsWholesale}
                onChange={(checked) => setState(prev => ({ ...prev, sellsWholesale: checked }))}
              />
              <CheckboxCard
                label="Retail customers"
                description="Sells directly to end customers (walk-in, dine-in)"
                checked={state.sellsRetail}
                onChange={(checked) => setState(prev => ({ ...prev, sellsRetail: checked }))}
              />
              <CheckboxCard
                label="Online/E-commerce"
                description="Sells through online ordering or delivery platforms"
                checked={state.sellsOnline}
                onChange={(checked) => setState(prev => ({ ...prev, sellsOnline: checked }))}
              />
              <CheckboxCard
                label="Internal (other sites)"
                description="Supplies other sites in your company"
                checked={state.sellsInternal}
                onChange={(checked) => setState(prev => ({ ...prev, sellsInternal: checked }))}
              />
            </div>
          </div>
        )}

        {/* STEP 4: Production Recipes (conditional) */}
        {step === 4 && state.producesItems && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-theme-primary mb-2">
                Production Setup
              </h2>
              <p className="text-sm text-theme-tertiary">
                Configure what items this site produces
              </p>
            </div>

            <div className="p-4 bg-blue-50 dark:bg-blue-500/10 rounded-lg border border-blue-200 dark:border-blue-500/20">
              <p className="text-sm text-blue-700 dark:text-blue-400">
                You can link specific recipes to this site later through the Recipes page.
                For now, we'll mark this site as having production capabilities.
              </p>
            </div>
          </div>
        )}

        {/* STEP 5: Transfer Pricing (conditional) */}
        {step === (state.producesItems ? 5 : 4) && state.sellsInternal && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-theme-primary mb-2">
                Internal Transfer Pricing
              </h2>
              <p className="text-sm text-theme-tertiary">
                How should internal transfers be priced?
              </p>
            </div>

            <div className="space-y-3">
              <RadioCard
                title="Cost + Markup %"
                description="Transfer at cost plus a percentage markup"
                selected={state.transferPricingMethod === 'cost_plus_markup'}
                onClick={() => setState(prev => ({ ...prev, transferPricingMethod: 'cost_plus_markup' }))}
              />
              {state.transferPricingMethod === 'cost_plus_markup' && (
                <div className="ml-8 mb-4">
                  <label className="text-sm text-theme-secondary mb-2 block">Markup Percentage</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={state.transferMarkupPercentage}
                      onChange={(e) => setState(prev => ({ ...prev, transferMarkupPercentage: parseFloat(e.target.value) || 0 }))}
                      className="w-24 px-3 py-2 border border-theme rounded-lg bg-theme-surface text-theme-primary"
                    />
                    <span className="text-theme-tertiary">%</span>
                  </div>
                </div>
              )}

              <RadioCard
                title="Wholesale Price"
                description="Use wholesale_price from ingredients library"
                selected={state.transferPricingMethod === 'wholesale_price'}
                onClick={() => setState(prev => ({ ...prev, transferPricingMethod: 'wholesale_price' }))}
              />

              <RadioCard
                title="Fixed Price"
                description="Set specific prices per item"
                selected={state.transferPricingMethod === 'fixed_price'}
                onClick={() => setState(prev => ({ ...prev, transferPricingMethod: 'fixed_price' }))}
              />
            </div>
          </div>
        )}

        {/* Final Review */}
        {step === totalSteps && !state.producesItems && !state.sellsInternal && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-theme-primary mb-2">
                Review Configuration
              </h2>
              <p className="text-sm text-theme-tertiary">
                Check your settings before saving
              </p>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-theme-button rounded-lg border border-theme">
                <h3 className="font-medium text-theme-primary mb-3">Stock Sources</h3>
                <ul className="space-y-2 text-sm">
                  {state.receivesSupplierDeliveries && <li className="flex items-center gap-2 text-theme-secondary"><Check className="h-4 w-4 text-green-500" /> Supplier deliveries</li>}
                  {state.receivesInternalTransfers && <li className="flex items-center gap-2 text-theme-secondary"><Check className="h-4 w-4 text-green-500" /> Internal transfers</li>}
                  {state.producesItems && <li className="flex items-center gap-2 text-theme-secondary"><Check className="h-4 w-4 text-green-500" /> Production</li>}
                </ul>
              </div>

              <div className="p-4 bg-theme-button rounded-lg border border-theme">
                <h3 className="font-medium text-theme-primary mb-3">Sales Channels</h3>
                <ul className="space-y-2 text-sm">
                  {state.sellsRetail && <li className="flex items-center gap-2 text-theme-secondary"><Check className="h-4 w-4 text-green-500" /> Retail</li>}
                  {state.sellsWholesale && <li className="flex items-center gap-2 text-theme-secondary"><Check className="h-4 w-4 text-green-500" /> Wholesale</li>}
                  {state.sellsOnline && <li className="flex items-center gap-2 text-theme-secondary"><Check className="h-4 w-4 text-green-500" /> Online</li>}
                  {state.sellsInternal && <li className="flex items-center gap-2 text-theme-secondary"><Check className="h-4 w-4 text-green-500" /> Internal (other sites)</li>}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-8 pt-6 border-t border-theme">
          <Button
            variant="outline"
            onClick={() => setStep(s => Math.max(1, s - 1))}
            disabled={step === 1}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>

          {step < totalSteps ? (
            <Button
              onClick={() => setStep(s => s + 1)}
              disabled={
                (step === 1 && !canProceedStep1) ||
                (step === 3 && !canProceedStep3)
              }
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={saveConfiguration} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Save Configuration
                </>
              )}
            </Button>
          )}
        </div>
      </Card>

      {existingConfig && (
        <div className="mt-4 text-center text-sm text-theme-tertiary">
          This site was previously configured. The wizard shows your current settings.
        </div>
      )}
    </div>
  );
}

// Helper Components

interface OptionCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}

function OptionCard({ icon, title, description, selected, onClick }: OptionCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full p-4 rounded-lg border-2 text-left transition-all',
        selected
          ? 'border-module-fg bg-module-fg/10'
          : 'border-theme hover:border-gray-300 dark:hover:border-white/30'
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          'p-2 rounded-lg',
          selected ? 'bg-module-fg/20 text-module-fg' : 'bg-theme-button text-theme-tertiary'
        )}>
          {icon}
        </div>
        <div className="flex-1">
          <h3 className="font-medium text-theme-primary mb-1">{title}</h3>
          <p className="text-sm text-theme-tertiary">{description}</p>
        </div>
        {selected && (
          <Check className="h-5 w-5 text-module-fg flex-shrink-0" />
        )}
      </div>
    </button>
  );
}

interface CheckboxCardProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function CheckboxCard({ label, description, checked, onChange }: CheckboxCardProps) {
  return (
    <label className={cn(
      'flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors',
      checked
        ? 'border-module-fg bg-module-fg/10'
        : 'border-theme hover:bg-theme-hover'
    )}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 w-5 h-5 rounded border-gray-300 text-module-fg focus:ring-module-fg"
      />
      <div className="flex-1">
        <div className="font-medium text-theme-primary mb-1">{label}</div>
        <div className="text-sm text-theme-tertiary">{description}</div>
      </div>
    </label>
  );
}

interface RadioCardProps {
  title: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}

function RadioCard({ title, description, selected, onClick }: RadioCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full p-4 rounded-lg border text-left transition-all',
        selected
          ? 'border-module-fg bg-module-fg/10'
          : 'border-theme hover:border-gray-300 dark:hover:border-white/30'
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5',
          selected ? 'border-module-fg' : 'border-gray-300'
        )}>
          {selected && <div className="w-3 h-3 rounded-full bg-module-fg" />}
        </div>
        <div className="flex-1">
          <h4 className="font-medium text-theme-primary mb-1">{title}</h4>
          <p className="text-sm text-theme-tertiary">{description}</p>
        </div>
      </div>
    </button>
  );
}
