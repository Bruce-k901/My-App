'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Eraser, Plus, X, Check, ArrowRight } from '@/components/ui/icons';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import { useCalculatorKeypad } from '@/hooks/stockly/useCalculatorKeypad';

interface CalculatorKeypadProps {
  itemName: string;
  unit: string;
  expectedQty: number | null;
  initialValue: string;
  onConfirm: (value: number) => void;
  onDismiss: () => void;
  isLastItem: boolean;
}

export default function CalculatorKeypad({
  itemName,
  unit,
  expectedQty,
  initialValue,
  onConfirm,
  onDismiss,
  isLastItem,
}: CalculatorKeypadProps) {
  const {
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
  } = useCalculatorKeypad();

  // Set initial value when item changes
  useEffect(() => {
    setInitialValue(initialValue);
  }, [initialValue, setInitialValue]);

  const handleDigit = (d: string) => {
    haptics.light();
    pressDigit(d);
  };

  const handleDecimal = () => {
    haptics.light();
    pressDecimal();
  };

  const handlePlus = () => {
    haptics.medium();
    pressPlus();
  };

  const handleBackspace = () => {
    haptics.light();
    pressBackspace();
  };

  const handleClear = () => {
    haptics.medium();
    pressClear();
  };

  const handleConfirm = () => {
    if (!hasValue) return;
    haptics.success();
    onConfirm(result);
  };

  const digitBtn = "flex items-center justify-center h-14 rounded-xl text-xl font-bold transition-all active:scale-95 bg-black/5 dark:bg-white/5 text-theme-primary active:bg-black/10 dark:active:bg-white/10 select-none";

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 28, stiffness: 300 }}
      className="fixed bottom-0 left-0 right-0 z-[60] bg-white dark:bg-[#1a1a1f] border-t-2 border-emerald-500/30 rounded-t-2xl shadow-2xl"
    >
      {/* Display Area */}
      <div className="px-4 pt-3 pb-2">
        {/* Header with item name and dismiss */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-theme-primary truncate">{itemName}</p>
            <p className="text-xs text-theme-tertiary">
              Expected: {expectedQty ?? '—'} {unit}
            </p>
          </div>
          <button
            onClick={onDismiss}
            className="p-2 -mr-1 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <X className="h-5 w-5 text-theme-tertiary" />
          </button>
        </div>

        {/* Expression Display */}
        <div className="bg-black/5 dark:bg-white/5 rounded-xl px-4 py-3">
          {hasValue ? (
            <>
              <div className="flex items-center gap-1.5 flex-wrap min-h-[24px]">
                {displayTokens.map((token, i) => (
                  <span
                    key={i}
                    className={cn(
                      'text-base',
                      token === '+' ? 'text-emerald-500 font-bold' : 'text-theme-secondary'
                    )}
                  >
                    {token}
                  </span>
                ))}
                {displayTokens.some(t => t === '+') && (
                  <span className="text-theme-tertiary text-base">=</span>
                )}
              </div>
              <div className="text-3xl font-bold text-emerald-500 mt-1">
                {result}
                {unit && <span className="text-lg text-theme-tertiary ml-1">{unit}</span>}
              </div>
            </>
          ) : (
            <p className="text-theme-tertiary text-sm py-2">Tap digits to start counting</p>
          )}
        </div>
      </div>

      {/* Keypad Grid */}
      <div className="grid grid-cols-4 gap-2 px-4 pb-2">
        {/* Row 1: 7 8 9 ⌫ */}
        <button className={digitBtn} onClick={() => handleDigit('7')}>7</button>
        <button className={digitBtn} onClick={() => handleDigit('8')}>8</button>
        <button className={digitBtn} onClick={() => handleDigit('9')}>9</button>
        <button
          className="flex items-center justify-center h-14 rounded-xl transition-all active:scale-95 bg-black/5 dark:bg-white/5 text-theme-secondary active:bg-black/10 dark:active:bg-white/10 select-none"
          onClick={handleBackspace}
        >
          <Eraser className="h-5 w-5" />
        </button>

        {/* Row 2: 4 5 6 + */}
        <button className={digitBtn} onClick={() => handleDigit('4')}>4</button>
        <button className={digitBtn} onClick={() => handleDigit('5')}>5</button>
        <button className={digitBtn} onClick={() => handleDigit('6')}>6</button>
        <button
          className="flex items-center justify-center h-14 rounded-xl text-xl font-bold transition-all active:scale-95 bg-emerald-500/15 text-emerald-500 active:bg-emerald-500/25 select-none"
          onClick={handlePlus}
        >
          <Plus className="h-6 w-6" />
        </button>

        {/* Row 3: 1 2 3 C */}
        <button className={digitBtn} onClick={() => handleDigit('1')}>1</button>
        <button className={digitBtn} onClick={() => handleDigit('2')}>2</button>
        <button className={digitBtn} onClick={() => handleDigit('3')}>3</button>
        <button
          className="flex items-center justify-center h-14 rounded-xl text-sm font-bold transition-all active:scale-95 bg-red-500/10 text-red-500 dark:text-red-400 active:bg-red-500/20 select-none"
          onClick={handleClear}
        >
          CLR
        </button>

        {/* Row 4: 0 . [NEXT →] (2-col) */}
        <button className={digitBtn} onClick={() => handleDigit('0')}>0</button>
        <button className={digitBtn} onClick={handleDecimal}>.</button>
        <button
          className={cn(
            "col-span-2 flex items-center justify-center gap-2 h-14 rounded-xl text-lg font-bold transition-all active:scale-95 select-none",
            hasValue
              ? "bg-emerald-600 text-white active:bg-emerald-700"
              : "bg-emerald-600/30 text-emerald-300 cursor-not-allowed"
          )}
          onClick={handleConfirm}
          disabled={!hasValue}
        >
          <Check className="h-5 w-5" />
          {isLastItem ? 'Confirm' : 'Next'}
          {!isLastItem && <ArrowRight className="h-4 w-4" />}
        </button>
      </div>

      {/* Safe area padding for iPhone home indicator */}
      <div className="h-[env(safe-area-inset-bottom,8px)]" />
    </motion.div>
  );
}
