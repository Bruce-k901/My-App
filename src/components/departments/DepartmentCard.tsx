'use client';

import { Department } from '@/types/departments';
import { Building2, Mail, Phone, Edit2, Trash2, Users } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface DepartmentCardProps {
  department: Department;
  onEdit: (department: Department) => void;
  onDelete: (department: Department) => void;
  departments?: Department[]; // For showing parent department
}

export default function DepartmentCard({
  department,
  onEdit,
  onDelete,
  departments = [],
}: DepartmentCardProps) {
  const parentDepartment = departments.find((d) => d.id === department.parent_department_id);

  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-6 hover:border-white/[0.12] transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3 flex-1">
          <div className="p-2 bg-[#EC4899]/10 rounded-lg flex-shrink-0">
            <Building2 className="w-5 h-5 text-[#EC4899]" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-white mb-1">{department.name}</h3>
            {department.description && (
              <p className="text-sm text-gray-400 mt-1">{department.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-1 text-xs font-medium rounded ${
              department.status === 'active'
                ? 'bg-green-500/20 text-green-400'
                : department.status === 'inactive'
                ? 'bg-yellow-500/20 text-yellow-400'
                : 'bg-gray-500/20 text-gray-400'
            }`}
          >
            {department.status}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(department)}
            className="text-gray-400 hover:text-white"
          >
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(department)}
            className="text-gray-400 hover:text-red-400"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Contact Information */}
      {(department.contact_name ||
        department.contact_email ||
        department.contact_phone ||
        department.contact_mobile) && (
        <div className="space-y-2 mb-4 pt-4 border-t border-white/[0.06]">
          {department.contact_name && (
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <Users className="w-4 h-4 text-gray-400" />
              <span>{department.contact_name}</span>
            </div>
          )}
          {department.contact_email && (
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <Mail className="w-4 h-4 text-gray-400" />
              <a
                href={`mailto:${department.contact_email}`}
                className="text-[#EC4899] hover:underline"
              >
                {department.contact_email}
              </a>
            </div>
          )}
          {department.contact_phone && (
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <Phone className="w-4 h-4 text-gray-400" />
              <a
                href={`tel:${department.contact_phone}`}
                className="text-[#EC4899] hover:underline"
              >
                {department.contact_phone}
              </a>
            </div>
          )}
          {department.contact_mobile && (
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <Phone className="w-4 h-4 text-gray-400" />
              <a
                href={`tel:${department.contact_mobile}`}
                className="text-[#EC4899] hover:underline"
              >
                {department.contact_mobile} (Mobile)
              </a>
            </div>
          )}
        </div>
      )}

      {/* Additional Details */}
      {(department.contact_details || department.metadata) && (
        <div className="pt-4 border-t border-white/[0.06]">
          {department.contact_details?.address && (
            <p className="text-sm text-gray-400 mb-1">
              <span className="text-gray-500">Address:</span> {department.contact_details.address}
            </p>
          )}
          {department.contact_details?.office_location && (
            <p className="text-sm text-gray-400 mb-1">
              <span className="text-gray-500">Location:</span>{' '}
              {department.contact_details.office_location}
            </p>
          )}
          {department.metadata?.budget_code && (
            <p className="text-sm text-gray-400 mb-1">
              <span className="text-gray-500">Budget Code:</span>{' '}
              {department.metadata.budget_code}
            </p>
          )}
          {department.metadata?.head_count && (
            <p className="text-sm text-gray-400">
              <span className="text-gray-500">Head Count:</span> {department.metadata.head_count}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

