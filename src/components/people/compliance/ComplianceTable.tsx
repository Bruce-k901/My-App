'use client';

import { useState } from 'react';
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  Minus,
  ChevronDown,
  ChevronRight,
  ArrowUpDown,
} from '@/components/ui/icons';
import { EmployeeComplianceDetail } from './EmployeeComplianceDetail';
import type {
  EmployeeCompliance,
  ComplianceStatus,
  ComplianceActionType,
} from '@/types/compliance';

interface ComplianceTableProps {
  employees: EmployeeCompliance[];
  onAction: (
    employeeId: string,
    employeeName: string,
    actionType: ComplianceActionType,
    meta?: Record<string, string>,
  ) => void;
}

type SortKey = 'name' | 'score' | 'department' | 'rtw' | 'dbs' | 'training' | 'documents';

const STATUS_PRIORITY: Record<ComplianceStatus, number> = {
  expired: 0,
  missing: 1,
  action_required: 2,
  expiring_soon: 3,
  compliant: 4,
  not_applicable: 5,
};

function StatusIcon({ status }: { status: ComplianceStatus }) {
  switch (status) {
    case 'compliant':
      return <CheckCircle className="h-4 w-4 text-emerald-500" />;
    case 'expiring_soon':
      return <Clock className="h-4 w-4 text-amber-500" />;
    case 'action_required':
    case 'expired':
    case 'missing':
      return <XCircle className="h-4 w-4 text-red-500" />;
    case 'not_applicable':
      return <Minus className="h-4 w-4 text-theme-secondary" />;
  }
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80
      ? 'text-emerald-500 bg-emerald-500/10'
      : score >= 60
        ? 'text-amber-500 bg-amber-500/10'
        : 'text-red-500 bg-red-500/10';

  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${color}`}>
      {score}%
    </span>
  );
}

export function ComplianceTable({ employees, onAction }: ComplianceTableProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>('score');
  const [sortAsc, setSortAsc] = useState(false);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else {
      setSortKey(key);
      setSortAsc(key === 'name' || key === 'department');
    }
  };

  const sorted = [...employees].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case 'name':
        cmp = a.fullName.localeCompare(b.fullName);
        break;
      case 'department':
        cmp = (a.department || '').localeCompare(b.department || '');
        break;
      case 'score':
        cmp = a.overallScore - b.overallScore;
        break;
      case 'rtw':
        cmp = STATUS_PRIORITY[a.rtw] - STATUS_PRIORITY[b.rtw];
        break;
      case 'dbs':
        cmp = STATUS_PRIORITY[a.dbs] - STATUS_PRIORITY[b.dbs];
        break;
      case 'training':
        cmp = STATUS_PRIORITY[a.training] - STATUS_PRIORITY[b.training];
        break;
      case 'documents':
        cmp = STATUS_PRIORITY[a.documents] - STATUS_PRIORITY[b.documents];
        break;
    }
    return sortAsc ? cmp : -cmp;
  });

  const TH = ({
    label,
    sortable,
    className = '',
  }: {
    label: string;
    sortable: SortKey;
    className?: string;
  }) => (
    <th
      className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-theme-secondary cursor-pointer select-none hover:text-theme-primary transition-colors ${className}`}
      onClick={() => handleSort(sortable)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <ArrowUpDown className="h-3 w-3 opacity-40" />
      </span>
    </th>
  );

  if (employees.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-theme-secondary">
        <CheckCircle className="h-12 w-12 mb-3 opacity-30" />
        <p className="text-sm">No employees match the current filters</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-theme">
      <table className="w-full">
        <thead className="bg-theme-surface-elevated">
          <tr>
            <th className="w-8 px-2" />
            <TH label="Employee" sortable="name" />
            <TH label="Dept" sortable="department" className="hidden md:table-cell" />
            <TH label="RTW" sortable="rtw" />
            <TH label="DBS" sortable="dbs" />
            <TH label="Training" sortable="training" />
            <TH label="Docs" sortable="documents" />
            <TH label="Score" sortable="score" />
          </tr>
        </thead>
        <tbody className="divide-y divide-theme">
          {sorted.map((emp) => {
            const isOpen = expanded.has(emp.profileId);
            return (
              <tr key={emp.profileId} className="group">
                <td colSpan={8} className="p-0">
                  <div
                    className="flex items-center cursor-pointer hover:bg-theme-hover transition-colors"
                    onClick={() => toggleExpand(emp.profileId)}
                  >
                    <div className="w-8 flex items-center justify-center px-2 py-3">
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4 text-theme-secondary" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-theme-secondary" />
                      )}
                    </div>
                    <div className="flex-1 grid grid-cols-[1fr_auto_auto_auto_auto_auto_auto] md:grid-cols-[1fr_auto_auto_auto_auto_auto_auto] items-center gap-0">
                      <div className="px-4 py-3">
                        <p className="text-sm font-medium text-theme-primary">{emp.fullName}</p>
                        {emp.employeeNumber && (
                          <p className="text-xs text-theme-secondary">{emp.employeeNumber}</p>
                        )}
                      </div>
                      <div className="px-4 py-3 hidden md:block">
                        <span className="text-xs text-theme-secondary">{emp.department || '—'}</span>
                      </div>
                      <div className="px-4 py-3"><StatusIcon status={emp.rtw} /></div>
                      <div className="px-4 py-3"><StatusIcon status={emp.dbs} /></div>
                      <div className="px-4 py-3"><StatusIcon status={emp.training} /></div>
                      <div className="px-4 py-3"><StatusIcon status={emp.documents} /></div>
                      <div className="px-4 py-3"><ScoreBadge score={emp.overallScore} /></div>
                    </div>
                  </div>
                  {isOpen && (
                    <div className="border-t border-theme bg-theme-surface">
                      <EmployeeComplianceDetail
                        employee={emp}
                        onAction={(actionType, meta) =>
                          onAction(emp.profileId, emp.fullName, actionType, meta)
                        }
                      />
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
