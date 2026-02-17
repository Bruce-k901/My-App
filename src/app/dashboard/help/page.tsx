'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Ticket,
  Mail,
  Phone,
  ChevronRight,
  ChevronDown,
  BookOpen,
  Sparkles,
  CheckSquare,
  Package,
  Users,
  CalendarDays,
  Wrench,
  BarChart3,
  Shield,
  Settings,
} from '@/components/ui/icons';
import { usePanelStore } from '@/lib/stores/panel-store';
import { useUserTicketNotifications } from '@/hooks/tickets/useUserTicketNotifications';

const HELP_SECTIONS = [
  {
    title: 'Getting Started',
    desc: 'Set up your organisation and invite your team',
    icon: Settings,
    items: [
      'Your admin sets up the company, adds sites and invites staff from People > Team Members.',
      'Each team member gets a role (owner, admin, manager, staff) which controls what they can see and do.',
      'Download Opsly on your phone and log in with the email your admin invited you with.',
      'Your home dashboard shows KPIs, upcoming tasks, and quick actions relevant to your role.',
      'Use the sidebar on desktop or the bottom nav on mobile to switch between modules.',
    ],
  },
  {
    title: 'Daily Tasks & Checklists',
    desc: 'Complete daily tasks, food safety checks, and compliance workflows',
    icon: CheckSquare,
    items: [
      'Open Tasks from the bottom nav to see everything due today, grouped by time of day.',
      'Tap a task to expand it, fill in any required fields, and mark it complete.',
      'Missed tasks are flagged automatically — your manager is notified after the deadline passes.',
      'Recurring tasks (opening checks, temperature logs, cleaning schedules) repeat on the days set by your admin.',
      'Need a new task or template? Ask your manager or use Ask Opsly to raise a request.',
    ],
  },
  {
    title: 'Stock & Inventory',
    desc: 'Manage stock levels, deliveries, waste tracking, and orders',
    icon: Package,
    items: [
      'Record deliveries by scanning or searching for products and entering quantities received.',
      'Use the Waste Log to record any waste — select the product, enter the amount and reason.',
      'Stock takes can be started from the Stock page; work through each category and confirm counts.',
      'Low-stock alerts appear on your dashboard when items fall below their minimum threshold.',
      'Suppliers and order templates are managed by admins under Stock > Suppliers.',
    ],
  },
  {
    title: 'People & HR',
    desc: 'Time and attendance, training, rotas, and team management',
    icon: Users,
    items: [
      'Clock in and out from the Time & Attendance page — your hours are tracked automatically.',
      'View your rota from the Calendar tab to see your upcoming shifts.',
      'Training certificates (food safety, first aid, fire marshal, COSHH) are tracked under People > Training.',
      'You will get reminders when a certificate is due to expire — upload the new one to clear the alert.',
      'Holiday requests and absence records are managed under People > Leave.',
    ],
  },
  {
    title: 'Scheduling & Rotas',
    desc: 'Shift planning, availability, and calendar management',
    icon: CalendarDays,
    items: [
      'Managers create rotas from the Rota page — drag shifts or use templates for quick setup.',
      'Staff can view their published rota from the Calendar tab on mobile.',
      'Set your availability from People > My Profile so managers know when you can work.',
      'Shift swaps can be requested through the rota — the manager approves or declines.',
      'Overtime is flagged automatically when hours exceed the contracted amount.',
    ],
  },
  {
    title: 'Asset Management & PPMs',
    desc: 'Track equipment, schedule services, and manage contractors',
    icon: Wrench,
    items: [
      'All company assets (fridges, ovens, fire extinguishers, etc.) are listed under Assets.',
      'Each asset has a PPM (planned preventive maintenance) schedule — you will get reminders when service is due.',
      'To log a completed service, open the PPM task and tap "Log Service" — attach the certificate if you have one.',
      'If something breaks, raise a callout from the asset page to notify the assigned contractor.',
      'Contractors and their contact details are managed by admins under Assets > Contractors.',
    ],
  },
  {
    title: 'Reports & Compliance',
    desc: 'Generate reports, view compliance scores, and stay audit-ready',
    icon: BarChart3,
    items: [
      'The Compliance page shows your site\'s overall compliance score based on completed tasks and checks.',
      'EHO and audit reports can be generated from Reports — they pull data from your completed checklists.',
      'Temperature logs, cleaning records, and safety checks are all stored and downloadable as PDFs.',
      'Managers can view team compliance across sites from the dashboard widgets.',
      'Historical data is retained for 12 months — older records are archived automatically.',
    ],
  },
  {
    title: 'Health & Safety',
    desc: 'Incident reporting, risk assessments, and safety documentation',
    icon: Shield,
    items: [
      'Report incidents immediately using the Incident Report form under Health & Safety.',
      'Risk assessments are stored and can be reviewed or updated from the Compliance section.',
      'Fire safety checks, first aid kit inspections, and H&S walks are set up as recurring tasks.',
      'COSHH data sheets for chemicals are stored under Assets — each product links to its safety sheet.',
      'Near-miss reporting helps track potential hazards before they become incidents.',
    ],
  },
];

export default function HelpPage() {
  const router = useRouter();
  const { setAiAssistantOpen } = usePanelStore();
  const { unreadCount } = useUserTicketNotifications();
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

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
          href="mailto:hello@opslytech.com"
          className="w-full flex items-center gap-4 p-4 rounded-xl backdrop-blur-sm bg-black/[0.02] dark:bg-white/[0.06] border border-black/[0.04] dark:border-white/[0.10] active:scale-[0.98] transition-all touch-manipulation"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
            <Mail className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-medium text-theme-primary">Email Support</p>
            <p className="text-xs text-theme-tertiary mt-0.5">hello@opslytech.com</p>
          </div>
          <ChevronRight className="w-4 h-4 text-theme-tertiary flex-shrink-0" />
        </a>

        {/* Contact — Phone */}
        <a
          href="tel:+4407891710002"
          className="w-full flex items-center gap-4 p-4 rounded-xl backdrop-blur-sm bg-black/[0.02] dark:bg-white/[0.06] border border-black/[0.04] dark:border-white/[0.10] active:scale-[0.98] transition-all touch-manipulation"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
            <Phone className="w-5 h-5 text-amber-400" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-medium text-theme-primary">Phone Support</p>
            <p className="text-xs text-theme-tertiary mt-0.5">07891 710002 — Mon–Fri, 9am–6pm</p>
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
          {HELP_SECTIONS.map((section) => {
            const Icon = section.icon;
            const isOpen = expandedSection === section.title;
            return (
              <div key={section.title}>
                <button
                  onClick={() => setExpandedSection(isOpen ? null : section.title)}
                  className="w-full flex items-center gap-3 p-4 text-left active:bg-black/[0.04] dark:active:bg-white/[0.04] transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-black/[0.03] dark:bg-white/[0.08] flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-theme-secondary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-theme-primary">{section.title}</p>
                    <p className="text-xs text-theme-tertiary mt-0.5">{section.desc}</p>
                  </div>
                  {isOpen ? (
                    <ChevronDown className="w-4 h-4 text-theme-tertiary flex-shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-theme-tertiary flex-shrink-0" />
                  )}
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 pl-[60px]">
                    <ul className="space-y-2.5">
                      {section.items.map((item, i) => (
                        <li key={i} className="text-xs text-theme-secondary leading-relaxed flex gap-2">
                          <span className="text-theme-tertiary mt-0.5 flex-shrink-0">&#8226;</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
