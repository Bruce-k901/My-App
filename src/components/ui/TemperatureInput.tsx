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
 * Temperature input component with custom numeric keyboard
 * Includes minus button for negative temperatures
 * Only shows custom keyboard on mobile/touch devices
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
  const [isFocused, setIsFocused] = useState(false);
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Strict mobile detection: only show keyboard on actual mobile devices
  // Checks for touch support AND small screen width (mobile/tablet)
  useEffect(() => {
    const checkMobile = () => {
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth <= 768;
      setIsMobile(hasTouch && isSmallScreen);
    };
    
    // Check on mount
    checkMobile();
    
    // Check on resize (in case window is resized)
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Convert value to string for display
  const displayValue = value === undefined || value === null ? '' : String(value);

  const handleFocus = () => {
    setIsFocused(true);
    if (isMobile) {
      setShowKeyboard(true);
    }
    onFocus?.();
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // Use a timeout to check if the blur was caused by clicking the keyboard
    // This allows the click event to fire first
    setTimeout(() => {
      const activeElement = document.activeElement;
      const keyboardElement = document.querySelector('[data-numeric-keyboard]');
      
      // If the active element is inside the keyboard, keep the input focused
      if (keyboardElement && activeElement && keyboardElement.contains(activeElement)) {
        inputRef.current?.focus();
        return;
      }
      
      // Only hide keyboard if input is truly not focused
      if (document.activeElement !== inputRef.current) {
        setIsFocused(false);
        setShowKeyboard(false);
        onBlur?.();
      }
    }, 150);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    // Allow negative numbers, decimals, and empty string
    if (newValue === '' || newValue === '-' || /^-?\d*\.?\d*$/.test(newValue)) {
      onChange(newValue);
    }
  };

  const handleKeyPress = (key: string) => {
    const currentValue = displayValue;
    let newValue = '';

    if (key === '-') {
      // Toggle minus sign at the start
      if (currentValue.startsWith('-')) {
        newValue = currentValue.slice(1);
      } else {
        newValue = '-' + currentValue;
      }
    } else if (key === '.') {
      // Only allow one decimal point
      if (!currentValue.includes('.')) {
        newValue = currentValue + '.';
      } else {
        newValue = currentValue; // Don't add if already exists
      }
    } else {
      // Regular number
      newValue = currentValue + key;
    }

    // Validate the new value
    if (newValue === '' || newValue === '-' || /^-?\d*\.?\d*$/.test(newValue)) {
      onChange(newValue);
      // Keep focus on input
      inputRef.current?.focus();
    }
  };

  const handleBackspace = () => {
    const currentValue = displayValue;
    if (currentValue.length > 0) {
      const newValue = currentValue.slice(0, -1);
      onChange(newValue);
      // Keep focus on input
      inputRef.current?.focus();
    }
  };

  const handleEnter = () => {
    if (onSubmit) {
      onSubmit();
    }
    // Blur the input to hide keyboard
    inputRef.current?.blur();
  };

  // Prevent default keyboard on mobile when using custom keyboard
  useEffect(() => {
    if (isMobile && showKeyboard && inputRef.current) {
      // Set inputMode to 'none' to prevent default keyboard
      inputRef.current.setAttribute('inputmode', 'none');
    } else if (inputRef.current) {
      // Restore decimal input mode when keyboard is hidden
      inputRef.current.setAttribute('inputmode', 'decimal');
    }
  }, [showKeyboard, isMobile]);

  return (
    <>
      <input
        ref={inputRef}
        type="text"
        inputMode={isMobile && showKeyboard ? 'none' : 'decimal'}
        pattern="-?[0-9]*\.?[0-9]*"
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        id={id}
        name={name}
        className={cn(
          "w-full rounded-lg bg-white dark:bg-neutral-800 border border-gray-300 dark:border-neutral-700 text-gray-900 dark:text-white px-3 py-2",
          "placeholder:text-gray-400 dark:placeholder:text-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500/50 focus-visible:border-pink-500/50",
          "hover:bg-gray-50 dark:hover:bg-neutral-700 hover:border-gray-400 dark:hover:border-neutral-600 transition-colors",
          className
        )}
        // Use fontSize prop if provided, otherwise prevent zoom on iOS (16px) or use default 14px
        // Important: fontSize must be in style to override any className font-size
        style={{ fontSize: fontSize ? fontSize : (isMobile ? '16px' : '14px'), fontFamily: 'inherit' }}
      />
      {isMobile && (
        <NumericKeyboard
          onKeyPress={handleKeyPress}
          onBackspace={handleBackspace}
          onEnter={onSubmit ? handleEnter : undefined}
          isVisible={showKeyboard}
        />
      )}
    </>
  );
}



