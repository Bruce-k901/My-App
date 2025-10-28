"use client"
import { NodeViewWrapper } from "@tiptap/react"
import { useState, useEffect } from "react"
import { evaluateCompliance, getComplianceStatus, formatEvaluationDate, ComplianceRule } from "@/lib/utils/evaluateCompliance"

interface SOPComplianceComponentProps {
  node: any;
  updateAttributes: (attrs: any) => void;
  editor: any;
}

export default function SOPComplianceComponent({ node, updateAttributes, editor }: SOPComplianceComponentProps) {
  const [rules, setRules] = useState<ComplianceRule[]>(node.attrs.rules || []);
  const [overallScore, setOverallScore] = useState(node.attrs.overallScore || 0);
  const [verifiedByManager, setVerifiedByManager] = useState(node.attrs.verifiedByManager || false);
  const [evaluatedAt, setEvaluatedAt] = useState(node.attrs.evaluatedAt || new Date().toISOString());

  // Evaluate compliance when component mounts or editor content changes
  useEffect(() => {
    if (!editor) return;
    
    let isEvaluating = false;
    
    const evaluateAndUpdate = () => {
      // Prevent multiple simultaneous evaluations
      if (isEvaluating) return;
      isEvaluating = true;
      
      try {
        const editorJSON = editor.getJSON();
        const result = evaluateCompliance(editorJSON);
        
        // Only update if values actually changed to prevent infinite loops
        if (JSON.stringify(result.rules) !== JSON.stringify(rules) ||
            result.overallScore !== overallScore ||
            result.evaluatedAt !== evaluatedAt) {
          setRules(result.rules);
          setOverallScore(result.overallScore);
          setEvaluatedAt(result.evaluatedAt);
        }
      } catch (error) {
        console.error('Error evaluating compliance:', error);
      } finally {
        isEvaluating = false;
      }
    };

    // Initial evaluation with delay to avoid blocking
    const timeoutId = setTimeout(evaluateAndUpdate, 100);

    // Listen for editor updates (debounced)
    let debounceTimeout: NodeJS.Timeout;
    const debouncedEvaluate = () => {
      clearTimeout(debounceTimeout);
      debounceTimeout = setTimeout(evaluateAndUpdate, 300);
    };

    editor.on('update', debouncedEvaluate);

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(debounceTimeout);
      editor.off('update', debouncedEvaluate);
    };
  }, [editor]); // Removed updateAttributes from deps to prevent loop

  // Update TipTap attributes when local state changes (only if different from node attrs)
  useEffect(() => {
    // Only update if the values are different to prevent infinite loops
    const currentAttrs = {
      rules: node.attrs.rules || [],
      overallScore: node.attrs.overallScore || 0,
      verifiedByManager: node.attrs.verifiedByManager || false,
      evaluatedAt: node.attrs.evaluatedAt || ''
    };

    if (JSON.stringify(currentAttrs.rules) !== JSON.stringify(rules) ||
        currentAttrs.overallScore !== overallScore ||
        currentAttrs.verifiedByManager !== verifiedByManager ||
        currentAttrs.evaluatedAt !== evaluatedAt) {
      updateAttributes({
        rules,
        overallScore,
        verifiedByManager,
        evaluatedAt
      });
    }
  }, [rules, overallScore, verifiedByManager, evaluatedAt, node.attrs, updateAttributes]);

  // Handle manual rule toggle
  const toggleRule = (ruleId: string) => {
    const updatedRules = rules.map(rule => 
      rule.id === ruleId ? { ...rule, passed: !rule.passed } : rule
    );
    setRules(updatedRules);
    
    // Recalculate score
    const totalWeight = updatedRules.reduce((sum, rule) => sum + (rule.weight || 0), 0);
    const passedWeight = updatedRules.reduce((sum, rule) => 
      sum + (rule.passed ? (rule.weight || 0) : 0), 0
    );
    const newScore = totalWeight > 0 ? Math.round((passedWeight / totalWeight) * 100) : 0;
    setOverallScore(newScore);
  };

  // Handle manager verification toggle
  const toggleManagerVerification = () => {
    setVerifiedByManager(!verifiedByManager);
  };

  const status = getComplianceStatus(overallScore);
  const passedCount = rules.filter(rule => rule.passed).length;
  const totalCount = rules.length;

  return (
    <NodeViewWrapper className="my-6">
      <div className="bg-white/5 backdrop-blur-md border border-magenta-500/30 rounded-2xl p-4 shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-magenta-400 flex items-center gap-2">
            🧩 Compliance Summary
          </h3>
          <div className="text-sm text-gray-400">
            Last evaluated: {formatEvaluationDate(evaluatedAt)}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-300">
              SOP Compliance: {overallScore}% {status.icon}
            </span>
            <span className={`text-sm font-medium ${status.color}`}>
              {status.status}
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                overallScore >= 90 ? 'bg-green-500' :
                overallScore >= 70 ? 'bg-yellow-500' :
                overallScore >= 50 ? 'bg-orange-500' : 'bg-red-500'
              }`}
              style={{ width: `${overallScore}%` }}
            />
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {passedCount} / {totalCount} criteria met
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-magenta-500/20 mb-4" />

        {/* Compliance Rules */}
        <div className="space-y-2 mb-4">
          {rules.map((rule) => (
            <div key={rule.id} className="flex items-center gap-3">
              <button
                onClick={() => toggleRule(rule.id)}
                className={`w-5 h-5 rounded border-2 flex items-center justify-center text-xs font-bold transition-colors ${
                  rule.passed 
                    ? 'bg-green-500 border-green-500 text-white' 
                    : 'bg-transparent border-gray-500 text-gray-500 hover:border-gray-400'
                }`}
                title={`Click to ${rule.passed ? 'uncheck' : 'check'} this rule`}
              >
                {rule.passed ? '✓' : ''}
              </button>
              <span className={`text-sm ${rule.passed ? 'text-gray-300' : 'text-gray-500'}`}>
                {rule.label}
              </span>
              {rule.weight && (
                <span className="text-xs text-gray-500 ml-auto">
                  {rule.weight}%
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="border-t border-magenta-500/20 mb-4" />

        {/* Manager Verification */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleManagerVerification}
            className={`w-5 h-5 rounded border-2 flex items-center justify-center text-xs font-bold transition-colors ${
              verifiedByManager 
                ? 'bg-magenta-500 border-magenta-500 text-white' 
                : 'bg-transparent border-gray-500 text-gray-500 hover:border-gray-400'
            }`}
            title="Manager verification"
          >
            {verifiedByManager ? '✓' : ''}
          </button>
          <span className={`text-sm font-medium ${verifiedByManager ? 'text-magenta-300' : 'text-gray-500'}`}>
            Manager verified and signed off
          </span>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-magenta-500/20">
          <div className="text-xs text-gray-500 text-center">
            Auto-updated on document changes
          </div>
        </div>
      </div>
    </NodeViewWrapper>
  );
}
