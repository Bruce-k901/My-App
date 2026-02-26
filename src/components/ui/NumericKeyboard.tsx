'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { haptics } from '@/lib/haptics';
import { MOBILE_Z } from '@/lib/mobile-layout';

interface NumericKeyboardProps {
  onKeyPress: (key: string) => void;
  onBackspace: () => void;
  onEnter?: () => void;
  onDismiss?: () => void;
  isVisible: boolean;
}

/**
 * Custom numeric keyboard for temperature inputs on mobile.
 *
 * Inputs that use this keyboard must be readOnly on mobile so the browser's
 * focus system never interferes. All value changes go through onKeyPress.
 * Renders via portal to escape modal/backdrop stacking contexts.
 */
export function NumericKeyboard({ onKeyPress, onBackspace, onEnter, onDismiss, isVisible }: NumericKeyboardProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      if (typeof window === 'undefined') {
        setIsMobile(false);
        return;
      }
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth <= 768;
      setIsMobile(hasTouch && isSmallScreen);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (!isMobile || !isVisible) {
    return null;
  }

  const handleKey = (key: string) => {
    haptics.light();
    onKeyPress(key);
  };

  const handleBackspaceClick = () => {
    haptics.light();
    onBackspace();
  };

  const handleEnterClick = () => {
    haptics.medium();
    onEnter?.();
  };

  const handleDismissClick = () => {
    onDismiss?.();
  };

  const btnClass = "h-12 bg-gray-100 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg text-gray-900 dark:text-theme-primary text-lg font-medium active:bg-gray-200 dark:active:bg-white/[0.08] transition-colors touch-manipulation select-none";

  const keyboard = (
    <div
      data-numeric-keyboard
      className={`fixed bottom-0 left-0 right-0 ${MOBILE_Z.keyboard} bg-white dark:bg-[#0B0D13] border-t border-gray-200 dark:border-white/[0.06] p-2 pb-[env(safe-area-inset-bottom,8px)]`}
      style={{
        boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.15)',
      }}
    >
      <div className="max-w-md mx-auto">
        {/* Number pad */}
        <div className="grid grid-cols-3 gap-2 mb-2">
          {[1, 2, 3].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleKey(num.toString())}
              className={btnClass}
            >
              {num}
            </button>
          ))}

          {[4, 5, 6].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleKey(num.toString())}
              className={btnClass}
            >
              {num}
            </button>
          ))}

          {[7, 8, 9].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleKey(num.toString())}
              className={btnClass}
            >
              {num}
            </button>
          ))}

          {/* Row 4: Minus, 0, Decimal */}
          <button
            type="button"
            onClick={() => handleKey('-')}
            className="h-12 bg-blue-100 dark:bg-blue-500/20 border border-blue-300 dark:border-blue-500/40 rounded-lg text-blue-600 dark:text-blue-400 text-xl font-bold active:bg-blue-200 dark:active:bg-blue-500/30 transition-colors touch-manipulation select-none"
          >
            −
          </button>
          <button
            type="button"
            onClick={() => handleKey('0')}
            className={btnClass}
          >
            0
          </button>
          <button
            type="button"
            onClick={() => handleKey('.')}
            className={btnClass}
          >
            .
          </button>
        </div>

        {/* Action buttons: Delete, Hide, Enter */}
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={handleBackspaceClick}
            className="h-12 bg-gray-100 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg text-gray-900 dark:text-theme-primary text-sm font-medium active:bg-gray-200 dark:active:bg-white/[0.08] transition-colors touch-manipulation select-none flex items-center justify-center"
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
          {onDismiss && (
            <button
              type="button"
              onClick={handleDismissClick}
              className="h-12 bg-gray-50 dark:bg-white/[0.06] border border-gray-200 dark:border-white/[0.1] rounded-lg text-gray-500 dark:text-theme-tertiary text-sm font-medium active:bg-gray-200 dark:active:bg-white/[0.1] transition-colors touch-manipulation select-none flex items-center justify-center gap-1.5"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              Hide
            </button>
          )}
          {onEnter && (
            <button
              type="button"
              onClick={handleEnterClick}
              className="h-12 bg-[#D37E91]/10 dark:bg-[#D37E91]/20 border border-[#D37E91] rounded-lg text-[#D37E91] text-sm font-medium active:bg-[#D37E91]/25 dark:active:bg-[#D37E91]/30 transition-colors touch-manipulation select-none"
            >
              Enter
            </button>
          )}
        </div>
      </div>
    </div>
  );

  // Render via portal to escape any parent stacking contexts (modals, backdrop-blur)
  if (typeof document !== 'undefined') {
    return createPortal(keyboard, document.body);
  }

  return keyboard;
}
