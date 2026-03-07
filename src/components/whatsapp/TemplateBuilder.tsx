'use client';

import { useState } from 'react';
import {
  X, Save, Loader2, Plus, Eye, AlertTriangle, CheckCircle,
  MessageCircle, ArrowLeft,
} from '@/components/ui/icons';

// ============================================================================
// WhatsApp Template Builder
// Create and submit custom WhatsApp message templates to Meta for approval.
// ============================================================================

interface TemplateBuilderProps {
  onBack: () => void;
  onSaved: () => void;
}

const CATEGORIES = [
  { value: 'utility', label: 'Utility', description: 'Transactional updates (orders, reminders, alerts)' },
  { value: 'marketing', label: 'Marketing', description: 'Promotional messages (needs separate opt-in)' },
  { value: 'authentication', label: 'Authentication', description: 'OTP and verification codes' },
];

const HEADER_TYPES = [
  { value: '', label: 'No Header' },
  { value: 'text', label: 'Text Header' },
];

const BUTTON_TYPES = [
  { value: 'QUICK_REPLY', label: 'Quick Reply' },
  { value: 'URL', label: 'URL' },
  { value: 'PHONE_NUMBER', label: 'Phone Number' },
];

interface TemplateButton {
  type: string;
  text: string;
  url?: string;
  phone_number?: string;
}

