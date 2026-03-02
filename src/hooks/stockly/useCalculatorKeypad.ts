'use client';

import { useState, useCallback, useMemo } from 'react';

interface UseCalculatorKeypadReturn {
  /** Raw expression string e.g. "3+2.5" */
  expression: string;
  /** Display tokens for styled rendering e.g. ["3", "+", "2.5"] */
  displayTokens: string[];
  /** Evaluated result of the expression */
  result: number;
  /** Whether the expression has any value */
  hasValue: boolean;
  /** Append a digit (0-9) */
  pressDigit: (digit: string) => void;
  /** Append a decimal point */
  pressDecimal: () => void;
  /** Append a plus operator */
  pressPlus: () => void;
  /** Remove the last character */
  pressBackspace: () => void;
  /** Reset everything */
  pressClear: () => void;
  /** Set an initial value (e.g. when item already has a count) */
  setInitialValue: (val: string) => void;
}

/** Addition-only expression evaluator */
function evaluate(expr: string): number {
  if (!expr.trim()) return 0;
  const parts = expr.split('+').map(p => parseFloat(p.trim())).filter(n => !isNaN(n));
  return Math.round(parts.reduce((sum, n) => sum + n, 0) * 100) / 100;
}

/** Check if the current number segment (after the last +) already has a decimal */
function currentSegmentHasDecimal(expr: string): boolean {
  const lastPlus = expr.lastIndexOf('+');
  const segment = lastPlus >= 0 ? expr.slice(lastPlus + 1) : expr;
  return segment.includes('.');
}

export function useCalculatorKeypad(): UseCalculatorKeypadReturn {
  const [expression, setExpression] = useState('');

  const result = useMemo(() => evaluate(expression), [expression]);
  const hasValue = expression.trim().length > 0;

  const displayTokens = useMemo(() => {
    if (!expression.trim()) return [];
    // Split keeping the + operator as its own token
    return expression.split(/(\+)/).map(t => t.trim()).filter(Boolean);
  }, [expression]);

  const pressDigit = useCallback((digit: string) => {
    setExpression(prev => prev + digit);
  }, []);

  const pressDecimal = useCallback(() => {
    setExpression(prev => {
      if (currentSegmentHasDecimal(prev)) return prev;
      // If expression is empty or ends with +, start with "0."
      if (!prev || prev.endsWith('+')) return prev + '0.';
      return prev + '.';
    });
  }, []);

  const pressPlus = useCallback(() => {
    setExpression(prev => {
      // Don't add + if expression is empty or already ends with +
      if (!prev.trim() || prev.trim().endsWith('+')) return prev;
      return prev + '+';
    });
  }, []);

  const pressBackspace = useCallback(() => {
    setExpression(prev => {
      if (!prev) return prev;
      // If ends with +, remove the operator
      if (prev.endsWith('+')) return prev.slice(0, -1);
      return prev.slice(0, -1);
    });
  }, []);

  const pressClear = useCallback(() => {
    setExpression('');
  }, []);

  const setInitialValue = useCallback((val: string) => {
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      setExpression(num.toString());
    } else {
      setExpression('');
    }
  }, []);

  return {
    expression,
    displayTokens,
    result,
    hasValue,
    pressDigit,
    pressDecimal,
    pressPlus,
    pressBackspace,
    pressClear,
    setInitialValue,
  };
}
