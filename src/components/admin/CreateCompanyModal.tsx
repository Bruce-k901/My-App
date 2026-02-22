'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Eye, EyeOff, RefreshCw, Copy, Check, Building2, Loader2 } from '@/components/ui/icons';

interface CreateCompanyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

function generatePassword(): string {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const digits = '0123456789';
  const all = lowercase + uppercase + digits;
  let password =
    lowercase[Math.floor(Math.random() * lowercase.length)] +
    uppercase[Math.floor(Math.random() * uppercase.length)] +
    digits[Math.floor(Math.random() * digits.length)];
  for (let i = 0; i < 5; i++) {
    password += all[Math.floor(Math.random() * all.length)];
  }
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

export default function CreateCompanyModal({ open, onOpenChange, onSuccess }: CreateCompanyModalProps) {
  const [form, setForm] = useState({
    companyName: '',
    industry: '',
    ownerEmail: '',
    ownerFullName: '',
    temporaryPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ email: string; password: string; companyName: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleGeneratePassword = () => {
    setForm(prev => ({ ...prev, temporaryPassword: generatePassword() }));
    setShowPassword(true);
  };

  const handleCopyCredentials = () => {
    if (!success) return;
    const text = `Company: ${success.companyName}\nEmail: ${success.email}\nTemporary Password: ${success.password}\n\nLogin at: ${window.location.origin}/login`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/companies/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create company');

      setSuccess({
        email: form.ownerEmail,
        password: form.temporaryPassword,
        companyName: form.companyName,
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset state after closing
    setTimeout(() => {
      setForm({ companyName: '', industry: '', ownerEmail: '', ownerFullName: '', temporaryPassword: '' });
      setError(null);
      setSuccess(null);
      setShowPassword(false);
      setCopied(false);
    }, 200);
  };

  const inputClass = 'w-full h-10 rounded-lg border border-gray-300 px-3 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#D37E91]/40 focus:border-[#D37E91]/40';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#D37E91]" />
            {success ? 'Company Created' : 'Create Company'}
          </DialogTitle>
        </DialogHeader>

        {success ? (
          <div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <p className="text-green-700 font-medium text-sm">Company created successfully</p>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2 text-sm">
              <div>
                <span className="text-gray-500">Company:</span>{' '}
                <span className="text-gray-900 font-medium">{success.companyName}</span>
              </div>
              <div>
                <span className="text-gray-500">Email:</span>{' '}
                <span className="text-gray-900 font-medium">{success.email}</span>
              </div>
              <div>
                <span className="text-gray-500">Temporary Password:</span>{' '}
                <span className="text-gray-900 font-mono font-medium">{success.password}</span>
              </div>
            </div>

            <DialogFooter>
              <button
                onClick={handleCopyCredentials}
                className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied' : 'Copy Credentials'}
              </button>
              <button
                onClick={handleClose}
                className="px-4 py-2.5 bg-[#D37E91] text-white rounded-lg text-sm font-medium hover:bg-[#C06B7E] transition-colors"
              >
                Done
              </button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-1.5">Company Name *</label>
              <input
                name="companyName"
                value={form.companyName}
                onChange={handleChange}
                required
                placeholder="e.g. Acme Hospitality"
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-gray-700 text-sm font-medium mb-1.5">Industry</label>
              <input
                name="industry"
                value={form.industry}
                onChange={handleChange}
                placeholder="e.g. Hospitality, Retail"
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-gray-700 text-sm font-medium mb-1.5">Owner Full Name *</label>
              <input
                name="ownerFullName"
                value={form.ownerFullName}
                onChange={handleChange}
                required
                placeholder="e.g. John Smith"
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-gray-700 text-sm font-medium mb-1.5">Owner Email *</label>
              <input
                name="ownerEmail"
                type="email"
                value={form.ownerEmail}
                onChange={handleChange}
                required
                placeholder="e.g. john@acme.com"
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-gray-700 text-sm font-medium mb-1.5">Temporary Password *</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    name="temporaryPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={form.temporaryPassword}
                    onChange={handleChange}
                    required
                    minLength={8}
                    placeholder="Min 8 characters"
                    className={`${inputClass} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleGeneratePassword}
                  className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200 transition-colors whitespace-nowrap"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Generate
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <DialogFooter>
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2.5 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#D37E91] text-white rounded-lg text-sm font-medium hover:bg-[#C06B7E] transition-colors disabled:opacity-50"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? 'Creating...' : 'Create Company'}
              </button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
