'use client';

import { useState, useEffect, useRef } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Upload, X, FileText, Check, Loader2, Building, Shield } from '@/components/ui/icons';

interface ContractSetupFormProps {
  existingContract?: any;
  onSaved: () => void;
  onCancel?: () => void;
}

const PEST_TYPES = ['mice', 'rats', 'flies', 'cockroaches', 'ants', 'wasps', 'birds', 'stored_product_insects', 'bed_bugs'];

export default function ContractSetupForm({ existingContract, onSaved, onCancel }: ContractSetupFormProps) {
  const { companyId, siteId, profile } = useAppContext();
  const [saving, setSaving] = useState(false);
  const [existingContractors, setExistingContractors] = useState<any[]>([]);
  const [useExisting, setUseExisting] = useState(false);
  const [selectedContractorId, setSelectedContractorId] = useState('');

  // Contractor fields (inline creation)
  const [contractor, setContractor] = useState({
    name: '',
    contact_name: '',
    email: '',
    phone: '',
    ooh_phone: '',
    address: '',
    postcode: '',
    website: '',
  });

  // Contract fields
  const [contract, setContract] = useState({
    contract_reference: '',
    contract_start_date: '',
    contract_end_date: '',
    contract_value_annual: '',
    routine_visits_per_year: '12',
    emergency_response_hours: '24',
    coverage_includes: ['mice', 'rats', 'flies', 'cockroaches'] as string[],
    exclusions: [] as string[],
    public_liability_amount: '',
    insurance_expiry_date: '',
    bpca_certified: false,
    basis_registered: false,
    renewal_reminder_days: '60',
    auto_renew: false,
    notes: '',
  });

  // File uploads
  const [contractDocUrl, setContractDocUrl] = useState('');
  const [insuranceCertUrl, setInsuranceCertUrl] = useState('');
  const [riskAssessmentUrl, setRiskAssessmentUrl] = useState('');
  const [uploading, setUploading] = useState<string | null>(null);

  // Load existing pest control contractors
  useEffect(() => {
    if (companyId) {
      fetchExistingContractors();
    }
  }, [companyId]);

  // Pre-fill if editing
  useEffect(() => {
    if (existingContract) {
      setUseExisting(true);
      setSelectedContractorId(existingContract.contractor_id);
      setContract({
        contract_reference: existingContract.contract_reference || '',
        contract_start_date: existingContract.contract_start_date || '',
        contract_end_date: existingContract.contract_end_date || '',
        contract_value_annual: existingContract.contract_value_annual?.toString() || '',
        routine_visits_per_year: existingContract.routine_visits_per_year?.toString() || '12',
        emergency_response_hours: existingContract.emergency_response_hours?.toString() || '24',
        coverage_includes: existingContract.coverage_includes || ['mice', 'rats', 'flies', 'cockroaches'],
        exclusions: existingContract.exclusions || [],
        public_liability_amount: existingContract.public_liability_amount?.toString() || '',
        insurance_expiry_date: existingContract.insurance_expiry_date || '',
        bpca_certified: existingContract.bpca_certified || false,
        basis_registered: existingContract.basis_registered || false,
        renewal_reminder_days: existingContract.renewal_reminder_days?.toString() || '60',
        auto_renew: existingContract.auto_renew || false,
        notes: existingContract.notes || '',
      });
      setContractDocUrl(existingContract.contract_document_url || '');
      setInsuranceCertUrl(existingContract.insurance_certificate_url || '');
      setRiskAssessmentUrl(existingContract.risk_assessment_url || '');
    }
  }, [existingContract]);

  async function fetchExistingContractors() {
    const { data } = await supabase
      .from('contractors')
      .select('id, name, contact_name, phone, email')
      .eq('company_id', companyId)
      .ilike('category', '%pest%')
      .eq('is_active', true)
      .order('name');
    setExistingContractors(data || []);
  }

  async function handleFileUpload(file: File, field: 'contract' | 'insurance' | 'risk_assessment') {
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File must be less than 10MB');
      return;
    }

    setUploading(field);
    try {
      const timestamp = Date.now();
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `${companyId}/${siteId || 'company'}/${field}_${timestamp}_${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from('pest-control-documents')
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('pest-control-documents')
        .getPublicUrl(filePath);

      if (field === 'contract') setContractDocUrl(publicUrl);
      else if (field === 'insurance') setInsuranceCertUrl(publicUrl);
      else setRiskAssessmentUrl(publicUrl);

      toast.success('Document uploaded');
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(null);
    }
  }

  function toggleCoverage(pest: string) {
    setContract(prev => ({
      ...prev,
      coverage_includes: prev.coverage_includes.includes(pest)
        ? prev.coverage_includes.filter(p => p !== pest)
        : [...prev.coverage_includes, pest],
    }));
  }

  async function handleSave() {
    if (!companyId) return;

    // Validate
    if (!useExisting && !contractor.name.trim()) {
      toast.error('Please enter the pest control company name');
      return;
    }
    if (useExisting && !selectedContractorId) {
      toast.error('Please select a contractor');
      return;
    }
    if (!contract.contract_start_date) {
      toast.error('Please enter the contract start date');
      return;
    }

    setSaving(true);
    try {
      let contractorId = selectedContractorId;

      // Create contractor inline if new
      if (!useExisting) {
        const { data: newContractor, error: cError } = await supabase
          .from('contractors')
          .insert({
            company_id: companyId,
            category: 'pest_control',
            name: contractor.name.trim(),
            contact_name: contractor.contact_name || null,
            email: contractor.email || null,
            phone: contractor.phone || null,
            ooh_phone: contractor.ooh_phone || null,
            address: contractor.address || null,
            postcode: contractor.postcode || null,
            website: contractor.website || null,
            is_active: true,
          })
          .select('id')
          .single();

        if (cError) throw cError;
        contractorId = newContractor.id;
      }

      const contractData = {
        company_id: companyId,
        site_id: siteId && siteId !== 'all' ? siteId : null,
        contractor_id: contractorId,
        contract_reference: contract.contract_reference || null,
        contract_start_date: contract.contract_start_date,
        contract_end_date: contract.contract_end_date || null,
        contract_value_annual: contract.contract_value_annual ? parseFloat(contract.contract_value_annual) : null,
        routine_visits_per_year: parseInt(contract.routine_visits_per_year) || 12,
        emergency_response_hours: parseInt(contract.emergency_response_hours) || 24,
        coverage_includes: contract.coverage_includes,
        exclusions: contract.exclusions.length > 0 ? contract.exclusions : null,
        public_liability_amount: contract.public_liability_amount ? parseFloat(contract.public_liability_amount) : null,
        insurance_expiry_date: contract.insurance_expiry_date || null,
        bpca_certified: contract.bpca_certified,
        basis_registered: contract.basis_registered,
        contract_document_url: contractDocUrl || null,
        insurance_certificate_url: insuranceCertUrl || null,
        risk_assessment_url: riskAssessmentUrl || null,
        renewal_reminder_days: parseInt(contract.renewal_reminder_days) || 60,
        is_active: true,
        auto_renew: contract.auto_renew,
        notes: contract.notes || null,
        created_by: profile?.id || null,
      };

      if (existingContract) {
        const { error } = await supabase
          .from('pest_control_contracts')
          .update(contractData)
          .eq('id', existingContract.id);
        if (error) throw error;
        toast.success('Contract updated');
      } else {
        const { error } = await supabase
          .from('pest_control_contracts')
          .insert(contractData);
        if (error) throw error;
        toast.success('Pest control contract created');
      }

      onSaved();
    } catch (err: any) {
      console.error('Save error:', err);
      toast.error(err.message || 'Failed to save contract');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Section 1: Contractor */}
      <div className="bg-theme-surface rounded-xl border border-theme p-5">
        <div className="flex items-center gap-2 mb-4">
          <Building className="w-5 h-5 text-checkly-dark dark:text-checkly" />
          <h3 className="text-lg font-semibold text-theme-primary">Pest Control Provider</h3>
        </div>

        {existingContractors.length > 0 && !existingContract && (
          <div className="flex gap-3 mb-4">
            <button
              onClick={() => setUseExisting(false)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                !useExisting
                  ? 'bg-checkly-dark/10 dark:bg-checkly/10 text-checkly-dark dark:text-checkly border border-checkly-dark/30 dark:border-checkly/30'
                  : 'bg-theme-hover text-theme-secondary border border-theme'
              }`}
            >
              New Provider
            </button>
            <button
              onClick={() => setUseExisting(true)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                useExisting
                  ? 'bg-checkly-dark/10 dark:bg-checkly/10 text-checkly-dark dark:text-checkly border border-checkly-dark/30 dark:border-checkly/30'
                  : 'bg-theme-hover text-theme-secondary border border-theme'
              }`}
            >
              Existing Contractor
            </button>
          </div>
        )}

        {useExisting ? (
          <select
            value={selectedContractorId}
            onChange={e => setSelectedContractorId(e.target.value)}
            className="w-full h-10 px-3 rounded-lg border border-theme bg-transparent text-sm text-theme-primary"
          >
            <option value="">Select contractor...</option>
            {existingContractors.map(c => (
              <option key={c.id} value={c.id}>{c.name} {c.contact_name ? `(${c.contact_name})` : ''}</option>
            ))}
          </select>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-theme-secondary mb-1">Company Name *</label>
              <input
                type="text"
                value={contractor.name}
                onChange={e => setContractor({ ...contractor, name: e.target.value })}
                placeholder="e.g. ABC Pest Control Ltd"
                className="w-full h-10 px-3 rounded-lg border border-theme bg-transparent text-sm text-theme-primary placeholder:text-theme-tertiary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-theme-secondary mb-1">Contact Name</label>
              <input
                type="text"
                value={contractor.contact_name}
                onChange={e => setContractor({ ...contractor, contact_name: e.target.value })}
                placeholder="e.g. John Smith"
                className="w-full h-10 px-3 rounded-lg border border-theme bg-transparent text-sm text-theme-primary placeholder:text-theme-tertiary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-theme-secondary mb-1">Email</label>
              <input
                type="email"
                value={contractor.email}
                onChange={e => setContractor({ ...contractor, email: e.target.value })}
                placeholder="email@pestcontrol.com"
                className="w-full h-10 px-3 rounded-lg border border-theme bg-transparent text-sm text-theme-primary placeholder:text-theme-tertiary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-theme-secondary mb-1">Phone</label>
              <input
                type="tel"
                value={contractor.phone}
                onChange={e => setContractor({ ...contractor, phone: e.target.value })}
                placeholder="01234 567890"
                className="w-full h-10 px-3 rounded-lg border border-theme bg-transparent text-sm text-theme-primary placeholder:text-theme-tertiary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-theme-secondary mb-1">Out of Hours Phone</label>
              <input
                type="tel"
                value={contractor.ooh_phone}
                onChange={e => setContractor({ ...contractor, ooh_phone: e.target.value })}
                placeholder="Emergency number"
                className="w-full h-10 px-3 rounded-lg border border-theme bg-transparent text-sm text-theme-primary placeholder:text-theme-tertiary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-theme-secondary mb-1">Website</label>
              <input
                type="url"
                value={contractor.website}
                onChange={e => setContractor({ ...contractor, website: e.target.value })}
                placeholder="https://..."
                className="w-full h-10 px-3 rounded-lg border border-theme bg-transparent text-sm text-theme-primary placeholder:text-theme-tertiary"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-theme-secondary mb-1">Address</label>
              <input
                type="text"
                value={contractor.address}
                onChange={e => setContractor({ ...contractor, address: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border border-theme bg-transparent text-sm text-theme-primary placeholder:text-theme-tertiary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-theme-secondary mb-1">Postcode</label>
              <input
                type="text"
                value={contractor.postcode}
                onChange={e => setContractor({ ...contractor, postcode: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border border-theme bg-transparent text-sm text-theme-primary placeholder:text-theme-tertiary"
              />
            </div>
          </div>
        )}
      </div>

      {/* Section 2: Contract Details */}
      <div className="bg-theme-surface rounded-xl border border-theme p-5">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-checkly-dark dark:text-checkly" />
          <h3 className="text-lg font-semibold text-theme-primary">Contract Details</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-theme-secondary mb-1">Contract Reference</label>
            <input
              type="text"
              value={contract.contract_reference}
              onChange={e => setContract({ ...contract, contract_reference: e.target.value })}
              placeholder="e.g. PC-2026-001"
              className="w-full h-10 px-3 rounded-lg border border-theme bg-transparent text-sm text-theme-primary placeholder:text-theme-tertiary"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-theme-secondary mb-1">Start Date *</label>
            <input
              type="date"
              value={contract.contract_start_date}
              onChange={e => setContract({ ...contract, contract_start_date: e.target.value })}
              className="w-full h-10 px-3 rounded-lg border border-theme bg-transparent text-sm text-theme-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-theme-secondary mb-1">End Date</label>
            <input
              type="date"
              value={contract.contract_end_date}
              onChange={e => setContract({ ...contract, contract_end_date: e.target.value })}
              className="w-full h-10 px-3 rounded-lg border border-theme bg-transparent text-sm text-theme-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-theme-secondary mb-1">Annual Value (&pound;)</label>
            <input
              type="number"
              step="0.01"
              value={contract.contract_value_annual}
              onChange={e => setContract({ ...contract, contract_value_annual: e.target.value })}
              placeholder="e.g. 1200.00"
              className="w-full h-10 px-3 rounded-lg border border-theme bg-transparent text-sm text-theme-primary placeholder:text-theme-tertiary"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-theme-secondary mb-1">Visits Per Year</label>
            <input
              type="number"
              value={contract.routine_visits_per_year}
              onChange={e => setContract({ ...contract, routine_visits_per_year: e.target.value })}
              className="w-full h-10 px-3 rounded-lg border border-theme bg-transparent text-sm text-theme-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-theme-secondary mb-1">Emergency Response (hours)</label>
            <input
              type="number"
              value={contract.emergency_response_hours}
              onChange={e => setContract({ ...contract, emergency_response_hours: e.target.value })}
              className="w-full h-10 px-3 rounded-lg border border-theme bg-transparent text-sm text-theme-primary"
            />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-theme-secondary cursor-pointer">
            <input
              type="checkbox"
              checked={contract.auto_renew}
              onChange={e => setContract({ ...contract, auto_renew: e.target.checked })}
              className="rounded border-theme"
            />
            Auto-renew
          </label>
          <div className="flex items-center gap-2">
            <label className="text-xs text-theme-secondary">Renewal reminder</label>
            <input
              type="number"
              value={contract.renewal_reminder_days}
              onChange={e => setContract({ ...contract, renewal_reminder_days: e.target.value })}
              className="w-16 h-8 px-2 rounded border border-theme bg-transparent text-sm text-theme-primary text-center"
            />
            <span className="text-xs text-theme-tertiary">days before</span>
          </div>
        </div>
      </div>

      {/* Section 3: Coverage */}
      <div className="bg-theme-surface rounded-xl border border-theme p-5">
        <h3 className="text-lg font-semibold text-theme-primary mb-4">Coverage</h3>
        <p className="text-xs text-theme-secondary mb-3">Select pest types covered by this contract:</p>
        <div className="flex flex-wrap gap-2">
          {PEST_TYPES.map(pest => (
            <button
              key={pest}
              onClick={() => toggleCoverage(pest)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors capitalize ${
                contract.coverage_includes.includes(pest)
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                  : 'bg-theme-hover text-theme-tertiary border border-theme'
              }`}
            >
              {pest.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Section 4: Certifications & Insurance */}
      <div className="bg-theme-surface rounded-xl border border-theme p-5">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-checkly-dark dark:text-checkly" />
          <h3 className="text-lg font-semibold text-theme-primary">Certifications & Insurance</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-theme-primary cursor-pointer">
              <input
                type="checkbox"
                checked={contract.bpca_certified}
                onChange={e => setContract({ ...contract, bpca_certified: e.target.checked })}
                className="rounded border-theme"
              />
              BPCA Certified
            </label>
            <label className="flex items-center gap-2 text-sm text-theme-primary cursor-pointer">
              <input
                type="checkbox"
                checked={contract.basis_registered}
                onChange={e => setContract({ ...contract, basis_registered: e.target.checked })}
                className="rounded border-theme"
              />
              BASIS PROMPT Registered
            </label>
          </div>
          <div>
            <label className="block text-xs font-medium text-theme-secondary mb-1">Public Liability (&pound;)</label>
            <input
              type="number"
              step="0.01"
              value={contract.public_liability_amount}
              onChange={e => setContract({ ...contract, public_liability_amount: e.target.value })}
              placeholder="e.g. 5000000"
              className="w-full h-10 px-3 rounded-lg border border-theme bg-transparent text-sm text-theme-primary placeholder:text-theme-tertiary"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-theme-secondary mb-1">Insurance Expiry Date</label>
            <input
              type="date"
              value={contract.insurance_expiry_date}
              onChange={e => setContract({ ...contract, insurance_expiry_date: e.target.value })}
              className="w-full h-10 px-3 rounded-lg border border-theme bg-transparent text-sm text-theme-primary"
            />
          </div>
        </div>
      </div>

      {/* Section 5: Documents */}
      <div className="bg-theme-surface rounded-xl border border-theme p-5">
        <h3 className="text-lg font-semibold text-theme-primary mb-4">Documents</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FileUploadField
            label="Contract Document"
            value={contractDocUrl}
            uploading={uploading === 'contract'}
            onUpload={file => handleFileUpload(file, 'contract')}
            onRemove={() => setContractDocUrl('')}
          />
          <FileUploadField
            label="Insurance Certificate"
            value={insuranceCertUrl}
            uploading={uploading === 'insurance'}
            onUpload={file => handleFileUpload(file, 'insurance')}
            onRemove={() => setInsuranceCertUrl('')}
          />
          <FileUploadField
            label="Risk Assessment"
            value={riskAssessmentUrl}
            uploading={uploading === 'risk_assessment'}
            onUpload={file => handleFileUpload(file, 'risk_assessment')}
            onRemove={() => setRiskAssessmentUrl('')}
          />
        </div>
      </div>

      {/* Section 6: Notes */}
      <div className="bg-theme-surface rounded-xl border border-theme p-5">
        <label className="block text-xs font-medium text-theme-secondary mb-1">Notes</label>
        <textarea
          value={contract.notes}
          onChange={e => setContract({ ...contract, notes: e.target.value })}
          rows={3}
          placeholder="Any additional notes about the pest control contract..."
          className="w-full px-3 py-2 rounded-lg border border-theme bg-transparent text-sm text-theme-primary placeholder:text-theme-tertiary resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        {onCancel && (
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm font-medium text-theme-secondary border border-theme hover:bg-theme-hover transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 rounded-lg text-sm font-medium bg-checkly-dark dark:bg-checkly text-white dark:text-checkly-dark hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              {existingContract ? 'Update Contract' : 'Save Contract'}
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function FileUploadField({ label, value, uploading, onUpload, onRemove }: {
  label: string;
  value: string;
  uploading: boolean;
  onUpload: (file: File) => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <label className="block text-xs font-medium text-theme-secondary mb-1">{label}</label>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
        onChange={e => {
          const f = e.target.files?.[0];
          if (f) onUpload(f);
          if (inputRef.current) inputRef.current.value = '';
        }}
      />
      {value ? (
        <div className="flex items-center gap-2 p-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5">
          <FileText className="w-4 h-4 text-emerald-500 flex-shrink-0" />
          <span className="text-xs text-theme-primary truncate flex-1">Uploaded</span>
          <button onClick={onRemove} className="text-theme-tertiary hover:text-red-500 transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full flex items-center justify-center gap-2 p-2 rounded-lg border border-dashed border-theme text-xs text-theme-tertiary hover:border-checkly-dark dark:hover:border-checkly hover:text-checkly-dark dark:hover:text-checkly transition-colors disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Upload className="w-3.5 h-3.5" />
          )}
          {uploading ? 'Uploading...' : 'Upload'}
        </button>
      )}
    </div>
  );
}
