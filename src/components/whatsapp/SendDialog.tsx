'use client';

import { useState } from 'react';
import { X, Send, Loader2, AlertTriangle, CheckCircle, MessageCircle } from '@/components/ui/icons';

// ============================================================================
// Reusable "Send via WhatsApp" dialog for any module.
// Pre-fills template params from the calling module's data.
// ============================================================================

export interface SendDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** Recipient phone number (will be normalised server-side) */
  phoneNumber: string;
  /** Recipient display name */
  recipientName: string;
  /** Template slug (e.g. 'supplier_order_v1') */
  templateName: string;
  /** Template parameters as key-value pairs */
  templateParams: Record<string, string>;
  /** Entity linkage for audit trail */
  linkedEntityType?: string;
  linkedEntityId?: string;
  siteId?: string;
  /** Called after successful send */
  onSent?: (result: { messageId: string; waMessageId: string }) => void;
}

export default function SendDialog({
  isOpen,
  onClose,
  phoneNumber,
  recipientName,
  templateName,
  templateParams,
  linkedEntityType,
  linkedEntityId,
  siteId,
  onSent,
}: SendDialogProps) {
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<'success' | 'error' | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  async function handleSend() {
    setSending(true);
    setResult(null);
    setErrorMessage('');

    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number: phoneNumber,
          template_name: templateName,
          template_params: templateParams,
          linked_entity_type: linkedEntityType,
          linked_entity_id: linkedEntityId,
          site_id: siteId,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setResult('success');
        onSent?.({ messageId: data.messageId, waMessageId: data.waMessageId });
      } else {
        setResult('error');
        setErrorMessage(data.error || 'Failed to send message');
      }
    } catch (err: any) {
      setResult('error');
      setErrorMessage(err.message || 'Network error');
    } finally {
      setSending(false);
    }
  }

  // Build preview text from template params
  const previewLines = Object.entries(templateParams).map(
    ([key, value]) => `{{${key}}}: ${value}`,
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Dialog */}
      <div className="relative w-full max-w-md mx-4 bg-theme-surface border border-theme rounded-xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-theme">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-emerald-500" />
            <h3 className="text-lg font-semibold text-theme-primary">Send via WhatsApp</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-theme-muted text-theme-secondary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Recipient */}
          <div className="flex items-center gap-3 p-3 bg-theme-muted rounded-lg">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-theme-primary">{recipientName}</p>
              <p className="text-xs text-theme-secondary">{phoneNumber}</p>
            </div>
          </div>

          {/* Template info */}
          <div>
            <p className="text-xs font-medium text-theme-secondary uppercase tracking-wider mb-2">
              Template: {templateName.replace(/_/g, ' ')}
            </p>
            <div className="p-3 bg-theme-muted rounded-lg space-y-1 max-h-48 overflow-y-auto">
              {previewLines.map((line, i) => (
                <p key={i} className="text-sm text-theme-primary font-mono">{line}</p>
              ))}
            </div>
          </div>

          {/* Result messages */}
          {result === 'success' && (
            <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
              <p className="text-sm text-emerald-600 dark:text-emerald-400">
                Message sent successfully
              </p>
            </div>
          )}

          {result === 'error' && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
              <p className="text-sm text-red-600 dark:text-red-400">
                {errorMessage}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-theme">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-theme-secondary hover:text-theme-primary transition-colors"
          >
            {result === 'success' ? 'Done' : 'Cancel'}
          </button>

          {result !== 'success' && (
            <button
              onClick={handleSend}
              disabled={sending}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {sending ? 'Sending...' : 'Send Message'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
