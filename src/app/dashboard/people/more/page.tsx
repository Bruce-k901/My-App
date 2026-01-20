'use client';

import Link from 'next/link';
import {
  Users,
  CalendarDays,
  Clock,
  GraduationCap,
  Target,
  Wallet,
  Briefcase,
  Settings,
  UserPlus,
} from 'lucide-react';

const moreNavItems = [
  { href: '/dashboard/people/training', icon: GraduationCap, label: 'Training' },
  { href: '/dashboard/people/reviews', icon: Target, label: 'Performance' },
  { href: '/dashboard/people/payroll/my-payslips', icon: Wallet, label: 'My Payslips' },
  { href: '/dashboard/people/recruitment', icon: Briefcase, label: 'Recruitment' },
  { href: '/dashboard/people/settings', icon: Settings, label: 'Settings' },
];

export default function MorePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">More</h1>
        <p className="text-neutral-400">Additional Teamly features</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {moreNavItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-6 hover:border-[#EC4899]/50 transition-colors group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#EC4899] to-blue-500 flex items-center justify-center flex-shrink-0">
                <item.icon className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-white group-hover:text-[#EC4899] transition-colors">
                  {item.label}
                </h3>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