export default function TemplateBuilder({ onBack, onSaved }: TemplateBuilderProps) {
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const [form, setForm] = useState({
    name: '',
    display_name: '',
    category: 'utility',
    language: 'en_GB',
    header_type: '',
    header_text: '',
    body_text: '',
    footer_text: '',
  });
  const [buttons, setButtons] = useState<TemplateButton[]>([]);

  // Derive template name from display name (Meta requires lowercase_snake_case)
  function updateName(displayName: string) {
    const slug = displayName
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
    setForm(f => ({ ...f, display_name: displayName, name: slug }));
  }

  function insertPlaceholder(field: 'body_text' | 'header_text') {
    // Count existing placeholders in body_text to get next number
    const allText = form.body_text + (form.header_text || '');
    const matches = allText.match(/\{\{\d+\}\}/g) || [];
    const existingNums = matches.map(m => parseInt(m.replace(/[{}]/g, '')));
    const next = existingNums.length > 0 ? Math.max(...existingNums) + 1 : 1;
    setForm(f => ({
      ...f,
      [field]: f[field] + `{{${next}}}`,
    }));
  }

  function addButton() {
    if (buttons.length >= 3) return;
    setButtons([...buttons, { type: 'QUICK_REPLY', text: '' }]);
  }

  function updateButton(index: number, updates: Partial<TemplateButton>) {
    setButtons(btns =>
      btns.map((b, i) => (i === index ? { ...b, ...updates } : b)),
    );
  }

  function removeButton(index: number) {
    setButtons(btns => btns.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    if (!form.name || !form.body_text) return;
    setSaving(true);

    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        display_name: form.display_name || form.name,
        category: form.category,
        language: form.language,
        body_text: form.body_text,
      };
      if (form.header_type) {
        payload.header_type = form.header_type;
        payload.header_text = form.header_text;
      }
      if (form.footer_text) {
        payload.footer_text = form.footer_text;
      }
      if (buttons.length > 0) {
        payload.buttons = buttons.filter(b => b.text.trim());
      }

      const res = await fetch('/api/whatsapp/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        onSaved();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to submit template');
      }
    } catch (err: any) {
      alert(err.message || 'Network error');
    } finally {
      setSaving(false);
    }
  }

  // Preview rendering — replaces {{1}}, {{2}} etc with sample values
  function renderPreview(text: string) {
    return text.replace(/\{\{(\d+)\}\}/g, (_, num) => `[Param ${num}]`);
  }

  const isValid = form.name.trim() && form.body_text.trim();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-theme-muted text-theme-secondary transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h3 className="text-lg font-semibold text-theme-primary">New Template</h3>
          <p className="text-sm text-theme-secondary">
            Templates are submitted to Meta for approval before they can be used.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Form */}
        <div className="space-y-5">
          {/* Name & Category */}
          <div className="bg-theme-surface border border-theme rounded-xl p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-theme-secondary mb-1">
                Template Name
              </label>
              <input
                type="text"
                value={form.display_name}
                onChange={(e) => updateName(e.target.value)}
                placeholder="e.g. Monthly Invoice Reminder"
                className="w-full px-3 py-2 bg-theme-button border border-theme rounded-lg text-sm text-theme-primary placeholder-gray-400 dark:placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              {form.name && (
                <p className="text-xs text-theme-tertiary mt-1">
                  Slug: <code className="text-emerald-600 dark:text-emerald-400">{form.name}</code>
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-theme-secondary mb-1">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full px-3 py-2 bg-theme-button border border-theme rounded-lg text-sm text-theme-primary focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {CATEGORIES.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-theme-secondary mb-1">Language</label>
                <select
                  value={form.language}
                  onChange={(e) => setForm({ ...form, language: e.target.value })}
                  className="w-full px-3 py-2 bg-theme-button border border-theme rounded-lg text-sm text-theme-primary focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="en_GB">English (UK)</option>
                  <option value="en_US">English (US)</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                </select>
              </div>
            </div>
          </div>

          {/* Header */}
          <div className="bg-theme-surface border border-theme rounded-xl p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-theme-secondary mb-1">Header</label>
              <select
                value={form.header_type}
                onChange={(e) => setForm({ ...form, header_type: e.target.value, header_text: '' })}
                className="w-full px-3 py-2 bg-theme-button border border-theme rounded-lg text-sm text-theme-primary focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {HEADER_TYPES.map(h => (
                  <option key={h.value} value={h.value}>{h.label}</option>
                ))}
              </select>
            </div>
            {form.header_type === 'text' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-theme-secondary">Header Text</label>
                  <button
                    onClick={() => insertPlaceholder('header_text')}
                    className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    + Insert Placeholder
                  </button>
                </div>
                <input
                  type="text"
                  value={form.header_text}
                  onChange={(e) => setForm({ ...form, header_text: e.target.value })}
                  placeholder="e.g. OPSLY - Order Confirmation"
                  maxLength={60}
                  className="w-full px-3 py-2 bg-theme-button border border-theme rounded-lg text-sm text-theme-primary placeholder-gray-400 dark:placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-xs text-theme-tertiary mt-1">{form.header_text.length}/60 characters</p>
              </div>
            )}
          </div>

          {/* Body */}
          <div className="bg-theme-surface border border-theme rounded-xl p-5 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-theme-secondary">Message Body *</label>
                <button
                  onClick={() => insertPlaceholder('body_text')}
                  className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  + Insert Placeholder
                </button>
              </div>
              <textarea
                value={form.body_text}
                onChange={(e) => setForm({ ...form, body_text: e.target.value })}
                placeholder={'Hi {{1}}, your order {{2}} has been confirmed.\n\nExpected delivery: {{3}}'}
                rows={6}
                maxLength={1024}
                className="w-full px-3 py-2 bg-theme-button border border-theme rounded-lg text-sm text-theme-primary placeholder-gray-400 dark:placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none font-mono"
              />
              <p className="text-xs text-theme-tertiary mt-1">
                {form.body_text.length}/1024 characters. Use {'{{1}}'}, {'{{2}}'}, etc. for dynamic values.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-theme-surface border border-theme rounded-xl p-5">
            <label className="block text-sm font-medium text-theme-secondary mb-1">Footer (optional)</label>
            <input
              type="text"
              value={form.footer_text}
              onChange={(e) => setForm({ ...form, footer_text: e.target.value })}
              placeholder="e.g. Sent via Opsly"
              maxLength={60}
              className="w-full px-3 py-2 bg-theme-button border border-theme rounded-lg text-sm text-theme-primary placeholder-gray-400 dark:placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Buttons */}
          <div className="bg-theme-surface border border-theme rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-theme-secondary">
                Buttons (optional, max 3)
              </label>
              {buttons.length < 3 && (
                <button
                  onClick={addButton}
                  className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add Button
                </button>
              )}
            </div>

            {buttons.map((btn, i) => (
              <div key={i} className="p-3 bg-gray-50 dark:bg-white/[0.02] border border-theme rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <select
                    value={btn.type}
                    onChange={(e) => updateButton(i, { type: e.target.value })}
                    className="px-2 py-1 bg-theme-button border border-theme rounded text-xs text-theme-primary"
                  >
                    {BUTTON_TYPES.map(bt => (
                      <option key={bt.value} value={bt.value}>{bt.label}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => removeButton(i)}
                    className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <input
                  type="text"
                  value={btn.text}
                  onChange={(e) => updateButton(i, { text: e.target.value })}
                  placeholder="Button label"
                  maxLength={25}
                  className="w-full px-3 py-1.5 bg-theme-button border border-theme rounded-lg text-sm text-theme-primary placeholder-gray-400 dark:placeholder-white/30"
                />
                {btn.type === 'URL' && (
                  <input
                    type="url"
                    value={btn.url || ''}
                    onChange={(e) => updateButton(i, { url: e.target.value })}
                    placeholder="https://example.com/{{1}}"
                    className="w-full px-3 py-1.5 bg-theme-button border border-theme rounded-lg text-sm text-theme-primary placeholder-gray-400 dark:placeholder-white/30"
                  />
                )}
                {btn.type === 'PHONE_NUMBER' && (
                  <input
                    type="tel"
                    value={btn.phone_number || ''}
                    onChange={(e) => updateButton(i, { phone_number: e.target.value })}
                    placeholder="+44 1234 567890"
                    className="w-full px-3 py-1.5 bg-theme-button border border-theme rounded-lg text-sm text-theme-primary placeholder-gray-400 dark:placeholder-white/30"
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right: Preview */}
        <div className="lg:sticky lg:top-6 self-start">
          <div className="bg-theme-surface border border-theme rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Eye className="w-4 h-4 text-theme-secondary" />
              <h4 className="text-sm font-semibold text-theme-primary">Message Preview</h4>
            </div>

            {/* WhatsApp-style preview bubble */}
            <div className="bg-[#e7fed6] dark:bg-emerald-900/30 rounded-lg p-4 max-w-sm space-y-2">
              {form.header_type === 'text' && form.header_text && (
                <p className="text-sm font-bold text-gray-900 dark:text-white">
                  {renderPreview(form.header_text)}
                </p>
              )}
              <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                {form.body_text ? renderPreview(form.body_text) : (
                  <span className="italic text-gray-400">Message body will appear here...</span>
                )}
              </p>
              {form.footer_text && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {form.footer_text}
                </p>
              )}
            </div>

            {/* Button preview */}
            {buttons.filter(b => b.text.trim()).length > 0 && (
              <div className="mt-2 space-y-1 max-w-sm">
                {buttons.filter(b => b.text.trim()).map((btn, i) => (
                  <div
                    key={i}
                    className="text-center py-2 border border-theme rounded-lg text-sm text-blue-600 dark:text-blue-400 bg-theme-surface"
                  >
                    {btn.text}
                  </div>
                ))}
              </div>
            )}

            {/* Category info */}
            <div className="mt-4 p-3 bg-theme-muted rounded-lg">
              <p className="text-xs text-theme-secondary">
                <strong>Category:</strong>{' '}
                {CATEGORIES.find(c => c.value === form.category)?.description}
              </p>
              <p className="text-xs text-theme-tertiary mt-1">
                Templates typically take 1-24 hours for Meta to review.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-theme">
        <button
          onClick={onBack}
          className="px-4 py-2 text-sm font-medium text-theme-secondary hover:text-theme-primary transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={!isValid || saving}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saving ? 'Submitting...' : 'Submit for Approval'}
        </button>
      </div>
    </div>
  );
}
