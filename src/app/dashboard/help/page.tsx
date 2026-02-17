'use client';

import { useRouter } from 'next/navigation';
import {
  Ticket,
  Mail,
  Phone,
  ChevronRight,
  BookOpen,
  Sparkles,
} from '@/components/ui/icons';
import { usePanelStore } from '@/lib/stores/panel-store';
import { useUserTicketNotifications } from '@/hooks/tickets/useUserTicketNotifications';

export default function HelpPage() {
  const router = useRouter();
  const { setAiAssistantOpen } = usePanelStore();
  const { unreadCount } = useUserTicketNotifications();

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6 pb-28">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-theme-primary">Help & Support</h1>
        <p className="text-sm text-theme-tertiary mt-1">
          Get help, raise a ticket, or chat with Opsly
        </p>
      </div>

      {/* Ask Opsly — primary CTA */}
      <button
        onClick={() => setAiAssistantOpen(true)}
        className="w-full flex items-center gap-4 p-4 rounded-xl bg-[#D37E91]/10 border border-[#D37E91]/30 active:scale-[0.98] transition-all touch-manipulation"
      >
        <div className="w-12 h-12 rounded-xl bg-[#D37E91]/20 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-6 h-6 text-[#D37E91]" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-semibold text-[#D37E91]">Ask Opsly</p>
          <p className="text-xs text-theme-tertiary mt-0.5">
            AI assistant for instant help & ticket creation
          </p>
        </div>
        <ChevronRight className="w-5 h-5 text-[#D37E91]/60 flex-shrink-0" />
      </button>

      {/* Quick Links */}
      <div className="space-y-2">
        <h2 className="text-xs font-semibold text-theme-tertiary uppercase tracking-wider">
          Support
        </h2>

        {/* My Tickets */}
        <button
          onClick={() => router.push('/dashboard/support/my-tickets')}
          className="w-full flex items-center gap-4 p-4 rounded-xl backdrop-blur-sm bg-black/[0.02] dark:bg-white/[0.06] border border-black/[0.04] dark:border-white/[0.10] active:scale-[0.98] transition-all touch-manipulation"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
            <Ticket className="w-5 h-5 text-blue-400" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-medium text-theme-primary">My Tickets</p>
            <p className="text-xs text-theme-tertiary mt-0.5">View and track your support requests</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {unreadCount > 0 && (
              <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-xs font-semibold flex items-center justify-center">
                {unreadCount}
              </span>
            )}
            <ChevronRight className="w-4 h-4 text-theme-tertiary" />
          </div>
        </button>

        {/* Contact — Email */}
        <a
          href="mailto:support@opsly.app"
          className="w-full flex items-center gap-4 p-4 rounded-xl backdrop-blur-sm bg-black/[0.02] dark:bg-white/[0.06] border border-black/[0.04] dark:border-white/[0.10] active:scale-[0.98] transition-all touch-manipulation"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
            <Mail className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-medium text-theme-primary">Email Support</p>
            <p className="text-xs text-theme-tertiary mt-0.5">support@opsly.app</p>
          </div>
          <ChevronRight className="w-4 h-4 text-theme-tertiary flex-shrink-0" />
        </a>

        {/* Contact — Phone */}
        <a
          href="tel:+1234567890"
          className="w-full flex items-center gap-4 p-4 rounded-xl backdrop-blur-sm bg-black/[0.02] dark:bg-white/[0.06] border border-black/[0.04] dark:border-white/[0.10] active:scale-[0.98] transition-all touch-manipulation"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
            <Phone className="w-5 h-5 text-amber-400" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-medium text-theme-primary">Phone Support</p>
            <p className="text-xs text-theme-tertiary mt-0.5">Mon–Fri, 9am–6pm</p>
          </div>
          <ChevronRight className="w-4 h-4 text-theme-tertiary flex-shrink-0" />
        </a>
      </div>

      {/* Help Center */}
      <div className="space-y-2">
        <h2 className="text-xs font-semibold text-theme-tertiary uppercase tracking-wider">
          Help Center
        </h2>

        <div className="rounded-xl backdrop-blur-sm bg-black/[0.02] dark:bg-white/[0.06] border border-black/[0.04] dark:border-white/[0.10] divide-y divide-black/[0.04] dark:divide-white/[0.08]">
          {[
            { title: 'Getting Started', desc: 'Set up your organisation and invite your team' },
            { title: 'Tasks & Checklists', desc: 'Create tasks, templates, and compliance workflows' },
            { title: 'Asset Management', desc: 'Track assets, schedule PPMs, and manage contractors' },
            { title: 'Reports & Compliance', desc: 'Generate reports and stay audit-ready' },
          ].map((item) => (
            <div key={item.title} className="flex items-center gap-3 p-4">
              <BookOpen className="w-4 h-4 text-theme-tertiary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-theme-primary">{item.title}</p>
                <p className="text-xs text-theme-tertiary mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
