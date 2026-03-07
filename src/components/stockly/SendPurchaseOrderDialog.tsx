'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Mail, MessageCircle, Loader2, ExternalLink } from '@/components/ui/icons';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

interface SendPurchaseOrderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseOrder: {
    id: string;
    order_number: string;
    supplier: {
      id: string;
      name: string;
      email?: string;
      ordering_method?: string;
      ordering_config?: {
        whatsapp_number?: string;
      };
    };
  };
  onSuccess: () => void;
}

export function SendPurchaseOrderDialog({
  isOpen,
  onClose,
  purchaseOrder,
  onSuccess,
}: SendPurchaseOrderDialogProps) {
  const [sendVia, setSendVia] = useState<'email' | 'whatsapp'>(
    purchaseOrder.supplier.ordering_method === 'whatsapp' ? 'whatsapp' : 'email'
  );
  const [recipientEmail, setRecipientEmail] = useState(
    purchaseOrder.supplier.email || ''
  );
  const [recipientWhatsApp, setRecipientWhatsApp] = useState(
    purchaseOrder.supplier.ordering_config?.whatsapp_number || ''
  );
  const [message, setMessage] = useState(
    `Hi ${purchaseOrder.supplier.name},\n\nPlease find attached our purchase order ${purchaseOrder.order_number}.\n\nThank you!`
  );
  const [sending, setSending] = useState(false);

  async function handleSendEmail() {
    if (!recipientEmail.trim()) {
      toast.error('Please enter a recipient email address');
      return;
    }

    setSending(true);
    try {
      // 1. Download PDF
      const pdfUrl = `/api/stockly/purchase-orders/pdf?id=${purchaseOrder.id}`;
      const response = await fetch(pdfUrl);

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PO-${purchaseOrder.order_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      // 2. Open mailto: link
      const subject = encodeURIComponent(`Purchase Order ${purchaseOrder.order_number}`);
      const body = encodeURIComponent(message);
      const mailtoLink = `mailto:${recipientEmail}?subject=${subject}&body=${body}`;
      window.location.href = mailtoLink;

      // 3. Update PO record
      const { error: updateError } = await supabase
        .from('purchase_orders')
        .update({
          sent_via: 'email',
          sent_at: new Date().toISOString(),
          sent_message: message,
          status: 'sent',
          updated_at: new Date().toISOString(),
        })
        .eq('id', purchaseOrder.id);

      if (updateError) {
        console.error('Failed to update PO:', updateError);
        // Don't fail - the email client was opened successfully
      }

      toast.success('Opening your email client with order details. Please attach the downloaded PDF.');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Send email error:', error);
      toast.error(error.message || 'Failed to prepare email');
    } finally {
      setSending(false);
    }
  }

  async function handleSendWhatsApp() {
    if (!recipientWhatsApp.trim()) {
      toast.error('Please enter a WhatsApp number');
      return;
    }

    setSending(true);
    try {
      const response = await fetch('/api/stockly/purchase-orders/send-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchaseOrderId: purchaseOrder.id,
          recipientWhatsApp,
          message,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send WhatsApp message');
      }

      toast.success('Purchase order sent via WhatsApp!');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Send WhatsApp error:', error);
      toast.error(error.message || 'Failed to send via WhatsApp');
    } finally {
      setSending(false);
    }
  }

  function handlePreview() {
    const pdfUrl = `/api/stockly/purchase-orders/pdf?id=${purchaseOrder.id}`;
    window.open(pdfUrl, '_blank');
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-theme-primary">
            Send Purchase Order
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Send Method Selection */}
          <div>
            <label className="block text-sm font-medium text-theme-secondary mb-2">
              Send via
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setSendVia('email')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-colors ${
                  sendVia === 'email'
                    ? 'border-module-fg bg-module-fg/10 text-module-fg'
                    : 'border-theme text-theme-secondary hover:border-theme-hover'
                }`}
              >
                <Mail className="w-5 h-5" />
                <span>Email</span>
              </button>
              <button
                type="button"
                onClick={() => setSendVia('whatsapp')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-colors ${
                  sendVia === 'whatsapp'
                    ? 'border-module-fg bg-module-fg/10 text-module-fg'
                    : 'border-theme text-theme-secondary hover:border-theme-hover'
                }`}
              >
                <MessageCircle className="w-5 h-5" />
                <span>WhatsApp</span>
              </button>
            </div>
          </div>

          {/* Recipient Input */}
          <div>
            <label className="block text-sm font-medium text-theme-secondary mb-2">
              {sendVia === 'email' ? 'Recipient Email' : 'WhatsApp Number'}
            </label>
            {sendVia === 'email' ? (
              <Input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="supplier@example.com"
                className="w-full"
              />
            ) : (
              <Input
                type="tel"
                value={recipientWhatsApp}
                onChange={(e) => setRecipientWhatsApp(e.target.value)}
                placeholder="+44 7700 900000"
                className="w-full"
              />
            )}
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-theme-secondary mb-2">
              Message (optional)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 bg-theme-surface border border-theme rounded-lg text-theme-primary focus:outline-none focus:ring-2 focus:ring-module-fg/50 text-sm resize-none"
              placeholder="Add a custom message..."
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={handlePreview}
              className="flex items-center gap-2 px-3 py-2 text-sm text-theme-secondary hover:text-theme-primary border border-theme rounded-lg hover:bg-theme-surface transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Preview PDF
            </button>

            <div className="flex gap-2">
              <Button onClick={onClose} variant="outline">
                Cancel
              </Button>
              <Button
                onClick={sendVia === 'email' ? handleSendEmail : handleSendWhatsApp}
                disabled={sending}
                variant="secondary"
              >
                {sending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Sending...
                  </>
                ) : (
                  `Send via ${sendVia === 'email' ? 'Email' : 'WhatsApp'}`
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
