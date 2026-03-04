"use client";

import React, { useState, useCallback } from 'react';
import { AlertTriangle, CheckCircle, Info, ChevronRight } from '@/components/ui/icons';
import { SCREENING_QUESTIONS, TIER_INFO, PREMISES_TYPE_LABELS } from '@/lib/fire-ra/constants';
import { calculateComplexityTier } from '@/lib/fire-ra/utils';
import type { FireRAScreeningAnswers, FireRAScreeningResult, FireRAComplexityTier } from '@/types/fire-ra';

interface FireRAScreeningProps {
  onComplete: (result: FireRAScreeningResult) => void;
}

const defaultAnswers: FireRAScreeningAnswers = {
  premisesType: 'restaurant_cafe',
  premisesTypeOther: '',
  floorCount: 'single',
  sleepingOnPremises: false,
  flammableMaterials: 'none',
  occupancy: 'under_25',
  disabilitiesOnSite: 'no',
  lastProfessionalAssessment: 'never',
};

export default function FireRAScreening({ onComplete }: FireRAScreeningProps) {
  const [answers, setAnswers] = useState<FireRAScreeningAnswers>(defaultAnswers);
  const [showResult, setShowResult] = useState(false);
  const [specialistAcknowledged, setSpecialistAcknowledged] = useState(false);

  const tierResult = calculateComplexityTier(answers);

  const updateAnswer = useCallback((key: keyof FireRAScreeningAnswers, value: any) => {
    setAnswers(prev => ({ ...prev, [key]: value }));
    setShowResult(false);
  }, []);

  const handleSubmitScreening = () => {
    setShowResult(true);
  };

  const handleBeginAssessment = () => {
    const result: FireRAScreeningResult = {
      answers,
      tier: tierResult.tier,
      tierExplanation: tierResult.tierExplanation,
      enhancedReasons: tierResult.enhancedReasons,
      timestamp: new Date().toISOString(),
    };
    onComplete(result);
  };

  const canProceed = showResult && (tierResult.tier !== 'specialist' || specialistAcknowledged);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-red-50 dark:bg-gradient-to-r dark:from-red-600/20 dark:to-orange-600/20 rounded-2xl p-6 border border-red-200 dark:border-red-500/30">
        <h1 className="text-2xl font-semibold text-theme-primary mb-2">Fire Risk Assessment</h1>
        <p className="text-gray-700 dark:text-neutral-300 text-sm">
          Regulatory Reform (Fire Safety) Order 2005 — Complexity Screening
        </p>
        <p className="text-gray-500 dark:text-neutral-400 text-xs mt-1">
          Answer these questions to determine the assessment depth required for your premises.
        </p>
      </div>

      {/* Questions */}
      <div className="space-y-4">
        {SCREENING_QUESTIONS.map((q, idx) => (
          <div
            key={q.id}
            className="bg-theme-surface/50 rounded-xl p-5 border border-theme"
          >
            <label className="block text-sm font-medium text-theme-primary mb-3">
              <span className="text-gray-400 dark:text-neutral-500 mr-2">{idx + 1}.</span>
              {q.question}
            </label>

            {q.id === 'premisesType' ? (
              <div className="space-y-2">
                <select
                  value={answers.premisesType}
                  onChange={(e) => updateAnswer('premisesType', e.target.value)}
                  className="w-full bg-theme-surface border border-gray-200 dark:border-neutral-600 rounded-lg px-3 py-2 text-theme-primary text-sm"
                >
                  {q.options.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                {answers.premisesType === 'other' && (
                  <input
                    type="text"
                    placeholder="Describe premises type..."
                    value={answers.premisesTypeOther || ''}
                    onChange={(e) => updateAnswer('premisesTypeOther', e.target.value)}
                    className="w-full bg-theme-surface border border-gray-200 dark:border-neutral-600 rounded-lg px-3 py-2 text-theme-primary text-sm"
                  />
                )}
              </div>
            ) : q.id === 'sleepingOnPremises' ? (
              <div className="flex gap-3">
                {q.options.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => updateAnswer('sleepingOnPremises', opt.value === 'true')}
                    className={`px-4 py-2 rounded-lg text-sm border transition-colors ${
                      String(answers.sleepingOnPremises) === opt.value
                        ? 'bg-module-fg/20 border-module-fg/40 text-module-fg font-medium'
                        : 'bg-theme-surface border-gray-200 dark:border-neutral-600 text-gray-600 dark:text-neutral-400 hover:border-gray-400 dark:hover:border-neutral-400'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {q.options.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => updateAnswer(q.id, opt.value)}
                    className={`px-3 py-2 rounded-lg text-sm border transition-colors ${
                      (answers as any)[q.id] === opt.value
                        ? 'bg-module-fg/20 border-module-fg/40 text-module-fg font-medium'
                        : 'bg-theme-surface border-gray-200 dark:border-neutral-600 text-gray-600 dark:text-neutral-400 hover:border-gray-400 dark:hover:border-neutral-400'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Determine Tier Button */}
      {!showResult && (
        <button
          onClick={handleSubmitScreening}
          className="w-full py-3 bg-module-fg/20 hover:bg-module-fg/30 border border-module-fg/40 rounded-xl text-module-fg font-medium transition-colors"
        >
          Determine Assessment Complexity
        </button>
      )}

      {/* Tier Result */}
      {showResult && (
        <div className="space-y-4">
          <div className={`rounded-xl p-5 border ${TIER_INFO[tierResult.tier].color}`}>
            <div className="flex items-start gap-3">
              {tierResult.tier === 'standard' && <CheckCircle size={20} className="mt-0.5 text-green-600 dark:text-green-400" />}
              {tierResult.tier === 'enhanced' && <Info size={20} className="mt-0.5 text-amber-600 dark:text-amber-400" />}
              {tierResult.tier === 'specialist' && <AlertTriangle size={20} className="mt-0.5 text-red-600 dark:text-red-400" />}
              <div>
                <h3 className="font-semibold text-lg">
                  {TIER_INFO[tierResult.tier].label} Assessment
                </h3>
                <p className="text-sm mt-1 opacity-80">{tierResult.tierExplanation}</p>
                {tierResult.enhancedReasons.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {tierResult.enhancedReasons.map((reason, i) => (
                      <li key={i} className="text-sm flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-50" />
                        {reason}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* Specialist Warning */}
          {tierResult.tier === 'specialist' && (
            <label className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={specialistAcknowledged}
                onChange={(e) => setSpecialistAcknowledged(e.target.checked)}
                className="mt-0.5 rounded"
              />
              <span className="text-sm text-red-700 dark:text-red-400">
                I understand that a professional fire risk assessment is recommended for my premises. I wish to proceed with a preliminary self-assessment.
              </span>
            </label>
          )}

          {/* Proceed Button */}
          <button
            onClick={handleBeginAssessment}
            disabled={!canProceed}
            className="w-full py-3 bg-module-fg hover:bg-module-fg/90 text-white rounded-xl font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            Begin Assessment
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
