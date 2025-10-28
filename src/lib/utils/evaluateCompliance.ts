/**
 * Utility functions for evaluating SOP compliance
 */

export interface ComplianceRule {
  id: string;
  label: string;
  passed: boolean;
  weight?: number;
}

export interface ComplianceResult {
  rules: ComplianceRule[];
  overallScore: number;
  evaluatedAt: string;
}

/**
 * Evaluate SOP compliance based on document structure and content
 * @param editorJSON - The TipTap editor JSON document
 * @returns Compliance evaluation result
 */
export function evaluateCompliance(editorJSON: any): ComplianceResult {
  if (!editorJSON || !editorJSON.content) {
    return {
      rules: [],
      overallScore: 0,
      evaluatedAt: new Date().toISOString()
    };
  }

  // Helper function to find blocks by type
  const findBlock = (type: string) => 
    editorJSON.content?.some((block: any) => block.type === type) || false;

  // Helper function to find blocks with specific attributes
  const findBlockWithAttr = (type: string, attr: string, value: any) =>
    editorJSON.content?.some((block: any) => 
      block.type === type && block.attrs?.[attr] === value
    ) || false;

  // Helper function to check if ingredient table has allergens
  const hasAllergens = () => {
    const ingredientTable = editorJSON.content?.find((block: any) => block.type === 'ingredientTable');
    if (!ingredientTable?.attrs?.rows) return false;
    
    return ingredientTable.attrs.rows.some((row: any) => 
      row.allergens && row.allergens.length > 0
    );
  };

  // Helper function to check if process steps have HACCP flags
  const hasHACCPFlags = () => {
    const processSteps = editorJSON.content?.find((block: any) => block.type === 'processSteps');
    if (!processSteps?.attrs?.steps) return false;
    
    return processSteps.attrs.steps.some((step: any) => step.isCritical === true);
  };

  // Helper function to check if storage info has valid temperature range
  const hasValidStorage = () => {
    const storageInfo = editorJSON.content?.find((block: any) => block.type === 'storageInfo');
    if (!storageInfo?.attrs?.rows) return false;
    
    return storageInfo.attrs.rows.some((row: any) => 
      row.temp_min !== null && row.temp_max !== null && 
      row.temp_min < row.temp_max
    );
  };

  // Helper function to check if prep header has required fields
  const hasRequiredHeaderFields = () => {
    const prepHeader = editorJSON.content?.find((block: any) => block.type === 'prepHeader');
    if (!prepHeader?.attrs) return false;
    
    return !!(
      prepHeader.attrs.title && 
      prepHeader.attrs.version && 
      prepHeader.attrs.author
    );
  };

  // Helper function to check if PPE is referenced
  const hasPPEReference = () => {
    const ppeList = editorJSON.content?.find((block: any) => block.type === 'ppeList');
    if (!ppeList?.attrs?.items) return false;
    
    return ppeList.attrs.items.length > 0;
  };

  // Helper function to check review date validity (placeholder for now)
  const hasValidReviewDate = () => {
    const prepHeader = editorJSON.content?.find((block: any) => block.type === 'prepHeader');
    if (!prepHeader?.attrs?.last_edited) return true; // Default to true if no date
    
    const lastEdited = new Date(prepHeader.attrs.last_edited);
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    return lastEdited > oneYearAgo;
  };

  // Define compliance rules with weights
  const rules: ComplianceRule[] = [
    {
      id: "versionPresent",
      label: "Header includes version & author",
      passed: hasRequiredHeaderFields(),
      weight: 10
    },
    {
      id: "allergensListed",
      label: "Allergens identified",
      passed: hasAllergens(),
      weight: 10
    },
    {
      id: "storageDefined",
      label: "Storage method defined",
      passed: hasValidStorage(),
      weight: 15
    },
    {
      id: "haccpFlagged",
      label: "HACCP step flagged",
      passed: hasHACCPFlags(),
      weight: 15
    },
    {
      id: "checklistsPresent",
      label: "Pre/Post checklists present",
      passed: findBlock('preStartChecklist') && findBlock('postFinishChecklist'),
      weight: 10
    },
    {
      id: "ppeReferenced",
      label: "PPE referenced",
      passed: hasPPEReference(),
      weight: 10
    },
    {
      id: "riskLinked",
      label: "Linked risk assessment",
      passed: findBlock('riskAssessment'), // Placeholder for future risk assessment block
      weight: 10
    },
    {
      id: "reviewDateValid",
      label: "Review date valid",
      passed: hasValidReviewDate(),
      weight: 10
    }
  ];

  // Calculate overall score based on weighted rules
  const totalWeight = rules.reduce((sum, rule) => sum + (rule.weight || 0), 0);
  const passedWeight = rules.reduce((sum, rule) => 
    sum + (rule.passed ? (rule.weight || 0) : 0), 0
  );
  
  const overallScore = totalWeight > 0 ? Math.round((passedWeight / totalWeight) * 100) : 0;

  return {
    rules,
    overallScore,
    evaluatedAt: new Date().toISOString()
  };
}

/**
 * Get compliance status color and icon based on score
 * @param score - Compliance score (0-100)
 * @returns Object with color class and icon
 */
export function getComplianceStatus(score: number): { color: string; icon: string; status: string } {
  if (score >= 90) {
    return { color: "text-green-400", icon: "✅", status: "Excellent" };
  } else if (score >= 70) {
    return { color: "text-yellow-400", icon: "⚠", status: "Good" };
  } else if (score >= 50) {
    return { color: "text-orange-400", icon: "⚠", status: "Needs Improvement" };
  } else {
    return { color: "text-red-400", icon: "❌", status: "Poor" };
  }
}

/**
 * Format date for display
 * @param dateString - ISO date string
 * @returns Formatted date string
 */
export function formatEvaluationDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return 'Unknown';
  }
}
