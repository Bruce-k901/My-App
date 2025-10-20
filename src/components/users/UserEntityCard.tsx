'use client';

import CardHeader from '@/components/ui/CardHeader';
import { Button, Input, Select } from '@/components/ui';
import { Eye, EyeOff, X, Archive, Save } from 'lucide-react';
import { useState } from 'react';
import { components } from '@/styles/uiTokens';
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
  showPinEdit: boolean;
  onPinEditToggle: () => void;
  onPinGenerate: () => void;
  siteOptions: any[];
  onArchive: (_userId: string) => void;
  onUnarchive: (_userId: string) => void;
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
  showPinEdit,
  onPinEditToggle,
  onPinGenerate,
  siteOptions,
  onArchive,
  onUnarchive,
}: UserEntityCardProps) {
  const [showPin, setShowPin] = useState(false);

  return (
    <div className="
      group relative rounded-xl
      bg-[#111827] text-white
      border border-[#1F2937]
      transition-colors transition-shadow duration-150
      hover:border-[#EC4899]
      hover:shadow-[0_0_0_1px_rgba(236,72,153,0.55),0_0_12px_rgba(236,72,153,0.35)]
    ">
      <CardHeader 
        title={user.full_name || user.email || "—"} 
        subtitle={subtitle} 
        showChevron 
        onToggle={onToggle} 
        expanded={isExpanded} 
      />

      {isExpanded && editForm && (
        <div className="px-4 pb-3 separator-line">
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3 overflow-visible relative z-auto">
              {/* Full Name */}
              <div>
                <label className="text-xs text-neutral-400">Full Name</label>
                <Input
                  value={editForm.full_name}
                  onChange={(e) => onEditFormChange({ full_name: e.target.value })}
                />
              </div>

              {/* Email */}
              <div>
                <label className="text-xs text-neutral-400">Email</label>
                <Input
                  value={editForm.email}
                  onChange={(e) => onEditFormChange({ email: e.target.value })}
                />
              </div>

              {/* Role */}
              <div>
                <label className="text-xs text-neutral-400">Role</label>
                <Select
                  value={editForm.role}
                  options={roleOptions}
                  onValueChange={(val: string) => {
                    onEditFormChange({ role: val });
                    onRoleChange(user.id, val);
                  }}
                />
              </div>

              {/* Position Title */}
              <div>
                <label className="text-xs text-neutral-400">Position Title</label>
                <Select
                  value={editForm.position_title}
                  options={[
                    { label: "General Manager", value: "general_manager" },
                    { label: "Assistant Manager", value: "assistant_manager" },
                    { label: "Head Chef", value: "head_chef" },
                    { label: "Sous Chef", value: "sous_chef" },
                    { label: "Staff", value: "staff" },
                    { label: "Owner", value: "owner" },
                    { label: "Admin", value: "admin" },
                    { label: "Head Office", value: "head_office" },
                    { label: "Other", value: "other" }
                  ]}
                  onValueChange={(val: string) => onEditFormChange({ position_title: val })}
                />
              </div>

              {/* Site */}
              <div>
                <label className="text-xs text-neutral-400">Site</label>
                <Select
                  value={editForm.site_name}
                  options={siteOptions}
                  onValueChange={(val: string) => onEditFormChange({ site_name: val })}
                />
              </div>

              {/* BOH/FOH */}
              <div>
                <label className="text-xs text-neutral-400">BOH/FOH</label>
                <Select
                  value={editForm.boh_foh}
                  options={[
                    { value: "BOH", label: "BOH" },
                    { value: "FOH", label: "FOH" },
                    { value: "not_specified", label: "Not specified" }
                  ]}
                  onValueChange={(val: string) => onEditFormChange({ boh_foh: val })}
                />
              </div>

              {/* Phone */}
              <div>
                <label className="text-xs text-neutral-400">Phone</label>
                <Input
                  value={editForm.phone_number}
                  onChange={(e) => onEditFormChange({ phone_number: e.target.value })}
                />
              </div>

              {/* PIN Code */}
              <div>
                <label className="text-xs text-neutral-400">PIN Code</label>
                <div className="pin-field-container">
                  <div className="relative pin-field-width">
                    <input
                      type={showPin ? "text" : "password"}
                      value={editForm.pin_code || ""}
                      onChange={(e) => onEditFormChange({ pin_code: e.target.value })}
                      className="input-with-icon"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="icon-absolute text-[#EC4899] hover:text-[#ff5faf]"
                    >
                      {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <button
                    onClick={onPinGenerate}
                    className="btn-primary-glass"
                  >
                    Generate
                  </button>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="button-group">
              <button
                onClick={onSave}
                className="btn-primary"
              >
                <Save size={18} />
              </button>

              <button
                onClick={onCancel}
                className="btn-primary"
              >
                <X size={18} />
              </button>

              {/* Archive button positioned absolutely */}
              {user.archived ? (
                <button
                  onClick={() => onUnarchive(user.id)}
                  className="btn-archive icon-archive-position"
                >
                  <Archive size={18} />
                </button>
              ) : (
                <button
                  onClick={() => onArchive(user.id)}
                  className="btn-archive icon-archive-position"
                >
                  <Archive size={18} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}