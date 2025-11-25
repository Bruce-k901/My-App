"use client";

import { useState, useEffect } from "react";
import { useAppContext } from "@/context/AppContext";
import { supabase } from "@/lib/supabase";
import { format, differenceInDays } from "date-fns";
import { 
  CreditCard, 
  Calendar, 
  Download, 
  AlertCircle, 
  CheckCircle2, 
  Clock,
  FileText,
  Loader2,
  Package,
  Settings,
  Sparkles,
  Shield,
  Zap,
  Plus,
  Edit,
  Trash2,
  X,
  ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui";
import { toast } from "sonner";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { useBillingData } from "@/hooks/useBillingData";
import { CostBreakdown } from "@/components/billing/CostBreakdown";

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface Subscription {
  id: string;
  company_id: string;
  plan_id: string;
  plan: {
    name: string;
    display_name: string;
    price_per_site_monthly: number;
    pricing_model?: 'per_site' | 'flat_rate' | 'custom';
    flat_rate_price?: number | null;
    features: string[];
  };
  trial_started_at: string;
  trial_ends_at: string;
  trial_used: boolean;
  status: 'trial' | 'active' | 'expired' | 'cancelled' | 'past_due';
  subscription_started_at: string | null;
  subscription_ends_at: string | null;
  cancelled_at: string | null;
  site_count: number;
  monthly_amount: number;
  billing_email: string | null;
  payment_method: string;
}

interface Plan {
  id: string;
  name: string;
  display_name: string;
  price_per_site_monthly: number;
  pricing_model: 'per_site' | 'flat_rate' | 'custom';
  flat_rate_price: number | null;
  features: string[];
}

interface Addon {
  id: string;
  name: string;
  display_name: string;
  description: string;
  price: number;
  price_type: 'one_time' | 'monthly' | 'per_site_one_time' | 'per_site_monthly';
  category: string;
  features: string[];
  hardware_cost?: number | null;
  monthly_management_cost?: number | null;
}

interface PurchasedAddon {
  id: string;
  addon_id: string;
  addon: Addon;
  quantity: number;
  total_price: number;
  status: 'active' | 'cancelled' | 'expired';
  hardware_cost_total?: number;
  monthly_recurring_cost?: number;
}

interface PaymentMethod {
  id: string;
  type: 'card';
  card: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
  is_default: boolean;
}

export default function BillingPage() {
  console.log('Billing Page Loaded - New Version');
  const { companyId, company, loading: contextLoading } = useAppContext();
  const { data, isLoading: billingLoading, mutate } = useBillingData(companyId);
  
  const [activeTab, setActiveTab] = useState<'overview' | 'plans' | 'addons' | 'payment'>('overview');

  const subscription = data?.subscription || null;
  const plans = data?.plans || [];
  const addons = data?.addons || [];
  const purchasedAddons = data?.purchasedAddons || [];
  const paymentMethods = data?.paymentMethods || [];
  const siteCount = data?.siteCount || 0;
  const sites = data?.sites || [];
  const invoices = data?.invoices || [];

  function getTrialDaysRemaining() {
    if (!subscription || subscription.status !== 'trial') return null;
    const days = differenceInDays(new Date(subscription.trial_ends_at), new Date());
    return Math.max(0, days);
  }

  const trialDaysRemaining = getTrialDaysRemaining();
  const isTrialActive = subscription?.status === 'trial' && trialDaysRemaining !== null && trialDaysRemaining > 0;


  if (contextLoading || billingLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-pink-400" />
      </div>
    );
  }

  if (!companyId) {
    return (
      <div className="p-8">
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
          <p className="text-white/60 text-center">Please complete company setup to view billing information.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Billing & Subscription</h1>
            <p className="text-white/60">Manage your plan, add-ons, and payment methods</p>
          </div>
          <Button
            onClick={() => window.location.href = '/pricing'}
            variant="outline"
            className="border-pink-500/50 text-pink-400 hover:bg-pink-500/10"
          >
            View All Plans
          </Button>
        </div>

        {/* Trial Banner */}
        {isTrialActive && (
          <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-2xl p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-500/20 rounded-xl">
                <Clock className="w-6 h-6 text-blue-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white mb-2">
                  {trialDaysRemaining} Days Left in Your Free Trial
                </h3>
                <p className="text-white/80 mb-4">
                  Your 60-day trial ends on {format(new Date(subscription.trial_ends_at), 'MMMM dd, yyyy')}. 
                  Add a payment method to continue using Checkly after your trial.
                </p>
                <Button
                  onClick={() => setActiveTab('payment')}
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                >
                  Add Payment Method
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 border-b border-white/10 pb-2">
          <TabButton
            active={activeTab === 'overview'}
            onClick={() => setActiveTab('overview')}
            icon={Settings}
            label="Overview"
          />
          <TabButton
            active={activeTab === 'plans'}
            onClick={() => setActiveTab('plans')}
            icon={Package}
            label="Plans"
          />
          <TabButton
            active={activeTab === 'addons'}
            onClick={() => setActiveTab('addons')}
            icon={Sparkles}
            label="Add-ons"
          />
          <TabButton
            active={activeTab === 'payment'}
            onClick={() => setActiveTab('payment')}
            icon={CreditCard}
            label="Payment"
          />
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <OverviewTab
            subscription={subscription}
            siteCount={siteCount}
            sites={sites}
            purchasedAddons={purchasedAddons}
            paymentMethods={paymentMethods}
            plans={plans}
            invoices={invoices}
            companyId={companyId}
          />
        )}

        {activeTab === 'plans' && (
          <PlansTab
            plans={plans}
            currentPlanId={subscription?.plan_id || null}
            siteCount={siteCount}
            companyId={companyId}
            onPlanChanged={() => mutate()}
          />
        )}

        {activeTab === 'addons' && (
          <AddonsTab
            addons={addons}
            purchasedAddons={purchasedAddons}
            siteCount={siteCount}
            companyId={companyId}
            onAddonChanged={() => mutate()}
          />
        )}

        {activeTab === 'payment' && (
          <PaymentTab
            paymentMethods={paymentMethods}
            companyId={companyId}
            onPaymentMethodChanged={() => mutate()}
          />
        )}
      </div>
    </div>
  );
}

// Tab Button Component
function TabButton({ active, onClick, icon: Icon, label }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
        active
          ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/50'
          : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
      }`}
    >
      <Icon className="w-5 h-5" />
      {label}
    </button>
  );
}

// Overview Tab
function OverviewTab({ subscription, siteCount, sites, purchasedAddons, paymentMethods, plans, invoices, companyId }: any) {
  return (
    <div className="space-y-6">
      {/* Current Plan Card */}
      <div className="bg-gradient-to-br from-white/10 to-white/5 border border-white/10 rounded-2xl p-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Current Plan</h2>
            {subscription && (
              <div className="flex items-center gap-3">
                <span className="text-3xl font-bold text-pink-400">
                  {subscription.plan.display_name}
                </span>
                <StatusBadge status={subscription.status} />
              </div>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            label="Active Sites"
            value={siteCount}
            icon={Package}
            color="blue"
            expandable={siteCount > 0}
            expandedContent={
              <div className="space-y-2">
                {sites.map((site: any) => (
                  <div key={site.id} className="flex items-center justify-between text-sm text-white/80 bg-white/5 p-2 rounded">
                    <span>{site.name}</span>
                    <CheckCircle2 className="w-3 h-3 text-green-400" />
                  </div>
                ))}
              </div>
            }
          />
          
          {/* New Cost Breakdown Component */}
          <div className="md:col-span-2">
             <CostBreakdown 
               subscription={subscription}
               siteCount={siteCount}
               purchasedAddons={purchasedAddons}
               plans={plans}
             />
          </div>
        </div>

        {/* Payment Method */}
        <div className="mt-6 pt-6 border-t border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/60 mb-1">Payment Method</p>
              {paymentMethods && paymentMethods.length > 0 && paymentMethods[0]?.card ? (
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-white/60" />
                  <span className="text-white font-medium">
                    {paymentMethods[0].card.brand} •••• {paymentMethods[0].card.last4}
                  </span>
                </div>
              ) : (
                <span className="text-white/40">No payment method added</span>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-white/20 text-white hover:bg-white/10"
            >
              Manage
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <QuickActionCard
          title="Download Data Export"
          description="Export all your company data for backup or migration"
          icon={Download}
          buttonText="Request Export"
          onClick={async () => {
            try {
              const response = await fetch(`/api/billing/export?company_id=${companyId}`);
              if (!response.ok) throw new Error('Export failed');
              const blob = await response.blob();
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `company-export-${new Date().toISOString().split('T')[0]}.json`;
              document.body.appendChild(a);
              a.click();
              window.URL.revokeObjectURL(url);
              document.body.removeChild(a);
              toast.success('Data exported successfully!');
            } catch (error) {
              toast.error('Failed to export data');
            }
          }}
        />
        <QuickActionCard
          title="View Invoice History"
          description={`${invoices.length} invoice${invoices.length !== 1 ? 's' : ''} available`}
          icon={FileText}
          buttonText="View Invoices"
          onClick={() => {
            if (invoices.length === 0) {
              toast.info('No invoices available yet');
            } else {
              // For now, show a simple list in a toast
              toast.info(`You have ${invoices.length} invoice(s). Full invoice viewer coming soon!`);
            }
          }}
        />
      </div>
    </div>
  );
}

// Plans Tab
function PlansTab({ plans, currentPlanId, siteCount, companyId, onPlanChanged }: any) {
  const [changing, setChanging] = useState<string | null>(null);

  async function handleChangePlan(planId: string) {
    setChanging(planId);
    try {
      const response = await fetch('/api/billing/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          company_id: companyId, 
          plan_id: planId,
          success_url: window.location.href,
          cancel_url: window.location.href
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to start checkout');
      }

      const { url } = await response.json();
      
      if (url) {
        window.location.href = url;
      } else {
        throw new Error('No checkout URL returned');
      }

    } catch (error: any) {
      console.error('Checkout error:', error);
      toast.error(error.message);
      setChanging(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Choose Your Plan</h2>
        <p className="text-white/60">
          Select the plan that best fits your needs. You can change plans at any time.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan: Plan) => {
          const isCurrent = plan.id === currentPlanId;
          const isChanging = changing === plan.id;
          const monthlyPrice = plan.price_per_site_monthly * siteCount;

          return (
            <PlanCard
              key={plan.id}
              plan={plan}
              isCurrent={isCurrent}
              isChanging={isChanging}
              monthlyPrice={monthlyPrice}
              siteCount={siteCount}
              onSelect={() => handleChangePlan(plan.id)}
            />
          );
        })}
      </div>
    </div>
  );
}

// Payment Tab with Stripe Elements
function PaymentTab({ paymentMethods, companyId, onPaymentMethodChanged }: any) {
  const [isAdding, setIsAdding] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loadingSecret, setLoadingSecret] = useState(false);

  async function startAdding() {
    setIsAdding(true);
    setLoadingSecret(true);
    try {
      const response = await fetch('/api/billing/stripe/setup-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: companyId }),
      });

      if (!response.ok) {
        throw new Error('Failed to initialize payment setup');
      }

      const { clientSecret } = await response.json();
      setClientSecret(clientSecret);
    } catch (error) {
      console.error('Error starting payment setup:', error);
      toast.error('Failed to start payment setup');
      setIsAdding(false);
    } finally {
      setLoadingSecret(false);
    }
  }

  function cancelAdding() {
    setIsAdding(false);
    setClientSecret(null);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Payment Methods</h2>
        <p className="text-white/60">
          Manage your credit cards and payment details.
        </p>
      </div>

      {/* List Existing Methods */}
      <div className="space-y-4">
        {paymentMethods.map((method: PaymentMethod) => (
          <PaymentMethodCard key={method.id} method={method} />
        ))}
      </div>

      {/* Add New Method */}
      {!isAdding ? (
        <Button
          onClick={startAdding}
          className="bg-pink-500 hover:bg-pink-600 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Payment Method
        </Button>
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-white">Add New Card</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={cancelAdding}
              className="text-white/60 hover:text-white"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {loadingSecret ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-pink-400" />
            </div>
          ) : clientSecret ? (
            <Elements stripe={stripePromise} options={{ 
              clientSecret, 
              appearance: { 
                theme: 'night',
                variables: {
                  colorPrimary: '#ec4899',
                  colorBackground: '#1f2937',
                  colorText: '#ffffff',
                }
              } 
            }}>
              <AddPaymentForm 
                onSuccess={() => {
                  setIsAdding(false);
                  setClientSecret(null);
                  onPaymentMethodChanged();
                }}
                onCancel={cancelAdding}
              />
            </Elements>
          ) : (
            <div className="text-red-400 text-center py-4">
              Failed to load payment form. Please try again.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AddPaymentForm({ onSuccess, onCancel }: any) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const result = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: window.location.href,
        },
        redirect: 'if_required',
      });

      if (result.error) {
        throw new Error(result.error.message);
      }

      toast.success('Payment method added successfully!');
      onSuccess();

    } catch (err: any) {
      console.error('Payment setup error:', err);
      setError(err.message || 'Failed to add payment method');
    } finally {
      setProcessing(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <p className="text-sm text-red-200">{error}</p>
        </div>
      )}

      <div className="flex gap-3">
        <Button
          type="submit"
          disabled={!stripe || processing}
          className="bg-pink-500 hover:bg-pink-600 text-white flex-1"
        >
          {processing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Payment Method'
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={processing}
          className="border-white/20 text-white hover:bg-white/10"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

// Helper Components
function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; color: string }> = {
    trial: { label: 'Trial', color: 'bg-blue-500/20 text-blue-400 border-blue-500/40' },
    active: { label: 'Active', color: 'bg-green-500/20 text-green-400 border-green-500/40' },
    expired: { label: 'Expired', color: 'bg-red-500/20 text-red-400 border-red-500/40' },
    cancelled: { label: 'Cancelled', color: 'bg-gray-500/20 text-gray-400 border-gray-500/40' },
    past_due: { label: 'Past Due', color: 'bg-orange-500/20 text-orange-400 border-orange-500/40' },
  };

  const { label, color } = config[status] || config.trial;

  return (
    <span className={`px-3 py-1 rounded-full text-sm font-medium border ${color}`}>
      {label}
    </span>
  );
}

function StatCard({ label, value, icon: Icon, color, subtitle, expandable, expandedContent }: any) {
  const [expanded, setExpanded] = useState(false);
  const colors: Record<string, string> = {
    blue: 'from-blue-500/20 to-blue-500/5 border-blue-500/30',
    pink: 'from-pink-500/20 to-pink-500/5 border-pink-500/30',
    purple: 'from-purple-500/20 to-purple-500/5 border-purple-500/30',
  };

  return (
    <div 
      className={`bg-gradient-to-br ${colors[color]} border rounded-xl p-6 transition-all ${expandable ? 'cursor-pointer hover:bg-white/5' : ''}`}
      onClick={() => expandable && setExpanded(!expanded)}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5 text-white/60" />
          <p className="text-sm text-white/60 uppercase tracking-wide">{label}</p>
        </div>
        {expandable && (
          <ChevronDown className={`w-4 h-4 text-white/40 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        )}
      </div>
      <p className="text-3xl font-bold text-white">
        {value}
        {subtitle && <span className="text-lg text-white/60 ml-1">{subtitle}</span>}
      </p>
      
      {expanded && expandedContent && (
        <div className="mt-4 pt-4 border-t border-white/10 animate-in fade-in slide-in-from-top-2">
          {expandedContent}
        </div>
      )}
    </div>
  );
}

