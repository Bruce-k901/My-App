"use client";

import React from 'react';
import { AlertTriangle, CheckCircle, Clock } from '@/components/ui/icons';
import { getRiskLevel } from '@/lib/fire-ra/constants';
import {
  computeOverallRisk,
  computeSectionRisk,
  computeItemRiskScore,
  extractActionItems,
  computeOverallCompletion,
} from '@/lib/fire-ra/utils';
import type { FireRAAssessmentData, FireRASignOff } from '@/types/fire-ra';

interface FireRASummaryProps {
  assessmentData: FireRAAssessmentData;
  signOff: FireRASignOff;
  onSignOffChange: (updated: FireRASignOff) => void;
}

export default function FireRASummary({
  assessmentData,
  signOff,
  onSignOffChange,
}: FireRASummaryProps) {
  const overall = computeOverallRisk(assessmentData.sections);
  const overallInfo = overall.level ? getRiskLevel(overall.score) : null;
  const actionItems = extractActionItems(assessmentData);
  const completion = computeOverallCompletion(assessmentData.sections);

  const highPriority = actionItems.filter(a => a.priority === 'high');
  const medPriority = actionItems.filter(a => a.priority === 'medium');
  const lowPriority = actionItems.filter(a => a.priority === 'low');

  return (
    <div className="space-y-6">
      {/* Overall Risk */}
      <div className="bg-theme-surface/50 rounded-xl p-6 border border-theme">
        <h2 className="text-lg font-semibold text-theme-primary mb-4">
          Section 12: Risk Rating Summary
        </h2>

        {/* Completion */}
        <div className="mb-4 p-3 bg-gray-50 dark:bg-neutral-900/50 rounded-lg">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-gray-600 dark:text-neutral-400">Assessment Completion</span>
            <span className="font-semibold text-theme-primary">{completion.percent}%</span>
          </div>
          <div className="w-full h-2 bg-gray-200 dark:bg-neutral-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all"
              style={{ width: `${completion.percent}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-neutral-400 mt-1">
            {completion.completed} of {completion.total} items assessed
          </p>
        </div>

        {/* Overall Risk Rating */}
        {overallInfo && (
          <div className={`p-4 rounded-lg border ${overallInfo.color} mb-4`}>
            <div className="flex items-center gap-2">
              {overall.level === 'High' && <AlertTriangle size={18} />}
              {overall.level === 'Medium' && <Clock size={18} />}
              {overall.level === 'Low' && <CheckCircle size={18} />}
              <span className="text-lg font-semibold">Overall Risk: {overall.level}</span>
              <span className="text-sm opacity-70">(Score: {overall.score})</span>
            </div>
            <p className="text-sm mt-1 opacity-80">{overallInfo.description}</p>
          </div>
        )}

        {/* Section Summary Table */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-theme-primary mb-2">Section-by-Section Summary</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-neutral-600">
                  <th className="text-left py-2 text-gray-600 dark:text-neutral-400 font-medium">#</th>
                  <th className="text-left py-2 text-gray-600 dark:text-neutral-400 font-medium">Section</th>
                  <th className="text-center py-2 text-gray-600 dark:text-neutral-400 font-medium">Risk Level</th>
                  <th className="text-center py-2 text-gray-600 dark:text-neutral-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {assessmentData.sections
                  .filter(s => s.isApplicable && s.items.length > 0)
                  .map(section => {
                    const sectionRisk = computeSectionRisk(section.items);
                    const sectionActions = section.items.filter(i => i.actionRequired.trim() !== '');
                    const sectionInfo = sectionRisk ? getRiskLevel(Math.max(...section.items.map(computeItemRiskScore).filter(s => s > 0))) : null;

                    return (
                      <tr key={section.sectionNumber} className="border-b border-gray-100 dark:border-neutral-700">
                        <td className="py-2 text-gray-400 dark:text-neutral-500">{section.sectionNumber}</td>
                        <td className="py-2 text-theme-primary">{section.sectionName}</td>
                        <td className="py-2 text-center">
                          {sectionInfo ? (
                            <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${sectionInfo.color}`}>
                              {sectionRisk}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400 dark:text-neutral-500">-</span>
                          )}
                        </td>
                        <td className="py-2 text-center text-gray-600 dark:text-neutral-400">
                          {sectionActions.length > 0 ? sectionActions.length : '-'}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Priority Action List */}
        {actionItems.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-theme-primary mb-2">
              Action Plan ({actionItems.length} action{actionItems.length !== 1 ? 's' : ''})
            </h3>
            <div className="space-y-2">
              {highPriority.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-red-600 dark:text-red-400 mb-1">High Priority ({highPriority.length})</p>
                  {highPriority.map(item => (
                    <div key={item.id} className="flex items-start gap-2 py-1 text-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
                      <span className="text-theme-primary">
                        <span className="text-gray-400 dark:text-neutral-500">{item.sectionName} - {item.itemNumber}:</span>{' '}
                        {item.actionRequired}
                        {item.targetDate && (
                          <span className="text-xs text-gray-400 dark:text-neutral-500 ml-1">
                            (due {item.targetDate})
                          </span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {medPriority.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1">Medium Priority ({medPriority.length})</p>
                  {medPriority.map(item => (
                    <div key={item.id} className="flex items-start gap-2 py-1 text-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                      <span className="text-theme-primary">
                        <span className="text-gray-400 dark:text-neutral-500">{item.sectionName} - {item.itemNumber}:</span>{' '}
                        {item.actionRequired}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {lowPriority.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-green-600 dark:text-green-400 mb-1">Low Priority ({lowPriority.length})</p>
                  {lowPriority.map(item => (
                    <div key={item.id} className="flex items-start gap-2 py-1 text-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 shrink-0" />
                      <span className="text-theme-primary">
                        <span className="text-gray-400 dark:text-neutral-500">{item.sectionName} - {item.itemNumber}:</span>{' '}
                        {item.actionRequired}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Sign-off */}
      <div className="bg-theme-surface/50 rounded-xl p-6 border border-theme">
        <h3 className="text-sm font-semibold text-theme-primary mb-4">Sign-off</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-600 dark:text-theme-tertiary mb-1">Assessor Name</label>
            <input
              value={signOff.assessorName}
              onChange={(e) => onSignOffChange({ ...signOff, assessorName: e.target.value })}
              className="w-full bg-theme-surface border border-gray-200 dark:border-neutral-600 rounded-lg px-3 py-2 text-theme-primary text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 dark:text-theme-tertiary mb-1">Assessor Date</label>
            <input
              type="date"
              value={signOff.assessorDate}
              onChange={(e) => onSignOffChange({ ...signOff, assessorDate: e.target.value })}
              className="w-full bg-theme-surface border border-gray-200 dark:border-neutral-600 rounded-lg px-3 py-2 text-theme-primary text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 dark:text-theme-tertiary mb-1">Responsible Person Name</label>
            <input
              value={signOff.responsiblePersonName}
              onChange={(e) => onSignOffChange({ ...signOff, responsiblePersonName: e.target.value })}
              className="w-full bg-theme-surface border border-gray-200 dark:border-neutral-600 rounded-lg px-3 py-2 text-theme-primary text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 dark:text-theme-tertiary mb-1">Responsible Person Date</label>
            <input
              type="date"
              value={signOff.responsiblePersonDate}
              onChange={(e) => onSignOffChange({ ...signOff, responsiblePersonDate: e.target.value })}
              className="w-full bg-theme-surface border border-gray-200 dark:border-neutral-600 rounded-lg px-3 py-2 text-theme-primary text-sm"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
