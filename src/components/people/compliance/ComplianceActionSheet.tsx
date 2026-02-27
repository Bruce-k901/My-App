'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Loader2, ShieldCheck, FileText, User } from '@/components/ui/icons';
import { DocumentUploadInline } from './DocumentUploadInline';
import type { ComplianceActionSheetState } from '@/types/compliance';

const INPUT_CLS =
  'w-full px-3 py-2 bg-theme-surface-elevated border border-theme rounded-lg text-sm text-theme-primary focus:outline-none focus:ring-1 focus:ring-teamly/50';

const LABEL_CLS = 'text-xs font-medium text-theme-secondary mb-1 block';

interface ComplianceActionSheetProps {
  state: ComplianceActionSheetState;
  onClose: () => void;
  onSuccess: () => void;
}

export function ComplianceActionSheet({
  state,
  onClose,
  onSuccess,
}: ComplianceActionSheetProps) {
  const { open, mode, employeeId, employeeName, meta } = state;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="p-6 pb-2">
          <SheetTitle>
            {mode === 'update_rtw' && 'Update Right to Work'}
            {mode === 'update_dbs' && 'Update DBS Check'}
            {mode === 'upload_doc' && `Upload ${meta?.docLabel || 'Document'}`}
            {mode === 'update_field' && `Update ${meta?.fieldLabel || 'Field'}`}
          </SheetTitle>
          <SheetDescription>
            <span className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" />
              {employeeName}
            </span>
          </SheetDescription>
        </SheetHeader>

        <div className="p-6 pt-2">
          {mode === 'update_rtw' && (
            <RTWForm
              employeeId={employeeId}
              onSuccess={() => { onSuccess(); onClose(); }}
            />
          )}
          {mode === 'update_dbs' && (
            <DBSForm
              employeeId={employeeId}
              onSuccess={() => { onSuccess(); onClose(); }}
            />
          )}
          {mode === 'upload_doc' && meta?.docType && (
            <DocumentUploadInline
              employeeId={employeeId}
              docType={meta.docType}
              docLabel={meta.docLabel || 'Document'}
              onSuccess={() => { onSuccess(); onClose(); }}
            />
          )}
          {mode === 'update_field' && meta?.fieldName && (
            <FieldUpdateForm
              employeeId={employeeId}
              fieldName={meta.fieldName}
              fieldLabel={meta.fieldLabel || ''}
              fieldType={meta.fieldType || 'text'}
              options={meta.options ? JSON.parse(meta.options) : undefined}
              onSuccess={() => { onSuccess(); onClose(); }}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── Right to Work form ─────────────────────────────────────
function RTWForm({
  employeeId,
  onSuccess,
}: {
  employeeId: string;
  onSuccess: () => void;
}) {
  const [rtwStatus, setRtwStatus] = useState('');
  const [rtwDocType, setRtwDocType] = useState('');
  const [rtwExpiry, setRtwExpiry] = useState('');
  const [saving, setSaving] = useState(false);
  const [showUpload, setShowUpload] = useState(false);

  const handleSave = async () => {
    if (!rtwStatus) {
      toast.error('Please select a status');
      return;
    }
    setSaving(true);
    try {
      const updateData: Record<string, unknown> = {
        right_to_work_status: rtwStatus,
      };
      if (rtwDocType) updateData.right_to_work_document_type = rtwDocType;
      if (rtwExpiry) updateData.right_to_work_expiry = rtwExpiry;
      else updateData.right_to_work_expiry = null;

      const res = await fetch('/api/people/update-profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId, updateData }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Save failed' }));
        throw new Error(err.error || 'Save failed');
      }

      toast.success('Right to Work updated');
      if (!showUpload) onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
        <p className="text-xs text-amber-600 dark:text-amber-400">
          <strong>UK Law:</strong> Right to Work checks must be completed before employment
          starts. Penalties up to £45,000 per illegal worker (first offence).
        </p>
      </div>

      <div>
        <label className={LABEL_CLS}>RTW Status *</label>
        <select value={rtwStatus} onChange={(e) => setRtwStatus(e.target.value)} className={INPUT_CLS}>
          <option value="">Select status...</option>
          <option value="verified">Verified</option>
          <option value="pending">Pending</option>
          <option value="expired">Expired</option>
          <option value="not_required">Not Required (British/Irish citizen)</option>
        </select>
      </div>

      <div>
        <label className={LABEL_CLS}>Document Type</label>
        <select value={rtwDocType} onChange={(e) => setRtwDocType(e.target.value)} className={INPUT_CLS}>
          <option value="">Select type...</option>
          <option value="passport">UK/Irish Passport</option>
          <option value="biometric_residence_permit">Biometric Residence Permit</option>
          <option value="share_code">Share Code (online check)</option>
          <option value="visa">Visa</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div>
        <label className={LABEL_CLS}>Expiry Date</label>
        <input
          type="date"
          value={rtwExpiry}
          onChange={(e) => setRtwExpiry(e.target.value)}
          className={INPUT_CLS}
        />
        <p className="mt-1 text-xs text-theme-secondary">
          Leave blank for indefinite right to work (e.g. British/Irish citizens)
        </p>
      </div>

      <button
        onClick={handleSave}
        disabled={saving || !rtwStatus}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-teamly px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-teamly/90 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
        {saving ? 'Saving...' : 'Save RTW Status'}
      </button>

      <div className="border-t border-theme pt-4">
        <button
          onClick={() => setShowUpload(!showUpload)}
          className="flex items-center gap-2 text-sm text-teamly hover:text-teamly/80 font-medium"
        >
          <FileText className="h-4 w-4" />
          {showUpload ? 'Hide' : 'Upload'} supporting document
        </button>
        {showUpload && (
          <div className="mt-3">
            <DocumentUploadInline
              employeeId={employeeId}
              docType="right_to_work"
              docLabel="RTW Document"
              onSuccess={onSuccess}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ── DBS form ───────────────────────────────────────────────
function DBSForm({
  employeeId,
  onSuccess,
}: {
  employeeId: string;
  onSuccess: () => void;
}) {
  const [dbsStatus, setDbsStatus] = useState('');
  const [certNumber, setCertNumber] = useState('');
  const [checkDate, setCheckDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [showUpload, setShowUpload] = useState(false);

  const handleSave = async () => {
    if (!dbsStatus) {
      toast.error('Please select a status');
      return;
    }
    setSaving(true);
    try {
      const updateData: Record<string, unknown> = {
        dbs_status: dbsStatus,
      };
      if (certNumber) updateData.dbs_certificate_number = certNumber;
      if (checkDate) updateData.dbs_check_date = checkDate;

      const res = await fetch('/api/people/update-profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId, updateData }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Save failed' }));
        throw new Error(err.error || 'Save failed');
      }

      toast.success('DBS check updated');
      if (!showUpload) onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className={LABEL_CLS}>DBS Status *</label>
        <select value={dbsStatus} onChange={(e) => setDbsStatus(e.target.value)} className={INPUT_CLS}>
          <option value="">Select status...</option>
          <option value="clear">Clear</option>
          <option value="pending">Pending</option>
          <option value="not_required">Not Required</option>
          <option value="issues_found">Issues Found</option>
        </select>
      </div>

      <div>
        <label className={LABEL_CLS}>Certificate Number</label>
        <input
          type="text"
          value={certNumber}
          onChange={(e) => setCertNumber(e.target.value)}
          placeholder="e.g. 001234567890"
          className={INPUT_CLS}
        />
      </div>

      <div>
        <label className={LABEL_CLS}>Check Date</label>
        <input
          type="date"
          value={checkDate}
          onChange={(e) => setCheckDate(e.target.value)}
          className={INPUT_CLS}
        />
      </div>

      <button
        onClick={handleSave}
        disabled={saving || !dbsStatus}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-teamly px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-teamly/90 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
        {saving ? 'Saving...' : 'Save DBS Status'}
      </button>

      <div className="border-t border-theme pt-4">
        <button
          onClick={() => setShowUpload(!showUpload)}
          className="flex items-center gap-2 text-sm text-teamly hover:text-teamly/80 font-medium"
        >
          <FileText className="h-4 w-4" />
          {showUpload ? 'Hide' : 'Upload'} DBS certificate
        </button>
        {showUpload && (
          <div className="mt-3">
            <DocumentUploadInline
              employeeId={employeeId}
              docType="dbs_certificate"
              docLabel="DBS Certificate"
              onSuccess={onSuccess}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Generic field update form ──────────────────────────────
function FieldUpdateForm({
  employeeId,
  fieldName,
  fieldLabel,
  fieldType,
  options,
  onSuccess,
}: {
  employeeId: string;
  fieldName: string;
  fieldLabel: string;
  fieldType: string;
  options?: { value: string; label: string }[];
  onSuccess: () => void;
}) {
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      let updateValue: unknown = value;
      if (fieldType === 'boolean') updateValue = value === 'true';
      if (fieldType === 'text' && fieldName === 'national_insurance_number') {
        updateValue = value.toUpperCase().replace(/\s/g, '');
      }

      const res = await fetch('/api/people/update-profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId,
          updateData: { [fieldName]: updateValue },
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Save failed' }));
        throw new Error(err.error || 'Save failed');
      }

      toast.success(`${fieldLabel} updated`);
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className={LABEL_CLS}>{fieldLabel}</label>
        {fieldType === 'boolean' || options ? (
          <select value={value} onChange={(e) => setValue(e.target.value)} className={INPUT_CLS}>
            <option value="">Select...</option>
            {options
              ? options.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))
              : (
                <>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </>
              )}
          </select>
        ) : (
          <input
            type={fieldType === 'date' ? 'date' : 'text'}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={`Enter ${fieldLabel.toLowerCase()}`}
            className={INPUT_CLS}
          />
        )}
      </div>

      <button
        onClick={handleSave}
        disabled={saving || !value}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-teamly px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-teamly/90 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
      </button>
    </div>
  );
}