function QuickActionCard({ title, description, icon: Icon, buttonText, onClick }: any) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-white/10 rounded-lg">
          <Icon className="w-6 h-6 text-white/80" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
          <p className="text-sm text-white/60 mb-4">{description}</p>
          <Button
            onClick={onClick}
            variant="outline"
            size="sm"
            className="border-white/20 text-white hover:bg-white/10"
          >
            {buttonText}
          </Button>
        </div>
      </div>
    </div>
  );
}

function PlanCard({ plan, isCurrent, isChanging, monthlyPrice, siteCount, onSelect }: any) {
  const icons: Record<string, any> = {
    starter: Zap,
    pro: Sparkles,
    enterprise: Shield,
  };

  const Icon = icons[plan.name] || Package;

  return (
    <div
      className={`bg-gradient-to-br from-white/10 to-white/5 border rounded-2xl p-6 transition-all ${
        isCurrent
          ? 'border-pink-500 shadow-lg shadow-pink-500/20'
          : 'border-white/10 hover:border-pink-500/50'
      }`}
    >
      {isCurrent && (
        <div className="bg-pink-500 text-white text-xs font-bold px-3 py-1 rounded-full inline-block mb-4">
          CURRENT PLAN
        </div>
      )}

      <div className="flex items-center gap-3 mb-4">
        <div className="p-3 bg-pink-500/20 rounded-xl">
          <Icon className="w-6 h-6 text-pink-400" />
        </div>
        <h3 className="text-2xl font-bold text-white">{plan.display_name}</h3>
      </div>

      <div className="mb-6">
        <p className="text-4xl font-bold text-white mb-1">
          £{monthlyPrice.toFixed(2)}
        </p>
        <p className="text-sm text-white/60">
          £{plan.price_per_site_monthly}/site × {siteCount} sites
        </p>
      </div>

      <ul className="space-y-2 mb-6">
        {plan.features.map((feature: string, i: number) => (
          <li key={i} className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
            <span className="text-sm text-white/80">{feature}</span>
          </li>
        ))}
      </ul>

      <Button
        onClick={onSelect}
        disabled={isCurrent || isChanging}
        fullWidth
        className={
          isCurrent
            ? 'bg-white/10 text-white/60 cursor-not-allowed'
            : 'bg-pink-500 hover:bg-pink-600 text-white'
        }
      >
        {isChanging ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Changing...
          </>
        ) : isCurrent ? (
          'Current Plan'
        ) : (
          'Select Plan'
        )}
      </Button>
    </div>
  );
}



