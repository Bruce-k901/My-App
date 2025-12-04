'use client';

import { useEffect, useRef } from 'react';

interface NumericKeyboardProps {
  onKeyPress: (key: string) => void;
  onBackspace: () => void;
  onEnter?: () => void;
  isVisible: boolean;
}

/**
 * Custom numeric keyboard component for temperature inputs
 * Includes numbers 0-9, decimal point, minus sign, backspace, and enter
 * Only shows on mobile/touch devices
 */
export function NumericKeyboard({ onKeyPress, onBackspace, onEnter, isVisible }: NumericKeyboardProps) {
  const keyboardRef = useRef<HTMLDivElement>(null);

  // Detect if device is mobile/touch
  const isMobile = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

  // Don't render on desktop
  if (!isMobile) {
    return null;
  }

  if (!isVisible) {
    return null;
  }

  const handleKeyClick = (key: string) => {
    onKeyPress(key);
  };

  const handleBackspace = () => {
    onBackspace();
  };

  const handleEnter = () => {
    if (onEnter) {
      onEnter();
    }
  };

  return (
    <div
      ref={keyboardRef}
      className="fixed bottom-0 left-0 right-0 z-50 bg-[#0B0D13] border-t border-white/[0.06] p-2 safe-area-inset-bottom"
      style={{
        // Ensure keyboard appears above other content
        boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.5)',
      }}
    >
      <div className="max-w-md mx-auto">
        {/* Number pad */}
        <div className="grid grid-cols-3 gap-2 mb-2">
          {/* Row 1: 1, 2, 3 */}
          {[1, 2, 3].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleKeyClick(num.toString())}
              className="h-12 bg-white/[0.03] border border-white/[0.06] rounded-lg text-white text-lg font-medium active:bg-white/[0.08] transition-colors touch-manipulation"
            >
              {num}
            </button>
          ))}
          
          {/* Row 2: 4, 5, 6 */}
          {[4, 5, 6].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleKeyClick(num.toString())}
              className="h-12 bg-white/[0.03] border border-white/[0.06] rounded-lg text-white text-lg font-medium active:bg-white/[0.08] transition-colors touch-manipulation"
            >
              {num}
            </button>
          ))}
          
          {/* Row 3: 7, 8, 9 */}
          {[7, 8, 9].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleKeyClick(num.toString())}
              className="h-12 bg-white/[0.03] border border-white/[0.06] rounded-lg text-white text-lg font-medium active:bg-white/[0.08] transition-colors touch-manipulation"
            >
              {num}
            </button>
          ))}
          
          {/* Row 4: Minus, 0, Decimal */}
          <button
            type="button"
            onClick={() => handleKeyClick('-')}
            className="h-12 bg-white/[0.03] border border-white/[0.06] rounded-lg text-white text-lg font-medium active:bg-white/[0.08] transition-colors touch-manipulation"
          >
            −
          </button>
          <button
            type="button"
            onClick={() => handleKeyClick('0')}
            className="h-12 bg-white/[0.03] border border-white/[0.06] rounded-lg text-white text-lg font-medium active:bg-white/[0.08] transition-colors touch-manipulation"
          >
            0
          </button>
          <button
            type="button"
            onClick={() => handleKeyClick('.')}
            className="h-12 bg-white/[0.03] border border-white/[0.06] rounded-lg text-white text-lg font-medium active:bg-white/[0.08] transition-colors touch-manipulation"
          >
            .
          </button>
        </div>

        {/* Action buttons: Backspace and Enter */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleBackspace}
            className="h-12 bg-white/[0.03] border border-white/[0.06] rounded-lg text-white text-sm font-medium active:bg-white/[0.08] transition-colors touch-manipulation flex items-center justify-center"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z"
              />
            </svg>
            <span className="ml-1">Delete</span>
          </button>
          {onEnter && (
            <button
              type="button"
              onClick={handleEnter}
              className="h-12 bg-[#EC4899]/20 border border-[#EC4899] rounded-lg text-[#EC4899] text-sm font-medium active:bg-[#EC4899]/30 transition-colors touch-manipulation"
            >
              Enter
            </button>
          )}
        </div>
      </div>
    </div>
  );
}



