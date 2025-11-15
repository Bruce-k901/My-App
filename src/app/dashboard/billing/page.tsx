"use client";

import { useState, useEffect } from "react";
import { useAppContext } from "@/context/AppContext";
import { supabase } from "@/lib/supabase";
import { format, differenceInDays, isAfter, isBefore } from "date-fns";
import { 
  CreditCard, 
  Calendar, 
  Download, 
  AlertCircle, 
  CheckCircle2, 
  Clock,
  FileText,
  ExternalLink,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui";
import Link from "next/link";

interface Subscription {
  id: string;
  company_id: string;
  plan_id: string;
  plan: {
    name: string;
    display_name: string;
    price_per_site_monthly: number;
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
}

interface Invoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  total_amount: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  paid_at: string | null;
  billing_period_start: string;
  billing_period_end: string;
}

export default function BillingPage() {
  const { companyId, company, loading: contextLoading } = useAppContext();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (companyId && !contextLoading) {
      loadBillingData();
    }
  }, [companyId, contextLoading]);

  async function loadBillingData() {
    if (!companyId) return;
    
    setLoading(true);
    setError(null);

    try {
      // Load subscription
      const { data: subData, error: subError } = await supabase
        .from('company_subscriptions')
        .select(`
          *,
          plan:subscription_plans(*)
        `)
        .eq('company_id', companyId)
        .single();

      if (subError && subError.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw subError;
      }

      if (subData) {
        setSubscription(subData as any);
      }

      // Load invoices
      const { data: invData, error: invError } = await supabase
        .from('invoices')
        .select('*')
        .eq('company_id', companyId)
        .order('invoice_date', { ascending: false })
        .limit(12);

      if (invError) throw invError;
      setInvoices(invData || []);

    } catch (err: any) {
      console.error('Error loading billing data:', err);
      setError(err.message || 'Failed to load billing information');
    } finally {
      setLoading(false);
    }
  }

  async function requestDataExport(exportType: string = 'full') {
    if (!companyId) return;

    setExportLoading(true);
    try {
      // Call the API route to generate the export
      const response = await fetch('/api/billing/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company_id: companyId,
          exportType: exportType,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate export');
      }

      // Get the JSON data
      const exportData = await response.json();

      // Create a blob and download it
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `checkly-export-${companyId}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Show success message
      alert('Data export downloaded successfully!');
      
    } catch (err: any) {
      console.error('Error requesting data export:', err);
      alert(`Failed to export data: ${err.message || 'Please try again or contact support.'}`);
    } finally {
      setExportLoading(false);
    }
  }

  function getTrialDaysRemaining() {
    if (!subscription || subscription.status !== 'trial') return null;
    const days = differenceInDays(new Date(subscription.trial_ends_at), new Date());
    return Math.max(0, days);
  }

  function getStatusBadge() {
    if (!subscription) return null;

    const statusConfig = {
      trial: { label: 'Free Trial', color: 'bg-blue-500/20 text-blue-400 border-blue-500/40', icon: Clock },
      active: { label: 'Active', color: 'bg-green-500/20 text-green-400 border-green-500/40', icon: CheckCircle2 },
      expired: { label: 'Expired', color: 'bg-red-500/20 text-red-400 border-red-500/40', icon: AlertCircle },
      cancelled: { label: 'Cancelled', color: 'bg-gray-500/20 text-gray-400 border-gray-500/40', icon: FileText },
      past_due: { label: 'Past Due', color: 'bg-orange-500/20 text-orange-400 border-orange-500/40', icon: AlertCircle },
    };

    const config = statusConfig[subscription.status] || statusConfig.trial;
    const Icon = config.icon;

    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${config.color}`}>
        <Icon className="w-4 h-4" />
        <span className="text-sm font-medium">{config.label}</span>
      </div>
    );
  }

  if (contextLoading || loading) {
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

  const trialDaysRemaining = getTrialDaysRemaining();
  const isTrialActive = subscription?.status === 'trial' && trialDaysRemaining !== null && trialDaysRemaining > 0;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Billing & Subscription</h1>
        <p className="text-white/60">Manage your subscription, invoices, and data exports</p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Subscription Status Card */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-white mb-2">Current Subscription</h2>
            {subscription ? (
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  {getStatusBadge()}
                  <span className="text-white/60">
                    {subscription.plan?.display_name || 'No Plan'}
                  </span>
                </div>
                {subscription.billing_email && (
                  <p className="text-sm text-white/60">Billing email: {subscription.billing_email}</p>
                )}
              </div>
            ) : (
              <p className="text-white/60">No active subscription</p>
            )}
          </div>
          <Link href="/pricing">
            <Button variant="outline" size="sm">
              View Plans
            </Button>
          </Link>
        </div>

        {/* Trial Countdown */}
        {isTrialActive && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-blue-400" />
              <div>
                <p className="text-white font-medium">
                  {trialDaysRemaining} {trialDaysRemaining === 1 ? 'day' : 'days'} remaining in your free trial
                </p>
                <p className="text-sm text-white/60 mt-1">
                  Trial ends on {format(new Date(subscription.trial_ends_at), 'PPP')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Subscription Details */}
        {subscription && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="bg-white/[0.05] rounded-lg p-4">
              <p className="text-sm text-white/60 mb-1">Sites</p>
              <p className="text-2xl font-bold text-white">{subscription.site_count || 0}</p>
            </div>
            <div className="bg-white/[0.05] rounded-lg p-4">
              <p className="text-sm text-white/60 mb-1">Monthly Amount</p>
              <p className="text-2xl font-bold text-white">
                £{subscription.monthly_amount?.toFixed(2) || '0.00'}
              </p>
            </div>
            <div className="bg-white/[0.05] rounded-lg p-4">
              <p className="text-sm text-white/60 mb-1">Price per Site</p>
              <p className="text-2xl font-bold text-white">
                £{subscription.plan?.price_per_site_monthly?.toFixed(2) || '0.00'}
              </p>
            </div>
          </div>
        )}

        {/* Manual Invoice Notice */}
        <div className="mt-6 pt-6 border-t border-white/10">
          <div className="flex items-start gap-3">
            <CreditCard className="w-5 h-5 text-yellow-400 mt-0.5" />
            <div>
              <p className="text-white font-medium mb-1">Manual Invoicing</p>
              <p className="text-sm text-white/60">
                We invoice monthly via email. No automatic payments are set up. You'll receive invoices at the end of each billing period.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Invoices Section */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Invoice History</h2>
        
        {invoices.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-white/30 mx-auto mb-3" />
            <p className="text-white/60">No invoices yet</p>
            {isTrialActive && (
              <p className="text-sm text-white/40 mt-2">
                Invoices will appear here after your trial ends
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="bg-white/[0.05] border border-white/10 rounded-lg p-4 hover:bg-white/[0.08] transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-semibold text-white">{invoice.invoice_number}</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        invoice.status === 'paid' ? 'bg-green-500/20 text-green-400' :
                        invoice.status === 'overdue' ? 'bg-red-500/20 text-red-400' :
                        invoice.status === 'sent' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                      </span>
                    </div>
                    <div className="text-sm text-white/60 space-y-1">
                      <p>
                        Period: {format(new Date(invoice.billing_period_start), 'MMM dd')} - {format(new Date(invoice.billing_period_end), 'MMM dd, yyyy')}
                      </p>
                      <p>
                        Due: {format(new Date(invoice.due_date), 'PPP')}
                        {invoice.paid_at && (
                          <span className="ml-2 text-green-400">
                            • Paid {format(new Date(invoice.paid_at), 'MMM dd, yyyy')}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-white">£{invoice.total_amount.toFixed(2)}</p>
                    {invoice.status === 'sent' && (
                      <Button variant="outline" size="sm" className="mt-2">
                        Download PDF
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Data Export Section */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
        <h2 className="text-xl font-semibold text-white mb-2">Data Export</h2>
        <p className="text-white/60 mb-4">
          Request a copy of your data. This is useful if you're leaving Checkly or need a backup. 
          Exports are provided in JSON format and typically ready within 24 hours.
        </p>
        
        <div className="space-y-3">
          <Button
            onClick={() => requestDataExport('full')}
            disabled={exportLoading}
            variant="outline"
            className="w-full md:w-auto"
          >
            {exportLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Requesting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Request Full Data Export
              </>
            )}
          </Button>
          
          <div className="text-sm text-white/60 mt-4">
            <p className="mb-2">Your export will include:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>All tasks and checklists</li>
              <li>Incident reports</li>
              <li>Asset and maintenance records</li>
              <li>SOPs and documentation</li>
              <li>Temperature logs</li>
              <li>Library items</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Terms & Cancellation */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
        <h2 className="text-xl font-semibold text-white mb-2">Terms & Cancellation</h2>
        <div className="space-y-3 text-white/60 text-sm">
          <p>
            • <strong className="text-white">60-Day Free Trial:</strong> New accounts get 60 days free. No payment required during trial.
          </p>
          <p>
            • <strong className="text-white">Monthly Billing:</strong> After trial, you'll be invoiced monthly. No automatic payments.
          </p>
          <p>
            • <strong className="text-white">60-Day Notice:</strong> To cancel, please provide 60 days written notice via email.
          </p>
          <p>
            • <strong className="text-white">Data Export:</strong> You can request your data at any time, including after cancellation.
          </p>
          <div className="pt-3 border-t border-white/10">
            <Link href="/terms" className="text-pink-400 hover:text-pink-300 inline-flex items-center gap-1">
              View Full Terms <ExternalLink className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

