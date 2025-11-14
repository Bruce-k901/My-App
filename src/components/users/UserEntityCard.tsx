'use client';

import CardHeader from '@/components/ui/CardHeader';
import { Input, Select } from '@/components/ui';
import { Eye, EyeOff, X, Archive, Save } from 'lucide-react';
import { useState } from 'react';
import { components, layout } from '@/styles/uiTokens';
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
      bg-white/[0.05] border border-white/[0.1] rounded-xl p-3
      transition-all duration-150 ease-in-out
      hover:shadow-[0_0_15px_rgba(236,72,153,0.2)]
    ">
      <CardHeader 
        title={user.full_name || user.email || "—"} 
        subtitle={subtitle} 
        showChevron 
        onToggle={onToggle} 
        expanded={isExpanded} 
      />

      {isExpanded && editForm && (
        <div className="px-4 pb-3 border-t border-white/[0.1]">
          <div className="p-4 space-y-4 overflow-visible">
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
                  value={editForm.app_role}
                  options={roleOptions}
                  onValueChange={(val: string) => {
                    onEditFormChange({ app_role: val });
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
                    { label: "General Manager", value: "General Manager" },
                    { label: "Assistant Manager", value: "Assistant Manager" },
                    { label: "Head Chef", value: "Head Chef" },
                    { label: "Sous Chef", value: "Sous Chef" },
                    { label: "Staff", value: "Staff" },
                    { label: "Owner", value: "Owner" },
                    { label: "Admin", value: "Admin" },
                    { label: "Head Office", value: "Head Office" },
                    { label: "Other", value: "Other" }
                  ]}
                  onValueChange={(val: string) => onEditFormChange({ position_title: val })}
                />
              </div>

              {/* Site */}
              <div>
                <label className="text-xs text-neutral-400">Site</label>
                <Select
                  value={editForm.home_site}
                  options={siteOptions}
                  onValueChange={(val: string) => onEditFormChange({ home_site: val })}
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
                <div className={layout.pinFieldContainer}>
                  <div className={`relative ${layout.pinFieldWidth}`}>
                    <input
                      type={showPin ? "text" : "password"}
                      value={editForm.pin_code || ""}
                      onChange={(e) => onEditFormChange({ pin_code: e.target.value })}
                      className={components.pinField}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className={components.pinToggleButton}
                    >
                      {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <button
                    onClick={onPinGenerate}
                    className={components.generateButton}
                  >
                    Generate
                  </button>
                </div>
              </div>
            </div>

            {/* Training Certificates Section */}
            <div className="mt-6 pt-6 border-t border-white/[0.1]">
              <h3 className="text-base font-semibold text-white mb-4">Training Certificates</h3>
              
              <div className="space-y-4">
                {/* Food Safety */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-neutral-400">Food Safety Level</label>
                    <Select
                      value={editForm.food_safety_level ? editForm.food_safety_level.toString() : undefined}
                      placeholder="Select Level"
                      options={[
                        { label: "Level 2", value: "2" },
                        { label: "Level 3", value: "3" },
                        { label: "Level 4", value: "4" },
                        { label: "Level 5", value: "5" }
                      ]}
                      onValueChange={(val: string) => onEditFormChange({ 
                        food_safety_level: val ? parseInt(val) : null
                      })}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-neutral-400">Food Safety Expiry Date</label>
                    <Input
                      type="date"
                      value={editForm.food_safety_expiry_date ? editForm.food_safety_expiry_date.split('T')[0] : ""}
                      onChange={(e) => onEditFormChange({ food_safety_expiry_date: e.target.value || null })}
                    />
                  </div>
                </div>

                {/* H&S */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-neutral-400">H&S Level</label>
                    <Select
                      value={editForm.h_and_s_level ? editForm.h_and_s_level.toString() : undefined}
                      placeholder="Select Level"
                      options={[
                        { label: "Level 2", value: "2" },
                        { label: "Level 3", value: "3" },
                        { label: "Level 4", value: "4" }
                      ]}
                      onValueChange={(val: string) => onEditFormChange({ 
                        h_and_s_level: val ? parseInt(val) : null
                      })}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-neutral-400">H&S Expiry Date</label>
                    <Input
                      type="date"
                      value={editForm.h_and_s_expiry_date ? editForm.h_and_s_expiry_date.split('T')[0] : ""}
                      onChange={(e) => onEditFormChange({ h_and_s_expiry_date: e.target.value || null })}
                    />
                  </div>
                </div>

                {/* Fire Marshal */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-neutral-400 mb-2 block">Fire Marshal Trained</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={editForm.fire_marshal_trained || false}
                        onChange={(e) => onEditFormChange({ fire_marshal_trained: e.target.checked })}
                        className="w-4 h-4 rounded border-neutral-600 bg-neutral-800 text-pink-600 focus:ring-pink-500"
                      />
                      <span className="text-xs text-neutral-400">
                        {editForm.fire_marshal_trained ? "Yes" : "No"}
                      </span>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-neutral-400">Fire Marshal Expiry Date</label>
                    <Input
                      type="date"
                      value={editForm.fire_marshal_expiry_date ? editForm.fire_marshal_expiry_date.split('T')[0] : ""}
                      onChange={(e) => onEditFormChange({ fire_marshal_expiry_date: e.target.value || null })}
                      disabled={!editForm.fire_marshal_trained}
                    />
                  </div>
                </div>

                {/* First Aid */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-neutral-400 mb-2 block">First Aid Trained</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={editForm.first_aid_trained || false}
                        onChange={(e) => onEditFormChange({ first_aid_trained: e.target.checked })}
                        className="w-4 h-4 rounded border-neutral-600 bg-neutral-800 text-pink-600 focus:ring-pink-500"
                      />
                      <span className="text-xs text-neutral-400">
                        {editForm.first_aid_trained ? "Yes" : "No"}
                      </span>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-neutral-400">First Aid Expiry Date</label>
                    <Input
                      type="date"
                      value={editForm.first_aid_expiry_date ? editForm.first_aid_expiry_date.split('T')[0] : ""}
                      onChange={(e) => onEditFormChange({ first_aid_expiry_date: e.target.value || null })}
                      disabled={!editForm.first_aid_trained}
                    />
                  </div>
                </div>

                {/* COSSH */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-neutral-400 mb-2 block">COSSH Trained</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={editForm.cossh_trained || false}
                        onChange={(e) => onEditFormChange({ cossh_trained: e.target.checked })}
                        className="w-4 h-4 rounded border-neutral-600 bg-neutral-800 text-pink-600 focus:ring-pink-500"
                      />
                      <span className="text-xs text-neutral-400">
                        {editForm.cossh_trained ? "Yes" : "No"}
                      </span>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-neutral-400">COSSH Expiry Date</label>
                    <Input
                      type="date"
                      value={editForm.cossh_expiry_date ? editForm.cossh_expiry_date.split('T')[0] : ""}
                      onChange={(e) => onEditFormChange({ cossh_expiry_date: e.target.value || null })}
                      disabled={!editForm.cossh_trained}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className={layout.buttonGroup}>
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

              {/* Archive/Restore button */}
              {onUnarchive ? (
                <button
                  onClick={() => onUnarchive(user.id)}
                  className="px-3 py-2 border border-[#EC4899] text-[#EC4899] rounded-md hover:shadow-[0_0_12px_rgba(236,72,153,0.7)] transition-all duration-200"
                  title="Restore User"
                >
                  Restore
                </button>
              ) : onArchive ? (
                <button
                  onClick={() => onArchive(user.id)}
                  className={components.archiveButton}
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