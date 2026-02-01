'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/context/AppContext';
import { Building2, Briefcase, ArrowRight, Users, MapPin, GraduationCap, User } from 'lucide-react';
import AddExecutiveModal from '@/components/users/AddExecutiveModal';

export default function AddEmployeeChoicePage() {
  const router = useRouter();
  const { profile } = useAppContext();
  const [showExecutiveModal, setShowExecutiveModal] = useState(false);
  
  return (
    <div className="min-h-screen bg-theme-surface p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="text-theme-secondary hover:text-theme-primary mb-4 flex items-center gap-2 transition-colors"
          >
            ← Back
          </button>
          <h1 className="text-3xl font-bold text-theme-primary mb-2">Add New Employee</h1>
          <p className="text-theme-secondary">Choose the type of employee you want to add</p>
        </div>

        {/* Two Options */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Option 1: Head Office / Executive */}
          <button
            onClick={() => setShowExecutiveModal(true)}
            className="group relative bg-theme-button border-2 border-blue-300 dark:border-blue-500/50 rounded-2xl p-8 text-left hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-[0_0_30px_rgba(59,130,246,0.2)] dark:hover:shadow-[0_0_30px_rgba(59,130,246,0.3)] transition-all duration-300"
          >
            {/* Icon */}
            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Briefcase className="w-8 h-8 text-blue-500 dark:text-blue-400" />
            </div>

            {/* Title */}
            <h2 className="text-2xl font-bold text-theme-primary mb-3 flex items-center gap-2">
              Head Office / Executive
              <ArrowRight className="w-5 h-5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-blue-500 dark:text-blue-400" />
            </h2>

            {/* Description */}
            <p className="text-theme-secondary mb-6">
              Streamlined form for leadership and non-site based staff
            </p>

            {/* Features */}
            <div className="space-y-3 mb-6">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-blue-500/20 dark:bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-500 dark:text-blue-400 text-xs">✓</span>
                </div>
                <p className="text-sm text-theme-secondary">Quick setup - only essential fields</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-blue-500/20 dark:bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-500 dark:text-blue-400 text-xs">✓</span>
                </div>
                <p className="text-sm text-theme-secondary">No site assignment needed</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-blue-500/20 dark:bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-500 dark:text-blue-400 text-xs">✓</span>
                </div>
                <p className="text-sm text-theme-secondary">Appears in org chart by role</p>
              </div>
            </div>

            {/* Best For */}
            <div className="pt-4 border-t border-blue-300 dark:border-blue-500/30">
              <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold mb-2">BEST FOR:</p>
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-1 bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs rounded-full">CEO</span>
                <span className="px-2 py-1 bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs rounded-full">COO</span>
                <span className="px-2 py-1 bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs rounded-full">CFO</span>
                <span className="px-2 py-1 bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs rounded-full">HR Manager</span>
                <span className="px-2 py-1 bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs rounded-full">Regional Manager</span>
              </div>
            </div>
          </button>

          {/* Option 2: Site Employee */}
          <button
            onClick={() => router.push('/dashboard/people/directory/new-site')}
            className="group relative bg-theme-button border-2 border-blue-300 dark:border-blue-500/50 rounded-2xl p-8 text-left hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-[0_0_30px_rgba(59,130,246,0.2)] dark:hover:shadow-[0_0_30px_rgba(59,130,246,0.3)] transition-all duration-300"
          >
            {/* Icon */}
            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Building2 className="w-8 h-8 text-blue-500 dark:text-blue-400" />
            </div>

            {/* Title */}
            <h2 className="text-2xl font-bold text-theme-primary mb-3 flex items-center gap-2">
              Site Employee
              <ArrowRight className="w-5 h-5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-blue-500 dark:text-blue-400" />
            </h2>

            {/* Description */}
            <p className="text-theme-secondary mb-6">
              Comprehensive form for site-based operational staff
            </p>

            {/* Features */}
            <div className="space-y-3 mb-6">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-blue-500/20 dark:bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-500 dark:text-blue-400 text-xs">✓</span>
                </div>
                <p className="text-sm text-theme-secondary">Complete employee profile</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-blue-500/20 dark:bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-500 dark:text-blue-400 text-xs">✓</span>
                </div>
                <p className="text-sm text-theme-secondary">Site assignment & sections (BOH/FOH)</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-blue-500/20 dark:bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-500 dark:text-blue-400 text-xs">✓</span>
                </div>
                <p className="text-sm text-theme-secondary">Training certificates & compliance</p>
              </div>
            </div>

            {/* Best For */}
            <div className="pt-4 border-t border-blue-300 dark:border-blue-500/30">
              <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold mb-2">BEST FOR:</p>
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-1 bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs rounded-full">Site Manager</span>
                <span className="px-2 py-1 bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs rounded-full">Kitchen Staff</span>
                <span className="px-2 py-1 bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs rounded-full">FOH Staff</span>
                <span className="px-2 py-1 bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs rounded-full">Operations</span>
              </div>
            </div>
          </button>
        </div>

        {/* Help Text */}
        <div className="mt-8 p-6 bg-blue-500/10 dark:bg-blue-500/10 border border-blue-300 dark:border-blue-500/50 rounded-xl">
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 dark:bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-blue-500 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-theme-primary font-semibold mb-2">Not sure which to choose?</h3>
              <ul className="space-y-2 text-sm text-theme-secondary">
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 dark:text-blue-400 mt-1">•</span>
                  <span><strong className="text-blue-600 dark:text-blue-400">Head Office:</strong> For executives, managers, and staff who don't work at a specific site</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 dark:text-blue-400 mt-1">•</span>
                  <span><strong className="text-blue-600 dark:text-blue-400">Site Employee:</strong> For staff who work at a physical location and need full operational details</span>
                </li>
              </ul>
              <p className="text-xs text-theme-tertiary mt-3">
                💡 Tip: You can always edit employee details later, so don't worry about choosing wrong!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Executive Modal */}
      {profile?.company_id && (
        <AddExecutiveModal
          open={showExecutiveModal}
          onClose={() => setShowExecutiveModal(false)}
          companyId={profile.company_id}
          onRefresh={() => {
            // After adding, go back to employees list
            router.push('/dashboard/people/employees');
          }}
        />
      )}
    </div>
  );
}
