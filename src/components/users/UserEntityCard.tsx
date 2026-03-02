'use client';

import CardHeader from '@/components/ui/CardHeader';
import { Select } from '@/components/ui';
import { X, Archive, Save, Mail, ExternalLink } from '@/components/ui/icons';
import { components } from '@/styles/uiTokens';
import Link from 'next/link';
import '@/styles/globals.css';

interface UserEntityCardProps {
  user: any;
  subtitle: string;
  isExpanded: boolean;
  onToggle: () => void;
  editForm: any;
  onEditFormChange: (_updates: any) => void;
  roleOptions: any[];
  onRoleChange: (_userId: string, _role: string) => void;
  onSave: () => void;
  onCancel: () => void;
  siteOptions: any[];
  onArchive?: (_userId: string) => void;
  onUnarchive?: (_userId: string) => void;
  onSendInvite?: (_userId: string, _email: string) => void;
}

export default function UserEntityCard({
  user,
  subtitle,
  isExpanded,
  onToggle,
  editForm,
  onEditFormChange,
  roleOptions,
  onRoleChange,
  onSave,
  onCancel,
  siteOptions,
  onArchive,
  onUnarchive,
  onSendInvite,
}: UserEntityCardProps) {
  const statusLabels: Record<string, string> = {
    onboarding: 'Onboarding',
    active: 'Active',
    inactive: 'Inactive',
    on_leave: 'On Leave',
  };

  return (
    <div className="
 bg-theme-surface ] border border-theme rounded-xl p-3
      transition-all duration-150 ease-in-out
      hover:shadow-module-glow
    ">
      <CardHeader
        title={user.full_name || user.email || "\u2014"}
        subtitle={subtitle}
        showChevron
        onToggle={onToggle}
        expanded={isExpanded}
      />

      {isExpanded && editForm && (
        <div className="px-4 pb-3 border-t border-theme">
          <div className="p-4 space-y-4 overflow-visible">
            {/* Read-only info */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2">
              <div>
                <span className="text-xs text-gray-500 dark:text-theme-tertiary">Email</span>
                <p className="text-sm text-theme-primary truncate">{editForm.email || '\u2014'}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500 dark:text-theme-tertiary">Phone</span>
                <p className="text-sm text-theme-primary">{editForm.phone_number || '\u2014'}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500 dark:text-theme-tertiary">Position</span>
                <p className="text-sm text-theme-primary">{editForm.position_title || '\u2014'}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500 dark:text-theme-tertiary">Status</span>
                <p className="text-sm text-theme-primary">{statusLabels[editForm.status] || editForm.status || 'Onboarding'}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500 dark:text-theme-tertiary">BOH/FOH</span>
                <p className="text-sm text-theme-primary">{editForm.boh_foh || 'Not specified'}</p>
              </div>
            </div>

            {/* Editable fields: Role & Site */}
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-theme overflow-visible relative z-auto">
              {/* Role */}
              <div>
                <label className="text-xs text-gray-500 dark:text-theme-tertiary">Role</label>
                <Select
                  value={editForm.app_role}
                  options={roleOptions}
                  onValueChange={(val: string) => {
                    onEditFormChange({ app_role: val });
                    onRoleChange(user.id, val);
                  }}
                />
              </div>

              {/* Site */}
              <div>
                <label className="text-xs text-gray-500 dark:text-theme-tertiary">Site Assignment</label>
                <Select
                  value={editForm.home_site || 'HEAD_OFFICE'}
                  options={[
                    { label: 'Head Office (No Site)', value: 'HEAD_OFFICE' },
                    ...siteOptions
                  ]}
                  onValueChange={(val: string) => {
                    if (val === 'HEAD_OFFICE') {
                      onEditFormChange({ home_site: null, site_id: null });
                    } else {
                      onEditFormChange({ home_site: val });
                    }
                  }}
                />
                <p className="text-xs text-gray-500 dark:text-theme-tertiary mt-1">
                  {editForm.home_site ? 'Site-based employee' : 'Head office / Executive'}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-4">
              <button
                onClick={onSave}
                className={components.saveButton}
              >
                <Save size={18} />
              </button>

              <button
                onClick={onCancel}
                className={components.cancelButton}
              >
                <X size={18} />
              </button>

              {/* View Full Profile */}
              <Link
                href="/dashboard/people/employees"
                className="px-3 py-2 border border-theme text-theme-secondary rounded-md hover:bg-theme-hover transition-all duration-200 flex items-center gap-2 text-sm"
                title="View Full Profile"
              >
                <ExternalLink size={16} />
                Full Profile
              </Link>

              {/* Send Invite button */}
              {onSendInvite && user.email && (
                <button
                  onClick={() => onSendInvite(user.id, user.email)}
                  className="px-3 py-2 border border-[#D37E91] text-[#D37E91] rounded-md hover:shadow-module-glow transition-all duration-200 flex items-center gap-2"
                  title="Send Invitation Email"
                >
                  <Mail size={18} />
                  <span className="text-sm">Send Invite</span>
                </button>
              )}

              {/* Archive/Restore button */}
              {onUnarchive ? (
                <button
                  onClick={() => onUnarchive(user.id)}
                  className="px-3 py-2 border border-[#D37E91] text-[#D37E91] rounded-md hover:shadow-module-glow transition-all duration-200"
                  title="Restore User"
                >
                  Restore
                </button>
              ) : onArchive ? (
                <button
                  onClick={() => onArchive(user.id)}
                  className="px-3 py-2 border border-[#F97316] text-[#F97316] rounded-md hover:shadow-module-glow transition-all duration-200"
                  title="Archive User"
                >
                  <Archive size={18} />
                </button>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
