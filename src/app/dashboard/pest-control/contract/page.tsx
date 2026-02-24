'use client';

import { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { FileText, Shield, Calendar, Phone, Mail, Globe, Edit, Bug, AlertTriangle, Check, Building } from '@/components/ui/icons';
import ContractSetupForm from '@/components/pest-control/ContractSetupForm';

export default function PestControlContractPage() {
  const { companyId, siteId } = useAppContext();
  const [contract, setContract] = useState<any>(null);
  const [contractor, setContractor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [ytdSpend, setYtdSpend] = useState(0);
  const [visitCount, setVisitCount] = useState(0);

  useEffect(() => {
    if (companyId) fetchContract();
  }, [companyId, siteId]);

  async function fetchContract() {
    try {
      setLoading(true);
      let query = supabase
        .from('pest_control_contracts')
        .select('*, contractor:contractors(*)')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1);

      if (siteId && siteId !== 'all') {
        query = query.or(`site_id.eq.${siteId},site_id.is.null`);
      }

      const { data, error } = await query;
      if (error) {
        // 42P01 = table doesn't exist yet (migration not run)
        if (error.code === '42P01') {
          setContract(null);
          setContractor(null);
          return;
        }
        throw error;
      }

      if (data && data.length > 0) {
        setContract(data[0]);
        setContractor(data[0].contractor);
        fetchSpendData(data[0].contractor_id);
      } else {
        setContract(null);
        setContractor(null);
      }
    } catch (err: any) {
      console.error('Error fetching contract:', err?.message || err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchSpendData(contractorId: string) {
    try {
      const year = new Date().getFullYear();
      const { data } = await supabase
        .from('pest_control_visits')
        .select('total_cost')
        .eq('company_id', companyId)
        .gte('visit_date', `${year}-01-01`)
        .lte('visit_date', `${year}-12-31`);

      if (data) {
        setYtdSpend(data.reduce((sum, v) => sum + (v.total_cost || 0), 0));
        setVisitCount(data.length);
      }
    } catch {
      // Table may not exist yet
    }
  }

  if (loading) {
    return (
      <div className="w-full max-w-[1200px] mx-auto px-3 sm:px-6 lg:px-8 py-6">
        <p className="text-theme-secondary text-center py-12">Loading contract details...</p>
      </div>
    );
  }

  // No contract - show setup
  if (!contract || editing) {
    return (
      <div className="w-full max-w-[1200px] mx-auto px-3 sm:px-6 lg:px-8 py-6">
        <h1 className="text-xl sm:text-2xl font-semibold text-theme-primary mb-1">
          {editing ? 'Edit Pest Control Contract' : 'Set Up Pest Control Contract'}
        </h1>
        <p className="text-sm text-theme-secondary mb-6">
          {editing
            ? 'Update your pest control contract details.'
            : 'Set up your pest control provider and contract details. Everything is saved here within Checkly — no need to set up the contractor separately.'}
        </p>
        <ContractSetupForm
          existingContract={editing ? contract : undefined}
          onSaved={() => {
            setEditing(false);
            fetchContract();
          }}
          onCancel={editing ? () => setEditing(false) : undefined}
        />
      </div>
    );
  }

  // Contract exists - show detail view
  const daysUntilExpiry = contract.contract_end_date
    ? Math.ceil((new Date(contract.contract_end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  const insuranceDaysLeft = contract.insurance_expiry_date
    ? Math.ceil((new Date(contract.insurance_expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="w-full max-w-[1200px] mx-auto px-3 sm:px-6 lg:px-8 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-theme-primary">Pest Control Contract</h1>
          <p className="text-sm text-theme-secondary mt-0.5">{contractor?.name || 'Unknown provider'}</p>
        </div>
        <button
          onClick={() => setEditing(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-theme text-theme-secondary hover:bg-theme-hover transition-colors"
        >
          <Edit className="w-4 h-4" />
          Edit
        </button>
      </div>

      {/* Alert: Expiring soon */}
      {daysUntilExpiry !== null && daysUntilExpiry <= (contract.renewal_reminder_days || 60) && daysUntilExpiry > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <p className="text-sm text-amber-600 dark:text-amber-400">
            Contract expires in <strong>{daysUntilExpiry} days</strong> ({contract.contract_end_date}). {contract.auto_renew ? 'Auto-renewal is enabled.' : 'Consider renewing.'}
          </p>
        </div>
      )}
      {daysUntilExpiry !== null && daysUntilExpiry <= 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-600 dark:text-red-400">
            Contract has <strong>expired</strong> ({contract.contract_end_date}). Please renew or update.
          </p>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Annual Value" value={contract.contract_value_annual ? `£${Number(contract.contract_value_annual).toLocaleString()}` : '—'} />
        <KpiCard label="Visits / Year" value={`${contract.routine_visits_per_year || 12}`} />
        <KpiCard label="YTD Spend" value={`£${ytdSpend.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`} />
        <KpiCard label="Visits This Year" value={`${visitCount}`} />
      </div>

      {/* Contact Details */}
      {contractor && (
        <div className="bg-theme-surface rounded-xl border border-theme p-5">
          <div className="flex items-center gap-2 mb-3">
            <Building className="w-5 h-5 text-checkly-dark dark:text-checkly" />
            <h3 className="font-semibold text-theme-primary">Provider Contact Details</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {contractor.contact_name && (
              <InfoRow icon={<Building className="w-4 h-4" />} label="Contact" value={contractor.contact_name} />
            )}
            {contractor.phone && (
              <InfoRow icon={<Phone className="w-4 h-4" />} label="Phone" value={contractor.phone} />
            )}
            {contractor.ooh_phone && (
              <InfoRow icon={<Phone className="w-4 h-4" />} label="Out of Hours" value={contractor.ooh_phone} />
            )}
            {contractor.email && (
              <InfoRow icon={<Mail className="w-4 h-4" />} label="Email" value={contractor.email} />
            )}
            {contractor.website && (
              <InfoRow icon={<Globe className="w-4 h-4" />} label="Website" value={contractor.website} />
            )}
            {contractor.address && (
              <InfoRow icon={<Building className="w-4 h-4" />} label="Address" value={`${contractor.address}${contractor.postcode ? `, ${contractor.postcode}` : ''}`} />
            )}
          </div>
        </div>
      )}

      {/* Contract Details */}
      <div className="bg-theme-surface rounded-xl border border-theme p-5">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="w-5 h-5 text-checkly-dark dark:text-checkly" />
          <h3 className="font-semibold text-theme-primary">Contract Details</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {contract.contract_reference && (
            <InfoRow icon={<FileText className="w-4 h-4" />} label="Reference" value={contract.contract_reference} />
          )}
          <InfoRow icon={<Calendar className="w-4 h-4" />} label="Start Date" value={contract.contract_start_date} />
          {contract.contract_end_date && (
            <InfoRow icon={<Calendar className="w-4 h-4" />} label="End Date" value={contract.contract_end_date} />
          )}
          <InfoRow icon={<Calendar className="w-4 h-4" />} label="Emergency SLA" value={`${contract.emergency_response_hours || 24} hours`} />
        </div>
      </div>

      {/* Coverage */}
      <div className="bg-theme-surface rounded-xl border border-theme p-5">
        <h3 className="font-semibold text-theme-primary mb-3">Coverage</h3>
        <div className="flex flex-wrap gap-2">
          {(contract.coverage_includes || []).map((pest: string) => (
            <span key={pest} className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 capitalize">
              {pest.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
        {contract.exclusions?.length > 0 && (
          <div className="mt-3">
            <p className="text-xs text-theme-tertiary mb-1">Exclusions:</p>
            <div className="flex flex-wrap gap-2">
              {contract.exclusions.map((ex: string) => (
                <span key={ex} className="px-3 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30 capitalize">
                  {ex.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Certifications */}
      <div className="bg-theme-surface rounded-xl border border-theme p-5">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-5 h-5 text-checkly-dark dark:text-checkly" />
          <h3 className="font-semibold text-theme-primary">Certifications & Insurance</h3>
        </div>
        <div className="flex flex-wrap gap-3">
          <CertBadge label="BPCA" valid={contract.bpca_certified} />
          <CertBadge label="BASIS PROMPT" valid={contract.basis_registered} />
          <CertBadge
            label={`Insurance${insuranceDaysLeft !== null ? ` (${insuranceDaysLeft > 0 ? `${insuranceDaysLeft}d left` : 'EXPIRED'})` : ''}`}
            valid={insuranceDaysLeft === null ? null : insuranceDaysLeft > 0}
            warning={insuranceDaysLeft !== null && insuranceDaysLeft <= 30 && insuranceDaysLeft > 0}
          />
        </div>
        {contract.public_liability_amount && (
          <p className="text-xs text-theme-secondary mt-2">
            Public Liability: £{Number(contract.public_liability_amount).toLocaleString()}
          </p>
        )}
      </div>

      {/* Documents */}
      <div className="bg-theme-surface rounded-xl border border-theme p-5">
        <h3 className="font-semibold text-theme-primary mb-3">Documents</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <DocLink label="Contract" url={contract.contract_document_url} />
          <DocLink label="Insurance Certificate" url={contract.insurance_certificate_url} />
          <DocLink label="Risk Assessment" url={contract.risk_assessment_url} />
        </div>
      </div>

      {/* Notes */}
      {contract.notes && (
        <div className="bg-theme-surface rounded-xl border border-theme p-5">
          <h3 className="font-semibold text-theme-primary mb-2">Notes</h3>
          <p className="text-sm text-theme-secondary whitespace-pre-wrap">{contract.notes}</p>
        </div>
      )}
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-theme-surface rounded-xl border border-theme p-4">
      <p className="text-xs text-theme-tertiary mb-1">{label}</p>
      <p className="text-lg font-semibold text-theme-primary">{value}</p>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-theme-tertiary mt-0.5 flex-shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-theme-tertiary">{label}</p>
        <p className="text-sm text-theme-primary truncate">{value}</p>
      </div>
    </div>
  );
}

function CertBadge({ label, valid, warning }: { label: string; valid: boolean | null; warning?: boolean }) {
  if (valid === null) {
    return (
      <span className="px-3 py-1.5 rounded-lg text-xs font-medium bg-theme-hover text-theme-tertiary border border-theme">
        {label}: N/A
      </span>
    );
  }
  return (
    <span className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
      !valid
        ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30'
        : warning
          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
          : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
    }`}>
      {valid ? <Check className="w-3 h-3 inline mr-1" /> : null}
      {label}
    </span>
  );
}

function DocLink({ label, url }: { label: string; url?: string }) {
  if (!url) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg border border-dashed border-theme text-theme-tertiary">
        <FileText className="w-4 h-4" />
        <span className="text-xs">{label}: Not uploaded</span>
      </div>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 p-3 rounded-lg border border-theme bg-theme-hover hover:border-checkly-dark dark:hover:border-checkly transition-colors"
    >
      <FileText className="w-4 h-4 text-checkly-dark dark:text-checkly" />
      <span className="text-xs text-theme-primary">{label}</span>
    </a>
  );
}