function PurchasedAddonCard({ addon, onRemove, isRemoving }: { addon: PurchasedAddon, onRemove: () => void, isRemoving: boolean }) {
  return (
    <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/30 rounded-xl p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-white mb-1">{addon.addon.display_name}</h3>
          <p className="text-sm text-white/60">{addon.addon.description}</p>
        </div>
        <CheckCircle2 className="w-5 h-5 text-green-400" />
      </div>
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-xl font-bold text-white">
            £{addon.total_price.toFixed(2)}
          </span>
          {addon.quantity > 1 && (
            <span className="text-xs text-white/60">
              Qty: {addon.quantity}
            </span>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={onRemove}
          disabled={isRemoving}
          className="border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300"
        >
          {isRemoving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            'Remove'
          )}
        </Button>
      </div>
    </div>
  );
}

function PaymentMethodCard({ method }: { method: PaymentMethod }) {
  const getBrandDisplay = (brand: string) => {
    const brandMap: Record<string, string> = {
      visa: 'Visa',
      mastercard: 'Mastercard',
      amex: 'American Express',
      discover: 'Discover',
      jcb: 'JCB',
      diners: 'Diners Club',
      unionpay: 'UnionPay',
    };
    return brandMap[brand.toLowerCase()] || brand.charAt(0).toUpperCase() + brand.slice(1);
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between hover:bg-white/10 transition-all">
      <div className="flex items-center gap-4">
        <div className="p-2 bg-white/10 rounded-lg">
          <CreditCard className="w-6 h-6 text-white" />
        </div>
        <div>
          <p className="text-white font-medium">
            {getBrandDisplay(method.card.brand)} •••• {method.card.last4}
          </p>
          <p className="text-sm text-white/60">
            Expires {String(method.card.exp_month).padStart(2, '0')}/{String(method.card.exp_year).slice(-2)}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {method.is_default && (
          <span className="text-xs bg-pink-500/20 text-pink-400 px-2 py-1 rounded-full border border-pink-500/30">
            Default
          </span>
        )}
        <CheckCircle2 className="w-5 h-5 text-green-400" title="Payment method verified" />
      </div>
    </div>
  );
}
