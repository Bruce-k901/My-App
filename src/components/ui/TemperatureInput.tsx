'use client';

import { useState, useRef, useEffect } from 'react';
import { NumericKeyboard } from './NumericKeyboard';
import { cn } from '@/lib/utils';

interface TemperatureInputProps {
  value: string | number | undefined;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onBlur?: () => void;
  onFocus?: () => void;
  onSubmit?: () => void;
  disabled?: boolean;
  id?: string;
  name?: string;
  fontSize?: string; // Allow custom font size override
}

/**
 * Temperature input component with custom numeric keyboard.
 * Includes minus button for negative temperatures.
 * On mobile: input is readOnly, all entry goes through the custom keyboard.
 * On desktop: uses native input with decimal keyboard.
 */
export function TemperatureInput({
  value,
  onChange,
  placeholder = 'Temperature (°C)',
  className = '',
  onBlur,
  onFocus,
  onSubmit,
  disabled = false,
  id,
  name,
  fontSize,
}: TemperatureInputProps) {
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkMobile = () => {
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth <= 768;
      setIsMobile(hasTouch && isSmallScreen);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Convert value to string for display
  const displayValue = value === undefined || value === null ? '' : String(value);

  const handleTap = (e: React.FocusEvent<HTMLInputElement> | React.MouseEvent<HTMLInputElement>) => {
    if (isMobile) {
      // Immediately blur so iOS never has an active focused input
      // (matches CalculatorKeypad pattern — prevents PWA standalone focus issues)
      if ('target' in e && e.target instanceof HTMLInputElement) {
        e.target.blur();
      }
      setShowKeyboard(true);
    }
    onFocus?.();
  };

  const handleBlur = () => {
    // On mobile, keyboard manages its own dismissal via outside-click
    if (!isMobile) {
      onBlur?.();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Desktop only — mobile inputs are readOnly
    const newValue = e.target.value;
    if (newValue === '' || newValue === '-' || /^-?\d*\.?\d*$/.test(newValue)) {
      onChange(newValue);
    }
  };

  const handleKeyPress = (key: string) => {
    const currentValue = displayValue;
    let newValue = '';

    if (key === '-') {
      newValue = currentValue.startsWith('-') ? currentValue.slice(1) : '-' + currentValue;
    } else if (key === '.') {
      if (currentValue.includes('.')) return;
      newValue = currentValue + '.';
    } else {
      newValue = currentValue + key;
    }

    if (newValue === '' || newValue === '-' || /^-?\d*\.?\d*$/.test(newValue)) {
      onChange(newValue);
    }
  };

  const handleBackspace = () => {
    if (displayValue.length > 0) {
      onChange(displayValue.slice(0, -1));
    }
  };

  const handleEnter = () => {
    if (onSubmit) {
      onSubmit();
    }
    setShowKeyboard(false);
    onBlur?.();
  };

  const handleDismiss = () => {
    setShowKeyboard(false);
    onBlur?.();
  };

  // Outside-click dismissal for mobile keyboard
  useEffect(() => {
    if (!isMobile || !showKeyboard) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const keyboard = document.querySelector('[data-numeric-keyboard]');

      if (keyboard?.contains(target)) return;
      if (inputRef.current?.contains(target)) return;

      setShowKeyboard(false);
      onBlur?.();
    };

    // Use setTimeout so the click that opened the keyboard doesn't immediately close it
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isMobile, showKeyboard, onBlur]);

  return (
    <>
      <input
        ref={inputRef}
        type="text"
        readOnly={isMobile}
        inputMode={isMobile ? 'none' : 'decimal'}
        pattern="-?[0-9]*\.?[0-9]*"
        value={displayValue}
        onChange={handleChange}
        onFocus={handleTap}
        onBlur={handleBlur}
        onClick={handleTap}
        placeholder={placeholder}
        disabled={disabled}
        id={id}
        name={name}
        className={cn(
          "w-full rounded-lg bg-theme-surface border border-gray-300 dark:border-theme text-theme-primary px-3 py-2",
          "placeholder:text-theme-tertiary dark:placeholder:text-theme-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D37E91]/50 focus-visible:border-[#D37E91]/50",
          "hover:bg-theme-surface-elevated dark:hover:bg-neutral-700 hover:border-gray-400 dark:hover:border-neutral-600 transition-colors",
          showKeyboard && isMobile && "ring-2 ring-[#D37E91]/50 border-[#D37E91]/50",
          className
        )}
        // Use fontSize prop if provided, otherwise prevent zoom on iOS (16px) or use default 14px
        style={{ fontSize: fontSize ? fontSize : (isMobile ? '16px' : '14px'), fontFamily: 'inherit' }}
      />
      {isMobile && (
        <NumericKeyboard
          onKeyPress={handleKeyPress}
          onBackspace={handleBackspace}
          onEnter={onSubmit ? handleEnter : undefined}
          onDismiss={handleDismiss}
          isVisible={showKeyboard}
        />
      )}
    </>
  );
}
