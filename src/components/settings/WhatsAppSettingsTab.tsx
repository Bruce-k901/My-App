'use client';

import { useState } from 'react';
import { MessageCircle } from '@/components/ui/icons';
import TemplateList from '@/components/whatsapp/TemplateList';
import TemplateBuilder from '@/components/whatsapp/TemplateBuilder';
import ContactManager from '@/components/whatsapp/ContactManager';

// ============================================================================
// WhatsApp Settings Tab — manages templates, contacts, and connection config
// ============================================================================

type SubView = 'templates' | 'builder' | 'contacts';

export function WhatsAppSettingsTab() {
  const [view, setView] = useState<SubView>('templates');

  if (view === 'builder') {
    return (
      <TemplateBuilder
        onBack={() => setView('templates')}
        onSaved={() => setView('templates')}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Sub-tabs */}
      <div className="flex gap-1 p-1 bg-theme-muted rounded-lg w-fit">
        <button
          onClick={() => setView('templates')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            view === 'templates'
              ? 'bg-theme-surface text-theme-primary shadow-sm'
              : 'text-theme-secondary hover:text-theme-primary'
          }`}
        >
          Templates
        </button>
        <button
          onClick={() => setView('contacts')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            view === 'contacts'
              ? 'bg-theme-surface text-theme-primary shadow-sm'
              : 'text-theme-secondary hover:text-theme-primary'
          }`}
        >
          Contacts
        </button>
      </div>

      {view === 'templates' && (
        <TemplateList onCreateNew={() => setView('builder')} />
      )}

      {view === 'contacts' && <ContactManager />}
    </div>
  );
}
