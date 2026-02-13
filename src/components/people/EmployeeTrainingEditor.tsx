import React from 'react';
import { GraduationCap } from '@/components/ui/icons';

interface EmployeeTrainingEditorProps {
  data: any;
  onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onUpdate?: () => void;
  updateField?: (name: string, value: any) => void;
  mode?: 'form' | 'display';
  employeeId?: string;
  InfoRowComponent?: React.ComponentType<any>;
  formatDate?: (date: string | null) => string;
}

export function EmployeeTrainingEditor({ 
  data, 
  onChange, 
  onUpdate, 
  updateField,
  mode = 'form',
  employeeId,
  InfoRowComponent: InfoRow,
  formatDate
}: EmployeeTrainingEditorProps) {
  
  if (mode === 'display' && InfoRow && onUpdate && employeeId && formatDate) {
    return (
      <div className="p-4 space-y-4">
        <h4 className="text-md font-semibold text-theme-primary mb-4 flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-module-fg" />
          Training & Certifications
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoRow label="Food Safety Level" value={data.food_safety_level ? `Level ${data.food_safety_level}` : '—'} fieldName="food_safety_level" employeeId={employeeId} onUpdate={onUpdate} type="select" options={[
            { value: '2', label: 'Level 2' },
            { value: '3', label: 'Level 3' },
            { value: '4', label: 'Level 4' },
            { value: '5', label: 'Level 5' }
          ]} />
          <InfoRow label="Food Safety Expiry" value={formatDate(data.food_safety_expiry_date) || '—'} fieldName="food_safety_expiry_date" employeeId={employeeId} onUpdate={onUpdate} type="date" />
          <InfoRow label="H&S Level" value={data.h_and_s_level ? `Level ${data.h_and_s_level}` : '—'} fieldName="h_and_s_level" employeeId={employeeId} onUpdate={onUpdate} type="select" options={[
            { value: '2', label: 'Level 2' },
            { value: '3', label: 'Level 3' },
            { value: '4', label: 'Level 4' }
          ]} />
          <InfoRow label="H&S Expiry" value={formatDate(data.h_and_s_expiry_date) || '—'} fieldName="h_and_s_expiry_date" employeeId={employeeId} onUpdate={onUpdate} type="date" />
          <InfoRow label="Fire Marshal Trained" value={data.fire_marshal_trained ? 'Yes' : 'No'} fieldName="fire_marshal_trained" employeeId={employeeId} onUpdate={onUpdate} type="boolean" />
          {data.fire_marshal_trained && (
            <InfoRow label="Fire Marshal Expiry" value={formatDate(data.fire_marshal_expiry_date) || '—'} fieldName="fire_marshal_expiry_date" employeeId={employeeId} onUpdate={onUpdate} type="date" />
          )}
          <InfoRow label="First Aid Trained" value={data.first_aid_trained ? 'Yes' : 'No'} fieldName="first_aid_trained" employeeId={employeeId} onUpdate={onUpdate} type="boolean" />
          {data.first_aid_trained && (
            <InfoRow label="First Aid Expiry" value={formatDate(data.first_aid_expiry_date) || '—'} fieldName="first_aid_expiry_date" employeeId={employeeId} onUpdate={onUpdate} type="date" />
          )}
          <InfoRow label="COSSH Trained" value={data.cossh_trained ? 'Yes' : 'No'} fieldName="cossh_trained" employeeId={employeeId} onUpdate={onUpdate} type="boolean" />
          {data.cossh_trained && (
            <InfoRow label="COSSH Expiry" value={formatDate(data.cossh_expiry_date) || '—'} fieldName="cossh_expiry_date" employeeId={employeeId} onUpdate={onUpdate} type="date" />
          )}
        </div>
      </div>
    );
  }

  // Default: Form mode for the full profile page
  return (
    <div className="space-y-8">
      <h2 className="text-lg font-semibold text-theme-primary flex items-center gap-2 mb-5">
        <GraduationCap className="w-5 h-5 text-module-fg" />
        Training & Certifications
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div>
          <label className="block text-sm font-medium text-theme-secondary mb-1.5">
            Food Safety Level
          </label>
          <select
            name="food_safety_level"
            value={data.food_safety_level || ''}
            onChange={onChange}
            className="w-full px-3 py-2 bg-theme-surface-elevated border border-module-fg/50 rounded-lg text-theme-primary focus:ring-2 focus:ring-module-fg focus:border-module-fg transition-colors"
          >
            <option value="">Select level...</option>
            <option value="2">Level 2</option>
            <option value="3">Level 3</option>
            <option value="4">Level 4</option>
            <option value="5">Level 5</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-theme-secondary mb-1.5">
            Food Safety Expiry Date
          </label>
          <input
            type="date"
            name="food_safety_expiry_date"
            value={data.food_safety_expiry_date || ''}
            onChange={onChange}
            className="w-full px-3 py-2 bg-theme-surface-elevated border border-module-fg/50 rounded-lg text-theme-primary focus:ring-2 focus:ring-module-fg focus:border-module-fg transition-colors"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-theme-secondary mb-1.5">
            H&S Level
          </label>
          <select
            name="h_and_s_level"
            value={data.h_and_s_level || ''}
            onChange={onChange}
            className="w-full px-3 py-2 bg-theme-surface-elevated border border-module-fg/50 rounded-lg text-theme-primary focus:ring-2 focus:ring-module-fg focus:border-module-fg transition-colors"
          >
            <option value="">Select level...</option>
            <option value="2">Level 2</option>
            <option value="3">Level 3</option>
            <option value="4">Level 4</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-theme-secondary mb-1.5">
            H&S Expiry Date
          </label>
          <input
            type="date"
            name="h_and_s_expiry_date"
            value={data.h_and_s_expiry_date || ''}
            onChange={onChange}
            className="w-full px-3 py-2 bg-theme-surface-elevated border border-module-fg/50 rounded-lg text-theme-primary focus:ring-2 focus:ring-module-fg focus:border-module-fg transition-colors"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-theme-secondary mb-1.5">
            Fire Marshal Trained
          </label>
          <div className="flex items-center gap-2 mt-2">
            <input
              type="checkbox"
              name="fire_marshal_trained"
              checked={data.fire_marshal_trained || false}
              onChange={(e) => {
                if (updateField) {
                  updateField('fire_marshal_trained', e.target.checked);
                } else if (onChange) {
                  // Fallback for standard ChangeEvent if updateField isn't provided
                  const target = { name: 'fire_marshal_trained', value: e.target.checked, type: 'checkbox' } as any;
                  onChange({ target } as any);
                }
              }}
              className="w-4 h-4 text-module-fg bg-theme-surface-elevated border-theme rounded focus:ring-module-fg"
            />
            <span className="text-sm text-theme-tertiary">Fire marshal trained</span>
          </div>
        </div>
        
        {data.fire_marshal_trained && (
          <div>
            <label className="block text-sm font-medium text-theme-secondary mb-1.5">
              Fire Marshal Expiry Date
            </label>
            <input
              type="date"
              name="fire_marshal_expiry_date"
              value={data.fire_marshal_expiry_date || ''}
              onChange={onChange}
              className="w-full px-3 py-2 bg-theme-surface-elevated border border-module-fg/50 rounded-lg text-theme-primary focus:ring-2 focus:ring-module-fg focus:border-module-fg transition-colors"
            />
          </div>
        )}
        
        <div>
          <label className="block text-sm font-medium text-theme-secondary mb-1.5">
            First Aid Trained
          </label>
          <div className="flex items-center gap-2 mt-2">
            <input
              type="checkbox"
              name="first_aid_trained"
              checked={data.first_aid_trained || false}
              onChange={(e) => {
                if (updateField) {
                  updateField('first_aid_trained', e.target.checked);
                } else if (onChange) {
                  const target = { name: 'first_aid_trained', value: e.target.checked, type: 'checkbox' } as any;
                  onChange({ target } as any);
                }
              }}
              className="w-4 h-4 text-module-fg bg-theme-surface-elevated border-theme rounded focus:ring-module-fg"
            />
            <span className="text-sm text-theme-tertiary">First aid trained</span>
          </div>
        </div>
        
        {data.first_aid_trained && (
          <div>
            <label className="block text-sm font-medium text-theme-secondary mb-1.5">
              First Aid Expiry Date
            </label>
            <input
              type="date"
              name="first_aid_expiry_date"
              value={data.first_aid_expiry_date || ''}
              onChange={onChange}
              className="w-full px-3 py-2 bg-theme-surface-elevated border border-module-fg/50 rounded-lg text-theme-primary focus:ring-2 focus:ring-module-fg focus:border-module-fg transition-colors"
            />
          </div>
        )}
        
        <div>
          <label className="block text-sm font-medium text-theme-secondary mb-1.5">
            COSSH Trained
          </label>
          <div className="flex items-center gap-2 mt-2">
            <input
              type="checkbox"
              name="cossh_trained"
              checked={data.cossh_trained || false}
              onChange={(e) => {
                if (updateField) {
                  updateField('cossh_trained', e.target.checked);
                } else if (onChange) {
                  const target = { name: 'cossh_trained', value: e.target.checked, type: 'checkbox' } as any;
                  onChange({ target } as any);
                }
              }}
              className="w-4 h-4 text-module-fg bg-theme-surface-elevated border-theme rounded focus:ring-module-fg"
            />
            <span className="text-sm text-theme-tertiary">COSSH trained</span>
          </div>
        </div>
        
        {data.cossh_trained && (
          <div>
            <label className="block text-sm font-medium text-theme-secondary mb-1.5">
              COSSH Expiry Date
            </label>
            <input
              type="date"
              name="cossh_expiry_date"
              value={data.cossh_expiry_date || ''}
              onChange={onChange}
              className="w-full px-3 py-2 bg-theme-surface-elevated border border-module-fg/50 rounded-lg text-theme-primary focus:ring-2 focus:ring-module-fg focus:border-module-fg transition-colors"
            />
          </div>
        )}
      </div>
    </div>
  );
}
